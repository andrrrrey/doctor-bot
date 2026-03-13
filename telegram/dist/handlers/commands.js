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
exports.handleStartCommand = handleStartCommand;
exports.handleAgeAnswer = handleAgeAnswer;
exports.handleQuestionAnswer = handleQuestionAnswer;
exports.handleFinalQuestionAnswer = handleFinalQuestionAnswer;
exports.initializeConsultation = initializeConsultation;
exports.handleConsultationButtonClick = handleConsultationButtonClick;
exports.handleConsultationNameInput = handleConsultationNameInput;
exports.handleConsultationPhoneInput = handleConsultationPhoneInput;
exports.handleConsultationCityInput = handleConsultationCityInput;
const api_1 = require("../api");
const types_1 = require("../types");
const utils_1 = require("../utils");
const constants_1 = require("../constants");
function handleStartCommand(bot, userStates, chatId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const response = yield (0, api_1.getQuestions)();
        if (!((_a = response === null || response === void 0 ? void 0 : response.questions) === null || _a === void 0 ? void 0 : _a.length)) {
            yield bot.sendMessage(chatId, 'Извините, произошла ошибка. Попробуйте позже.');
            return;
        }
        const userState = (0, utils_1.initializeUserState)(response.questions, chatId, userStates);
        const firstQuestion = userState.questions[0];
        const sentMessage = yield bot.sendMessage(chatId, (0, utils_1.formatQuestion)(firstQuestion.text), {
            reply_markup: { remove_keyboard: true }
        });
        firstQuestion.messageId = sentMessage.message_id;
    });
}
function handleAgeAnswer(bot, userState, chatId, ageText) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const ageQuestion = (_a = userState === null || userState === void 0 ? void 0 : userState.questions) === null || _a === void 0 ? void 0 : _a.find(q => q.id === 'age');
        if (!ageQuestion)
            return;
        const validNumber = /^\d+$/.test(ageText.trim());
        const parsedAge = validNumber ? parseInt(ageText) : 0;
        if (!validNumber || isNaN(parsedAge) || parsedAge <= 0 || parsedAge >= 120) {
            yield bot.sendMessage(chatId, 'Пожалуйста, введите корректный возраст');
            return;
        }
        ageQuestion.isDone = true;
        ageQuestion.answers = new Set([parsedAge.toString()]);
        yield (0, utils_1.sendNextQuestions)(bot, chatId, userState);
    });
}
function handleQuestionAnswer(bot, chatId, messageId, question, data) {
    return __awaiter(this, void 0, void 0, function* () {
        const newAnswer = question.options[parseInt(data)];
        if (!question.answers)
            question.answers = new Set();
        if (question.type === 'radio' && question.answers.has(newAnswer))
            return;
        if (question.type === 'checkbox' && question.answers.size === 1 && question.answers.has(newAnswer))
            return;
        if (question.type === 'radio') {
            question.answers = new Set([newAnswer]);
        }
        if (question.type === 'checkbox') {
            if (question.answers.has(newAnswer)) {
                question.answers.delete(newAnswer);
            }
            else {
                question.answers.add(newAnswer);
            }
        }
        yield (0, utils_1.editTelegramMessage)(bot, chatId, messageId, question);
    });
}
function handleFinalQuestionAnswer(bot, chatId, userState) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!chatId || !userState || !userState.questions)
            return;
        userState.finished = true;
        const questionsForSending = userState.questions.filter(q => q.messageId && q.isDone && q.id !== constants_1.FINAL_QUESTION_ID);
        const answersForSending = questionsForSending.map(q => ({
            questionId: q.id,
            questionAnswers: Array.from(q.answers || []),
        }));
        const results = yield (0, api_1.sendAnswers)(answersForSending);
        if (!results) {
            userState.finished = false;
            yield bot.sendMessage(chatId, 'Произошла ошибка при получении результатов.', {
                reply_markup: {
                    inline_keyboard: [[
                            { text: 'Отправить еще раз', callback_data: constants_1.RETRY_SEND_ANSWERS }
                        ]]
                }
            });
            return;
        }
        const answers = questionsForSending.map(q => ({
            question: (0, utils_1.cleanQuestionWithoutBrackets)(q.question),
            answers: Array.from(q.answers || [])
        }));
        userState.diagnosisState = {
            diagnosis: results.diagnosis,
            extendedDiagnosis: results.extendedDiagnosis,
            answers: answers
        };
        const parsedResults = (0, utils_1.parseHtmlResults)(results.html);
        for (let i = 0; i < parsedResults.length; i++) {
            yield bot.sendMessage(chatId, parsedResults[i], {
                parse_mode: 'HTML',
            });
        }
    });
}
function initializeConsultation(bot, chatId, userState) {
    return __awaiter(this, void 0, void 0, function* () {
        userState.consultationState = {
            isActive: true,
            step: types_1.ConsultationStep.WAITING_FOR_BUTTON
        };
        yield bot.sendMessage(chatId, 'Запишитесь на консультацию с врачом', {
            reply_markup: {
                inline_keyboard: [[
                        { text: 'Записаться', callback_data: 'start_consultation' }
                    ]]
            }
        });
    });
}
function handleConsultationButtonClick(bot, chatId, userState) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!userState.consultationState)
            return;
        userState.consultationState.step = types_1.ConsultationStep.WAITING_FOR_NAME;
        yield bot.sendMessage(chatId, 'Укажите ваше имя');
    });
}
function handleConsultationNameInput(bot, chatId, userState, nameText) {
    return __awaiter(this, void 0, void 0, function* () {
        const name = nameText.trim();
        const nameRegex = /^[a-zA-Zа-яА-ЯёЁ\s\-]+$/;
        if (name.length < 2 || !nameRegex.test(name)) {
            yield bot.sendMessage(chatId, 'Пожалуйста, введите корректное имя');
            return;
        }
        userState.consultationState.name = name;
        userState.consultationState.step = types_1.ConsultationStep.WAITING_FOR_PHONE;
        yield bot.sendMessage(chatId, 'Укажите ваш номер телефона');
    });
}
function handleConsultationPhoneInput(bot, chatId, userState, phoneText) {
    return __awaiter(this, void 0, void 0, function* () {
        const phone = phoneText.trim();
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{7,}$/;
        if (!phoneRegex.test(phone)) {
            yield bot.sendMessage(chatId, 'Пожалуйста, введите корректный номер телефона');
            return;
        }
        userState.consultationState.phone = phone;
        userState.consultationState.step = types_1.ConsultationStep.WAITING_FOR_CITY;
        yield bot.sendMessage(chatId, 'Укажите ваш город');
    });
}
function handleConsultationCityInput(bot, chatId, userState, cityText) {
    return __awaiter(this, void 0, void 0, function* () {
        const { consultationState, diagnosisState } = userState;
        if (!consultationState || !diagnosisState)
            return;
        const city = cityText.trim();
        const cityRegex = /^[a-zA-Zа-яА-ЯёЁ\s\-]+$/;
        if (city.length < 2 || !cityRegex.test(city)) {
            yield bot.sendMessage(chatId, 'Пожалуйста, введите корректное название города');
            return;
        }
        consultationState.city = city;
        consultationState.step = types_1.ConsultationStep.COMPLETED;
        consultationState.isActive = false;
        const results = yield (0, api_1.sendConsultationData)({
            patientName: consultationState.name || '',
            patientPhone: consultationState.phone || '',
            patientCity: consultationState.city || '',
            diagnosis: diagnosisState.diagnosis || '',
            extendedDiagnosis: diagnosisState.extendedDiagnosis || '',
            answers: diagnosisState.answers || []
        });
        if (!results) {
            consultationState.isActive = true;
            yield bot.sendMessage(chatId, 'Произошла ошибка при отправке данных', {
                reply_markup: {
                    inline_keyboard: [[
                            { text: 'Отправить еще раз', callback_data: constants_1.RETRY_SEND_CONSULTATION }
                        ]]
                }
            });
            return;
        }
        yield bot.sendMessage(chatId, 'Успешно отправлено.\nМы вам перезвоним в течение рабочего дня.');
    });
}
//# sourceMappingURL=commands.js.map