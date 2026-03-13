"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const constants_1 = require("./constants");
const messageHandlers_1 = require("./handlers/messageHandlers");
const callbackHandlers_1 = require("./handlers/callbackHandlers");
// Настройки polling с улучшенной обработкой ошибок
const bot = new node_telegram_bot_api_1.default(constants_1.BOT_TOKEN, {
    polling: {
        interval: 300,
        autoStart: true,
        params: {
            timeout: 10
        }
    }
});
const userStates = new Map();
// Обработка ошибок polling
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});
// Обработка ошибок webhook (на случай если переключитесь)
bot.on('webhook_error', (error) => {
    console.error('Webhook error:', error);
});
bot.on('message', (msg) => (0, messageHandlers_1.handleTextMessage)(bot, userStates, msg));
bot.on('callback_query', (callbackQuery) => {
    (0, callbackHandlers_1.handleCallbackQuery)(bot, userStates, callbackQuery);
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
//# sourceMappingURL=index.js.map