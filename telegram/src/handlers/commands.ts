import TelegramBot from 'node-telegram-bot-api';
import { getQuestions, sendAnswers, sendConsultationData } from '../api';
import { Question, UserState, UserStates, ConsultationStep } from '../types';
import { formatQuestion, editTelegramMessage, sendNextQuestions, parseHtmlResults, cleanQuestionWithoutBrackets, initializeUserState } from '../utils';
import { FINAL_QUESTION_ID, RETRY_SEND_ANSWERS, RETRY_SEND_CONSULTATION } from '../constants';

export async function handleStartCommand(
  bot: TelegramBot,
  userStates: UserStates,
  chatId: number,
) {
  const response = await getQuestions();
  if (!response?.questions?.length) {
    await bot.sendMessage(chatId, 'Извините, произошла ошибка. Попробуйте позже.');
    return;
  }

  const userState = initializeUserState(response.questions, chatId, userStates);
  const firstQuestion = userState.questions[0];
  const sentMessage = await bot.sendMessage(chatId, formatQuestion(firstQuestion.text), {
    reply_markup: { remove_keyboard: true }
  });
  firstQuestion.messageId = sentMessage.message_id;
}

export async function handleAgeAnswer(
  bot: TelegramBot,
  userState: UserState,
  chatId: number,
  ageText: string
) {
  const ageQuestion = userState?.questions?.find(q => q.id === 'age');
  if (!ageQuestion) return;

  const validNumber = /^\d+$/.test(ageText.trim());
  const parsedAge = validNumber ? parseInt(ageText) : 0;
  if (!validNumber || isNaN(parsedAge) || parsedAge <= 0 || parsedAge >= 120) {
    await bot.sendMessage(chatId, 'Пожалуйста, введите корректный возраст');
    return;
  }

  ageQuestion.isDone = true;
  ageQuestion.answers = new Set([parsedAge.toString()]);

  await sendNextQuestions(bot, chatId, userState);
}

export async function handleQuestionAnswer(
  bot: TelegramBot,
  chatId: number,
  messageId: number,
  question: Question,
  data: string
) {
  const newAnswer = question.options[parseInt(data)];
  if (!question.answers) question.answers = new Set<string>();
  if (question.type === 'radio' && question.answers.has(newAnswer)) return;
  if (question.type === 'checkbox' && question.answers.size === 1 && question.answers.has(newAnswer)) return;

  if (question.type === 'radio') {
    question.answers = new Set<string>([newAnswer]);
  }

  if (question.type === 'checkbox') {
    if (question.answers.has(newAnswer)) {
      question.answers.delete(newAnswer);
    } else {
      question.answers.add(newAnswer);
    }
  }

  await editTelegramMessage(bot, chatId, messageId, question);
}

export async function handleFinalQuestionAnswer(
  bot: TelegramBot,
  chatId?: number,
  userState?: UserState,
) {
  if (!chatId || !userState || !userState.questions) return;
  userState.finished = true;

  const questionsForSending = userState.questions.filter(q => q.messageId && q.isDone && q.id !== FINAL_QUESTION_ID);
  const answersForSending = questionsForSending.map(q => ({
    questionId: q.id,
    questionAnswers: Array.from(q.answers || []),
  }));

  const results = await sendAnswers(answersForSending);

  if (!results) {
    userState.finished = false;

    await bot.sendMessage(chatId, 'Произошла ошибка при получении результатов.', {
      reply_markup: {
        inline_keyboard: [[
          { text: 'Отправить еще раз', callback_data: RETRY_SEND_ANSWERS }
        ]]
      }
    });

    return;
  }

  const answers = questionsForSending.map(q => ({
    question: cleanQuestionWithoutBrackets(q.question),
    answers: Array.from(q.answers || [])
  }));

  userState.diagnosisState = {
    diagnosis: results.diagnosis,
    extendedDiagnosis: results.extendedDiagnosis,
    answers: answers
  };

  const parsedResults = parseHtmlResults(results.html);

  for (let i = 0; i < parsedResults.length; i++) {
    await bot.sendMessage(chatId, parsedResults[i], {
      parse_mode: 'HTML',
    });
  }
}

export async function initializeConsultation(
  bot: TelegramBot,
  chatId: number,
  userState: UserState
) {
  userState.consultationState = {
    isActive: true,
    step: ConsultationStep.WAITING_FOR_BUTTON
  };

  await bot.sendMessage(chatId, 'Запишитесь на консультацию с врачом', {
    reply_markup: {
      inline_keyboard: [[
        { text: 'Записаться', callback_data: 'start_consultation' }
      ]]
    }
  });
}

export async function handleConsultationButtonClick(
  bot: TelegramBot,
  chatId: number,
  userState: UserState
) {
  if (!userState.consultationState) return;

  userState.consultationState.step = ConsultationStep.WAITING_FOR_NAME;

  await bot.sendMessage(chatId, 'Укажите ваше имя');
}

export async function handleConsultationNameInput(
  bot: TelegramBot,
  chatId: number,
  userState: UserState,
  nameText: string
) {
  const name = nameText.trim();

  const nameRegex = /^[a-zA-Zа-яА-ЯёЁ\s\-]+$/;
  if (name.length < 2 || !nameRegex.test(name)) {
    await bot.sendMessage(chatId, 'Пожалуйста, введите корректное имя');
    return;
  }

  userState.consultationState!.name = name;
  userState.consultationState!.step = ConsultationStep.WAITING_FOR_PHONE;

  await bot.sendMessage(chatId, 'Укажите ваш номер телефона');
}

export async function handleConsultationPhoneInput(
  bot: TelegramBot,
  chatId: number,
  userState: UserState,
  phoneText: string
) {
  const phone = phoneText.trim();
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]{7,}$/;

  if (!phoneRegex.test(phone)) {
    await bot.sendMessage(chatId, 'Пожалуйста, введите корректный номер телефона');
    return;
  }

  userState.consultationState!.phone = phone;
  userState.consultationState!.step = ConsultationStep.WAITING_FOR_CITY;

  await bot.sendMessage(chatId, 'Укажите ваш город');
}

export async function handleConsultationCityInput(
  bot: TelegramBot,
  chatId: number,
  userState: UserState,
  cityText: string
) {
  const { consultationState, diagnosisState } = userState;

  if (!consultationState || !diagnosisState) return;

  const city = cityText.trim();
  const cityRegex = /^[a-zA-Zа-яА-ЯёЁ\s\-]+$/;
  if (city.length < 2 || !cityRegex.test(city)) {
    await bot.sendMessage(chatId, 'Пожалуйста, введите корректное название города');
    return;
  }

  consultationState.city = city;
  consultationState.step = ConsultationStep.COMPLETED;
  consultationState.isActive = false;

  const results = await sendConsultationData(
    {
      patientName: consultationState.name || '',
      patientPhone: consultationState.phone || '',
      patientCity: consultationState.city || '',
      diagnosis: diagnosisState.diagnosis || '',
      extendedDiagnosis: diagnosisState.extendedDiagnosis || '',
      answers: diagnosisState.answers || []
    }
  );

  if (!results) {
    consultationState.isActive = true;
    await bot.sendMessage(chatId, 'Произошла ошибка при отправке данных', {
      reply_markup: {
        inline_keyboard: [[
          { text: 'Отправить еще раз', callback_data: RETRY_SEND_CONSULTATION }
        ]]
      }
    });
    return;
  }

  await bot.sendMessage(chatId, 'Успешно отправлено.\nМы вам перезвоним в течение рабочего дня.');
} 