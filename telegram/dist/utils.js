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
exports.isUserInConsultationState = isUserInConsultationState;
exports.getCurrentQuestion = getCurrentQuestion;
exports.deleteMessage = deleteMessage;
exports.initializeUserState = initializeUserState;
exports.sendNextQuestions = sendNextQuestions;
exports.editTelegramMessage = editTelegramMessage;
exports.formatQuestion = formatQuestion;
exports.createInlineKeyboard = createInlineKeyboard;
exports.cleanQuestionWithoutBrackets = cleanQuestionWithoutBrackets;
exports.parseHtmlResults = parseHtmlResults;
const constants_1 = require("./constants");
function isUserInConsultationState(userState) {
    var _a;
    return ((_a = userState.consultationState) === null || _a === void 0 ? void 0 : _a.isActive) === true;
}
function getCurrentQuestion(userState) {
    var _a;
    return (_a = userState.questions) === null || _a === void 0 ? void 0 : _a.find(q => q.messageId && !q.isDone);
}
function deleteMessage(bot, chatId, messageId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield bot.deleteMessage(chatId, messageId);
        }
        catch (error) { }
    });
}
function initializeUserState(questions, chatId, userStates) {
    const userState = {
        questions: [],
    };
    userState.questions = flattenQuestions(questions);
    userState.questions.forEach(question => {
        question.text = cleanQuestion(question.question);
    });
    // userState.questions = userState.questions.slice(0, 3); // временно оставляем только первые 3 вопроса
    userState.questions.push((0, constants_1.getFinalQuestion)());
    userStates.delete(chatId);
    userStates.set(chatId, userState);
    return userState;
}
function sendNextQuestions(bot, chatId, userState) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { questions } = userState;
        if (!questions)
            return;
        const drawnUnansweredQuestions = questions.filter(q => q.messageId && !q.isDone);
        if (drawnUnansweredQuestions.length > 0)
            return;
        const undrawnUnansweredQuestions = questions.filter(q => !q.messageId);
        for (const question of undrawnUnansweredQuestions) {
            if (question.dependencyId) {
                const dependencyQuestion = questions.find(q => q.id === question.dependencyId);
                if (dependencyQuestion && ((_a = question.conditions) === null || _a === void 0 ? void 0 : _a.every(c => { var _a; return !((_a = dependencyQuestion.answers) === null || _a === void 0 ? void 0 : _a.has(c)); }))) {
                    continue;
                }
            }
            const sentMessage = yield bot.sendMessage(chatId, formatQuestion(question.text), { reply_markup: createInlineKeyboard(question) });
            question.messageId = sentMessage.message_id;
            if (!question.isDone)
                break;
        }
    });
}
;
function editTelegramMessage(bot, chatId, messageId, question) {
    return __awaiter(this, void 0, void 0, function* () {
        yield bot.editMessageText(formatQuestion(question.text), {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: createInlineKeyboard(question),
        });
    });
}
;
function formatQuestion(text) {
    return `💊 ${text}`;
}
function createInlineKeyboard(question) {
    const { options, type } = question;
    const selected = '✅ ';
    const notSelected = type === 'checkbox' ? '☑️ ' : '';
    const buttonsInRow = type === 'radio' && question.id === 'pain_scale' ? 5 : 1;
    const inlineKeyboard = [
        ...options.reduce((acc, option, index) => {
            var _a;
            const rowIndex = Math.floor(index / buttonsInRow);
            if (!acc[rowIndex]) {
                acc[rowIndex] = [];
            }
            acc[rowIndex].push({
                text: `${((_a = question.answers) === null || _a === void 0 ? void 0 : _a.has(option)) ? selected : notSelected}${option}`,
                callback_data: `${index}`
            });
            return acc;
        }, [])
    ];
    if (question.type === 'checkbox' && !question.isDone) {
        inlineKeyboard.push([{
                text: '➡️ Отправить выбранные ответы',
                callback_data: 'done'
            }]);
    }
    return {
        inline_keyboard: inlineKeyboard
    };
}
function cleanQuestion(question) {
    const result = question
        .replace(/<\s*br\s*\/?>/gi, ' ') // replace <br> with space
        .replace(/<\/?[^>]+(>|$)/g, '') // remove all html tags
        .trim();
    return result;
}
function cleanQuestionWithoutBrackets(question) {
    const result = question
        .replace(/<\s*br\s*\/?>/gi, ' ') // replace <br> with space
        .replace(/<\/?[^>]+(>|$)/g, '') // remove all html tags
        .replace(/\(.*?\)/g, '') // remove all text in parentheses
        .trim();
    return result;
}
function flattenQuestions(questions) {
    const result = [];
    for (const question of questions) {
        result.push(question);
        if (question.followUpQuestions && question.followUpQuestions.length > 0) {
            result.push(...question.followUpQuestions);
        }
    }
    return result;
}
function parseHtmlResults(html) {
    const sections = splitHtmlToSections(html);
    return sections.map(parseSection);
}
function splitHtmlToSections(html) {
    if (!html)
        return [];
    const h3Regex = /<h3>.*?<\/h3>/gi;
    const h3Matches = Array.from(html.matchAll(h3Regex));
    if (h3Matches.length === 0)
        return [html];
    const results = [];
    for (let i = 0; i < h3Matches.length; i++) {
        const currentMatch = h3Matches[i];
        const nextMatch = h3Matches[i + 1];
        const startIndex = currentMatch.index;
        const endIndex = nextMatch ? nextMatch.index : html.length;
        const section = html.substring(startIndex, endIndex).trim();
        if (section) {
            results.push(section);
        }
    }
    return results;
}
function parseSection(section) {
    if (!section)
        return '';
    return section
        // Убираем лишние переносы строк
        .replace(/\n/g, ' ')
        // Убираем лишние пробелы
        .replace(/\s{2,}/g, ' ')
        // Заменяем <h3> на жирный текст с переносами
        .replace(/<h3>(.*?)<\/h3>/gi, '\n⭐ <b>$1</b>\n')
        // Удаляем <p> теги, оставляя содержимое с переносами
        .replace(/<p>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        // Заменяем <br> на переносы строки
        .replace(/<\s*br\s*\/?>/gi, '\n')
        // Обрабатываем списки
        .replace(/<ul>/gi, '\n')
        .replace(/<\/ul>/gi, '\n')
        .replace(/<li>/gi, '• ')
        .replace(/<\/li>/gi, '\n')
        // Сохраняем жирный текст для Telegram
        .replace(/<strong>/gi, '<b>')
        .replace(/<\/strong>/gi, '</b>')
        // Удаляем остальные HTML теги
        .replace(/<\/?[^>]+(>|$)/g, '')
        // Убираем лишние переносы строк
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim();
}
//# sourceMappingURL=utils.js.map