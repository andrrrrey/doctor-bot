"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RETRY_SEND_CONSULTATION = exports.RETRY_SEND_ANSWERS = exports.CALLBACK_TYPES = exports.getFinalQuestion = exports.FINAL_QUESTION_ID = exports.BOT_TOKEN = void 0;
exports.BOT_TOKEN = '7589150034:AAG673CiLfuEC8Oz9WhC6lPVO0ZGxj1cBI0';
exports.FINAL_QUESTION_ID = 'final_question';
const FINAL_QUESTION = {
    id: exports.FINAL_QUESTION_ID,
    question: 'Вы ответили на все вопросы!',
    type: 'radio',
    options: ['Получить результат'],
    text: 'Вы ответили на все вопросы!',
};
const getFinalQuestion = () => {
    return Object.assign({}, FINAL_QUESTION);
};
exports.getFinalQuestion = getFinalQuestion;
exports.CALLBACK_TYPES = {
    START_CONSULTATION: 'start_consultation',
    DONE: 'done'
};
// Константы для повторных попыток
exports.RETRY_SEND_ANSWERS = 'retry_send_answers';
exports.RETRY_SEND_CONSULTATION = 'retry_send_consultation';
//# sourceMappingURL=constants.js.map