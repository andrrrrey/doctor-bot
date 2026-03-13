"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCallbackQuery = handleCallbackQuery;
const types_1 = require("../types");
const utils_1 = require("../utils");
const commands_1 = require("./commands");
const utils_2 = require("../utils");
const constants_1 = require("../constants");
function handleCallbackQuery(bot, userStates, callbackQuery) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const { message, data } = callbackQuery;
            const chatId = (_a = message === null || message === void 0 ? void 0 : message.chat) === null || _a === void 0 ? void 0 : _a.id;
            const messageId = message === null || message === void 0 ? void 0 : message.message_id;
            // Базовая валидация
            if (!message || !chatId || !messageId || !data)
                return;
            const userState = userStates.get(chatId);
            if (!(userState === null || userState === void 0 ? void 0 : userState.questions))
                return;
            // Роутинг по типу callback
            yield routeCallbackQuery(bot, chatId, messageId, userState, data);
        }
        catch (error) { }
    });
}
function routeCallbackQuery(bot, chatId, messageId, userState, data) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        // Обработка консультации
        if (yield handleConsultationCallbacks(bot, chatId, userState, data)) {
            return;
        }
        // Если опрос завершен
        if (userState.finished)
            return;
        // Повторная отправка ответов или финальный вопрос
        if (data === constants_1.RETRY_SEND_ANSWERS || ((_b = (_a = userState.questions) === null || _a === void 0 ? void 0 : _a.find(q => q.messageId === messageId)) === null || _b === void 0 ? void 0 : _b.id) === constants_1.FINAL_QUESTION_ID) {
            yield handleFinalFlow(bot, chatId, userState);
            return;
        }
        // Обработка обычных вопросов
        yield handleRegularQuestionCallback(bot, chatId, messageId, userState, data);
    });
}
function handleConsultationCallbacks(bot, chatId, userState, data) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        if (!(0, utils_2.isUserInConsultationState)(userState))
            return false;
        // Кнопка начала консультации
        if (data === constants_1.CALLBACK_TYPES.START_CONSULTATION && ((_a = userState.consultationState) === null || _a === void 0 ? void 0 : _a.step) === types_1.ConsultationStep.WAITING_FOR_BUTTON) {
            yield (0, commands_1.handleConsultationButtonClick)(bot, chatId, userState);
            return true;
        }
        // Повтор отправки консультации
        if (data === constants_1.RETRY_SEND_CONSULTATION) {
            const city = (_b = userState.consultationState) === null || _b === void 0 ? void 0 : _b.city;
            if (city) {
                yield (0, commands_1.handleConsultationCityInput)(bot, chatId, userState, city);
            }
            return true;
        }
        return false;
    });
}
function handleFinalFlow(bot, chatId, userState) {
    return __awaiter(this, void 0, void 0, function* () {
        // Показать диагноз
        yield (0, commands_1.handleFinalQuestionAnswer)(bot, chatId, userState);
        // Запустить процесс записи на консультацию
        yield (0, commands_1.initializeConsultation)(bot, chatId, userState);
    });
}
function handleRegularQuestionCallback(bot, chatId, messageId, userState, data) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const question = (_a = userState.questions) === null || _a === void 0 ? void 0 : _a.find(q => q.messageId === messageId);
        if (!question) {
            return;
        }
        // Обработка ответа на вопрос
        if (data !== constants_1.CALLBACK_TYPES.DONE) {
            yield (0, commands_1.handleQuestionAnswer)(bot, chatId, messageId, question, data);
            yield handleFollowUpQuestions(bot, chatId, userState, question);
        }
        // Обработка завершения вопроса
        yield handleQuestionCompletion(bot, chatId, userState, question, data);
    });
}
function handleFollowUpQuestions(bot, chatId, userState, question) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!question.followUpQuestions || !question.isDone || !userState.questions)
            return;
        const followUpQuestionIds = question.followUpQuestions.map((fq) => fq.id);
        const followUpQuestions = userState.questions.filter(q => followUpQuestionIds.includes(q.id));
        // Удаляем неактуальные дополнительные вопросы
        yield deleteInvalidFollowUpQuestions(bot, chatId, followUpQuestions, question);
        // Создаем новые дополнительные вопросы при необходимости
        yield createNewFollowUpQuestions(bot, chatId, userState, followUpQuestions, question);
        const currentQuestion = (0, utils_1.getCurrentQuestion)(userState);
        if (!currentQuestion) {
            yield (0, utils_1.sendNextQuestions)(bot, chatId, userState);
        }
    });
}
function deleteInvalidFollowUpQuestions(bot, chatId, followUpQuestions, question) {
    return __awaiter(this, void 0, void 0, function* () {
        const questionsToDelete = followUpQuestions.filter(fq => { var _a; return fq.messageId && ((_a = fq.conditions) === null || _a === void 0 ? void 0 : _a.every((condition) => { var _a; return !((_a = question.answers) === null || _a === void 0 ? void 0 : _a.has(condition)); })); });
        yield Promise.all(questionsToDelete.map((fq) => __awaiter(this, void 0, void 0, function* () {
            yield (0, utils_2.deleteMessage)(bot, chatId, fq.messageId);
            fq.messageId = undefined;
        })));
    });
}
function createNewFollowUpQuestions(bot, chatId, userState, followUpQuestions, question) {
    return __awaiter(this, void 0, void 0, function* () {
        const questionsToCreate = followUpQuestions.filter(fq => { var _a; return !fq.messageId && ((_a = fq.conditions) === null || _a === void 0 ? void 0 : _a.some((condition) => { var _a; return (_a = question.answers) === null || _a === void 0 ? void 0 : _a.has(condition); })); });
        if (questionsToCreate.length === 0 || !userState.questions)
            return;
        // Временно удаляем последующие сообщения
        const currentQuestionIndex = userState.questions.findIndex(q => q.id === question.id);
        const questionsToTempDelete = userState.questions
            .slice(currentQuestionIndex + 1)
            .filter(q => q.messageId);
        yield Promise.all(questionsToTempDelete.map((q) => __awaiter(this, void 0, void 0, function* () {
            yield (0, utils_2.deleteMessage)(bot, chatId, q.messageId);
            q.messageId = undefined;
        })));
        // Отправляем новые вопросы по порядку
        yield (0, utils_1.sendNextQuestions)(bot, chatId, userState);
    });
}
function handleQuestionCompletion(bot, chatId, userState, question, data) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        if (!userState.questions)
            return;
        // Завершение checkbox вопроса
        if (data === constants_1.CALLBACK_TYPES.DONE && question.type === 'checkbox' && ((_a = question.answers) === null || _a === void 0 ? void 0 : _a.size)) {
            question.isDone = true;
            yield (0, utils_1.editTelegramMessage)(bot, chatId, question.messageId, question);
        }
        // Переход к следующим вопросам
        const shouldShowNext = (data === constants_1.CALLBACK_TYPES.DONE && question.type === 'checkbox' && ((_b = question.answers) === null || _b === void 0 ? void 0 : _b.size)) ||
            (question.type === 'radio' && !question.isDone);
        if (shouldShowNext) {
            question.isDone = true;
            const currentQuestionIndex = userState.questions.findIndex(q => q.id === question.id);
            const isLastQuestion = currentQuestionIndex === (userState.questions.length - 1);
            if (isLastQuestion) {
                yield bot.sendMessage(chatId, 'Спасибо за ответы!');
            }
            else {
                yield (0, utils_1.sendNextQuestions)(bot, chatId, userState);
            }
        }
    });
}
//# sourceMappingURL=callbackHandlers.js.map