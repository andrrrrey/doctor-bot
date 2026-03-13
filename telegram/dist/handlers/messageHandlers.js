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
exports.handleTextMessage = handleTextMessage;
const types_1 = require("../types");
const utils_1 = require("../utils");
const commands_1 = require("./commands");
function handleTextMessage(bot, userStates, msg) {
    return __awaiter(this, void 0, void 0, function* () {
        const { text: messageText, message_id: messageId, chat: { id: chatId } } = msg;
        if (messageText === '/start') {
            yield (0, commands_1.handleStartCommand)(bot, userStates, chatId);
            return;
        }
        const userState = userStates.get(chatId);
        if (!(userState === null || userState === void 0 ? void 0 : userState.questions))
            return;
        const currentQuestion = (0, utils_1.getCurrentQuestion)(userState);
        if ((currentQuestion === null || currentQuestion === void 0 ? void 0 : currentQuestion.id) === 'age') {
            const ageText = messageText || '';
            yield (0, commands_1.handleAgeAnswer)(bot, userState, chatId, ageText);
            return;
        }
        if ((0, utils_1.isUserInConsultationState)(userState)) {
            yield handleConsultationMessage(bot, chatId, userState, messageText || '');
            return;
        }
        yield (0, utils_1.deleteMessage)(bot, chatId, messageId);
    });
}
function handleConsultationMessage(bot, chatId, userState, messageText) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        switch ((_a = userState.consultationState) === null || _a === void 0 ? void 0 : _a.step) {
            case types_1.ConsultationStep.WAITING_FOR_NAME:
                yield (0, commands_1.handleConsultationNameInput)(bot, chatId, userState, messageText);
                break;
            case types_1.ConsultationStep.WAITING_FOR_PHONE:
                yield (0, commands_1.handleConsultationPhoneInput)(bot, chatId, userState, messageText);
                break;
            case types_1.ConsultationStep.WAITING_FOR_CITY:
                yield (0, commands_1.handleConsultationCityInput)(bot, chatId, userState, messageText);
                break;
        }
    });
}
//# sourceMappingURL=messageHandlers.js.map