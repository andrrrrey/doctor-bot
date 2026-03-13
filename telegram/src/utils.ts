import TelegramBot from 'node-telegram-bot-api';
import { Question, UserState, UserStates } from './types';
import { getFinalQuestion } from './constants';

export function isUserInConsultationState(userState: UserState) {
  return userState.consultationState?.isActive === true;
}

export function getCurrentQuestion(userState: UserState): Question | undefined {
  return userState.questions?.find(q => q.messageId && !q.isDone);
}

export async function deleteMessage(bot: TelegramBot, chatId: number, messageId: number): Promise<void> {
  try {
    await bot.deleteMessage(chatId, messageId);
  } catch (error) { }
}

export function initializeUserState(
  questions: Question[],
  chatId: number,
  userStates: UserStates
): UserState {
  const userState: UserState = {
    questions: [],
  };
  userState.questions = flattenQuestions(questions);
  userState.questions.forEach(question => {
    question.text = cleanQuestion(question.question);
  });
  // userState.questions = userState.questions.slice(0, 3); // временно оставляем только первые 3 вопроса
  userState.questions.push(getFinalQuestion());
  userStates.delete(chatId);
  userStates.set(chatId, userState);

  return userState;
}

export async function sendNextQuestions(
  bot: TelegramBot,
  chatId: number,
  userState: UserState,
) {
  const { questions } = userState;

  if (!questions) return;

  const drawnUnansweredQuestions = questions.filter(q => q.messageId && !q.isDone);
  if (drawnUnansweredQuestions.length > 0) return;

  const undrawnUnansweredQuestions = questions.filter(q => !q.messageId);

  for (const question of undrawnUnansweredQuestions) {
    if (question.dependencyId) {
      const dependencyQuestion = questions.find(q => q.id === question.dependencyId);
      if (dependencyQuestion && question.conditions?.every(c => !dependencyQuestion.answers?.has(c))) {
        continue;
      }
    }

    const sentMessage = await bot.sendMessage(
      chatId,
      formatQuestion(question.text),
      { reply_markup: createInlineKeyboard(question) }
    );
    question.messageId = sentMessage.message_id;

    if (!question.isDone) break;
  }
};

export async function editTelegramMessage(
  bot: TelegramBot,
  chatId: number,
  messageId: number,
  question: Question,
) {
  await bot.editMessageText(formatQuestion(question.text), {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: createInlineKeyboard(question),
  });
};

export function formatQuestion(text: string): string {
  return `💊 ${text}`;
}

export function createInlineKeyboard(question: Question): TelegramBot.InlineKeyboardMarkup | undefined {
  const { options, type } = question;

  const selected = '✅ ';
  const notSelected = type === 'checkbox' ? '☑️ ' : '';
  const buttonsInRow = type === 'radio' && question.id === 'pain_scale' ? 5 : 1;

  const inlineKeyboard = [
    ...options.reduce((acc: TelegramBot.InlineKeyboardButton[][], option, index) => {
      const rowIndex = Math.floor(index / buttonsInRow);
      if (!acc[rowIndex]) {
        acc[rowIndex] = [];
      }
      acc[rowIndex].push({
        text: `${question.answers?.has(option) ? selected : notSelected}${option}`,
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

function cleanQuestion(question: string) {
  const result = question
    .replace(/<\s*br\s*\/?>/gi, ' ') // replace <br> with space
    .replace(/<\/?[^>]+(>|$)/g, '') // remove all html tags
    .trim();
  return result;
}

export function cleanQuestionWithoutBrackets(question: string) {
  const result = question
    .replace(/<\s*br\s*\/?>/gi, ' ') // replace <br> with space
    .replace(/<\/?[^>]+(>|$)/g, '')  // remove all html tags
    .replace(/\(.*?\)/g, '')         // remove all text in parentheses
    .trim();
  return result;
}

function flattenQuestions(questions: Question[]): Question[] {
  const result: Question[] = [];

  for (const question of questions) {
    result.push(question);

    if (question.followUpQuestions && question.followUpQuestions.length > 0) {
      result.push(...question.followUpQuestions);
    }
  }

  return result;
}

export function parseHtmlResults(html: string): string[] {
  const sections = splitHtmlToSections(html);
  return sections.map(parseSection);
}

function splitHtmlToSections(html: string): string[] {
  if (!html) return [];

  const h3Regex = /<h3>.*?<\/h3>/gi;
  const h3Matches = Array.from(html.matchAll(h3Regex));

  if (h3Matches.length === 0) return [html];

  const results: string[] = [];

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

function parseSection(section: string): string {
  if (!section) return '';

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