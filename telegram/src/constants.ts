import { Question } from "./types";

export const BOT_TOKEN = '7589150034:AAG673CiLfuEC8Oz9WhC6lPVO0ZGxj1cBI0';

export const FINAL_QUESTION_ID = 'final_question';

const FINAL_QUESTION: Question = {
  id: FINAL_QUESTION_ID,
  question: 'Вы ответили на все вопросы!',
  type: 'radio',
  options: ['Получить результат'],
  text: 'Вы ответили на все вопросы!',
};

export const getFinalQuestion = () => {
  return { ...FINAL_QUESTION };
}

export const CALLBACK_TYPES = {
  START_CONSULTATION: 'start_consultation',
  DONE: 'done'
} as const;

// Константы для повторных попыток
export const RETRY_SEND_ANSWERS = 'retry_send_answers';
export const RETRY_SEND_CONSULTATION = 'retry_send_consultation'; 