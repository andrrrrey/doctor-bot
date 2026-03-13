import TelegramBot from 'node-telegram-bot-api';
import { UserState, UserStates, ConsultationStep } from '../types';
import { isUserInConsultationState, getCurrentQuestion, deleteMessage } from '../utils';
import {
  handleStartCommand,
  handleAgeAnswer,
  handleConsultationNameInput,
  handleConsultationPhoneInput,
  handleConsultationCityInput
} from './commands';

export async function handleTextMessage(
  bot: TelegramBot,
  userStates: UserStates,
  msg: TelegramBot.Message
): Promise<void> {
  const { text: messageText, message_id: messageId, chat: { id: chatId } } = msg;

  if (messageText === '/start') {
    await handleStartCommand(bot, userStates, chatId);
    return;
  }

  const userState = userStates.get(chatId);
  if (!userState?.questions) return;

  const currentQuestion = getCurrentQuestion(userState);
  if (currentQuestion?.id === 'age') {
    const ageText = messageText || '';
    await handleAgeAnswer(bot, userState, chatId, ageText);
    return;
  }

  if (isUserInConsultationState(userState)) {
    await handleConsultationMessage(bot, chatId, userState, messageText || '');
    return;
  }

  await deleteMessage(bot, chatId, messageId);
}

async function handleConsultationMessage(
  bot: TelegramBot,
  chatId: number,
  userState: UserState,
  messageText: string
): Promise<void> {
  switch (userState.consultationState?.step) {
    case ConsultationStep.WAITING_FOR_NAME:
      await handleConsultationNameInput(bot, chatId, userState, messageText);
      break;
    case ConsultationStep.WAITING_FOR_PHONE:
      await handleConsultationPhoneInput(bot, chatId, userState, messageText);
      break;
    case ConsultationStep.WAITING_FOR_CITY:
      await handleConsultationCityInput(bot, chatId, userState, messageText);
      break;
  }
} 