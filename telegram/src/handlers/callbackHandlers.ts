import TelegramBot from 'node-telegram-bot-api';
import { UserState, UserStates, ConsultationStep } from '../types';
import { sendNextQuestions, editTelegramMessage, getCurrentQuestion } from '../utils';
import {
  handleQuestionAnswer,
  handleFinalQuestionAnswer,
  initializeConsultation,
  handleConsultationButtonClick,
  handleConsultationCityInput
} from './commands';
import { isUserInConsultationState, deleteMessage } from '../utils';
import { CALLBACK_TYPES, FINAL_QUESTION_ID, RETRY_SEND_ANSWERS, RETRY_SEND_CONSULTATION } from '../constants';

export async function handleCallbackQuery(
  bot: TelegramBot,
  userStates: UserStates,
  callbackQuery: TelegramBot.CallbackQuery
): Promise<void> {
  try {
    const { message, data } = callbackQuery;
    const chatId = message?.chat?.id;
    const messageId = message?.message_id;

    // Базовая валидация
    if (!message || !chatId || !messageId || !data) return;

    const userState = userStates.get(chatId);
    if (!userState?.questions) return;

    // Роутинг по типу callback
    await routeCallbackQuery(bot, chatId, messageId, userState, data);
  } catch (error) { }
}

async function routeCallbackQuery(
  bot: TelegramBot,
  chatId: number,
  messageId: number,
  userState: UserState,
  data: string
): Promise<void> {

  // Обработка консультации
  if (await handleConsultationCallbacks(bot, chatId, userState, data)) {
    return;
  }

  // Если опрос завершен
  if (userState.finished) return;

  // Повторная отправка ответов или финальный вопрос
  if (data === RETRY_SEND_ANSWERS || userState.questions?.find(q => q.messageId === messageId)?.id === FINAL_QUESTION_ID) {
    await handleFinalFlow(bot, chatId, userState);
    return;
  }

  // Обработка обычных вопросов
  await handleRegularQuestionCallback(bot, chatId, messageId, userState, data);
}

async function handleConsultationCallbacks(
  bot: TelegramBot,
  chatId: number,
  userState: UserState,
  data: string
): Promise<boolean> {

  if (!isUserInConsultationState(userState)) return false;

  // Кнопка начала консультации
  if (data === CALLBACK_TYPES.START_CONSULTATION && userState.consultationState?.step === ConsultationStep.WAITING_FOR_BUTTON) {
    await handleConsultationButtonClick(bot, chatId, userState);
    return true;
  }

  // Повтор отправки консультации
  if (data === RETRY_SEND_CONSULTATION) {
    const city = userState.consultationState?.city;
    if (city) {
      await handleConsultationCityInput(bot, chatId, userState, city);
    }
    return true;
  }

  return false;
}

async function handleFinalFlow(
  bot: TelegramBot,
  chatId: number,
  userState: UserState
): Promise<void> {
  // Показать диагноз
  await handleFinalQuestionAnswer(bot, chatId, userState);

  // Запустить процесс записи на консультацию
  await initializeConsultation(bot, chatId, userState);
}

async function handleRegularQuestionCallback(
  bot: TelegramBot,
  chatId: number,
  messageId: number,
  userState: UserState,
  data: string
): Promise<void> {
  const question = userState.questions?.find(q => q.messageId === messageId);
  if (!question) {
    return;
  }

  // Обработка ответа на вопрос
  if (data !== CALLBACK_TYPES.DONE) {
    await handleQuestionAnswer(bot, chatId, messageId, question, data);
    await handleFollowUpQuestions(bot, chatId, userState, question);
  }

  // Обработка завершения вопроса
  await handleQuestionCompletion(bot, chatId, userState, question, data);

}

async function handleFollowUpQuestions(
  bot: TelegramBot,
  chatId: number,
  userState: UserState,
  question: any
): Promise<void> {
  if (!question.followUpQuestions || !question.isDone || !userState.questions) return;

  const followUpQuestionIds = question.followUpQuestions.map((fq: any) => fq.id);
  const followUpQuestions = userState.questions.filter(q => followUpQuestionIds.includes(q.id));

  // Удаляем неактуальные дополнительные вопросы
  await deleteInvalidFollowUpQuestions(bot, chatId, followUpQuestions, question);

  // Создаем новые дополнительные вопросы при необходимости
  await createNewFollowUpQuestions(bot, chatId, userState, followUpQuestions, question);

  const currentQuestion = getCurrentQuestion(userState);
  if (!currentQuestion) {
    await sendNextQuestions(bot, chatId, userState);
  }
}

async function deleteInvalidFollowUpQuestions(
  bot: TelegramBot,
  chatId: number,
  followUpQuestions: any[],
  question: any
): Promise<void> {
  const questionsToDelete = followUpQuestions.filter(
    fq => fq.messageId && fq.conditions?.every((condition: string) => !question.answers?.has(condition))
  );

  await Promise.all(
    questionsToDelete.map(async (fq) => {
      await deleteMessage(bot, chatId, fq.messageId!);
      fq.messageId = undefined;
    })
  );
}

async function createNewFollowUpQuestions(
  bot: TelegramBot,
  chatId: number,
  userState: UserState,
  followUpQuestions: any[],
  question: any
): Promise<void> {
  const questionsToCreate = followUpQuestions.filter(
    fq => !fq.messageId && fq.conditions?.some((condition: string) => question.answers?.has(condition))
  );

  if (questionsToCreate.length === 0 || !userState.questions) return;

  // Временно удаляем последующие сообщения
  const currentQuestionIndex = userState.questions.findIndex(q => q.id === question.id);
  const questionsToTempDelete = userState.questions
    .slice(currentQuestionIndex + 1)
    .filter(q => q.messageId);

  await Promise.all(
    questionsToTempDelete.map(async (q) => {
      await deleteMessage(bot, chatId, q.messageId!);
      q.messageId = undefined;
    })
  );

  // Отправляем новые вопросы по порядку
  await sendNextQuestions(bot, chatId, userState);
}

async function handleQuestionCompletion(
  bot: TelegramBot,
  chatId: number,
  userState: UserState,
  question: any,
  data: string
): Promise<void> {
  if (!userState.questions) return;

  // Завершение checkbox вопроса
  if (data === CALLBACK_TYPES.DONE && question.type === 'checkbox' && question.answers?.size) {
    question.isDone = true;
    await editTelegramMessage(bot, chatId, question.messageId, question);
  }

  // Переход к следующим вопросам
  const shouldShowNext =
    (data === CALLBACK_TYPES.DONE && question.type === 'checkbox' && question.answers?.size) ||
    (question.type === 'radio' && !question.isDone);

  if (shouldShowNext) {
    question.isDone = true;

    const currentQuestionIndex = userState.questions.findIndex(q => q.id === question.id);
    const isLastQuestion = currentQuestionIndex === (userState.questions.length - 1);

    if (isLastQuestion) {
      await bot.sendMessage(chatId, 'Спасибо за ответы!');
    } else {
      await sendNextQuestions(bot, chatId, userState);
    }
  }
} 