import TelegramBot from 'node-telegram-bot-api';
import { UserStates } from './types';
import { BOT_TOKEN } from './constants';
import { handleTextMessage } from './handlers/messageHandlers';
import { handleCallbackQuery } from './handlers/callbackHandlers';

// Настройки polling с улучшенной обработкой ошибок
const bot = new TelegramBot(BOT_TOKEN, {
  polling: {
    interval: 300,
    autoStart: true,
    params: {
      timeout: 10
    }
  }
});

const userStates: UserStates = new Map();

// Обработка ошибок polling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

// Обработка ошибок webhook (на случай если переключитесь)
bot.on('webhook_error', (error) => {
  console.error('Webhook error:', error);
});

bot.on('message', (msg) => handleTextMessage(bot, userStates, msg));
bot.on('callback_query', (callbackQuery) => {
  handleCallbackQuery(bot, userStates, callbackQuery);
  bot.answerCallbackQuery(callbackQuery.id);
});

// Глобальные обработчики ошибок
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Необработанное отклонение промиса:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Необработанное исключение:', error);
});

console.log('Telegram bot запущен в режиме polling');