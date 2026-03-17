// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require('pg') as { Pool: new (opts: { connectionString?: string }) => unknown };
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, QuestionType } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcryptjs') as { hashSync: (pwd: string, rounds: number) => string };

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as never);
const prisma = new PrismaClient({ adapter } as never);

const YES = 'Да';
const NO = 'Нет';

interface QuestionSeed {
  id: string;
  question: string;
  type: QuestionType;
  order: number;
  parentId?: string;
  conditions?: string[];
  options?: string[];
}

const questions: QuestionSeed[] = [
  {
    id: 'age',
    question: 'Укажите ваш возраст',
    type: 'number',
    order: 1,
  },
  {
    id: 'sport',
    question: 'Занимались ли вы спортом более 10 лет, уделяя этому 6 часов в неделю или более?',
    type: 'radio',
    order: 2,
    options: [YES, NO],
  },
  {
    id: 'pain_scale',
    question: 'Оцените вашу боль:<br>1-3 умеренная боль, 4-5 выраженная боль, 6-10 очень выраженная боль',
    type: 'radio',
    order: 3,
    options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
  },
  {
    id: 'pain_location',
    question: 'Локализация боли<br><small>(один или несколько вариантов)</small>',
    type: 'checkbox',
    order: 4,
    options: [
      'В пояснице больше справа',
      'В пояснице больше слева',
      'В пояснице по центру',
      'В ягодице больше справа',
      'В ягодице больше слева',
      'В крестце',
      'В правой ноге (бедро, икра, ступня)',
      'В левой ноге (бедро, икра, ступня)',
      'В паху',
      'Не могу сказать конкретно, где болит (вариант - везде)',
    ],
  },
  // follow-up of pain_location
  {
    id: 'leg_pain',
    question: 'Вы помните момент прострела в ногу?',
    type: 'radio',
    order: 5,
    parentId: 'pain_location',
    conditions: ['В правой ноге (бедро, икра, ступня)', 'В левой ноге (бедро, икра, ступня)'],
    options: [YES, NO],
  },
  {
    id: 'pain_image',
    question: 'Ваша боль за последние 2 месяца?',
    type: 'radio',
    order: 6,
    options: ['Разовая и не проходящая', 'Нарастающая со временем', 'Скачкообразная, то есть, то нет'],
  },
  {
    id: 'morning_pain',
    question: 'Усиливается ли у вас боль по утрам?',
    type: 'radio',
    order: 7,
    options: [YES, NO],
  },
  {
    id: 'night_pain',
    question: 'Болит во время сна?',
    type: 'radio',
    order: 8,
    options: [YES, 'Да, только когда переварачиваюсь', NO],
  },
  {
    id: 'pain_nature',
    question: 'Боль спонтанная или механическая?<br><small>(один или несколько вариантов)</small>',
    type: 'checkbox',
    order: 9,
    options: ['Спонтанная, возникает в состоянии покоя', 'Механическая, провоцируется движением'],
  },
  {
    id: 'dn4',
    question: 'На что похожа боль, которую вы испытываете?<br><small>(один или несколько вариантов)</small>',
    type: 'checkbox',
    order: 10,
    options: [
      'Ощущение жжения',
      'Болезненное ощущение холода',
      'Ощущение, как от удара током',
      'Пощипывание, ощущение мурашек',
      'Покалывание',
      'Онемение',
      'Зуд',
      'Ничего из вышеперечисленного',
    ],
  },
  {
    id: 'walking',
    question: 'Можете ли вы пройти расстояние, равное одной автобусной остановке без усиления боли?',
    type: 'radio',
    order: 11,
    options: [YES, NO],
  },
  // follow-ups of walking
  {
    id: 'walk_frequency',
    question: 'Приходится ли вам ходить более 15 минут без перерыва?',
    type: 'radio',
    order: 12,
    parentId: 'walking',
    conditions: [YES],
    options: [YES, NO],
  },
  {
    id: 'pain_while_walking',
    question: 'Усиливается ли боль в ноге или спине при ходьбе?',
    type: 'radio',
    order: 13,
    parentId: 'walking',
    conditions: [NO],
    options: [YES, NO],
  },
  {
    id: 'sit_without_pain',
    question: 'Можете сидеть без боли час?',
    type: 'radio',
    order: 14,
    options: [YES, NO],
  },
  {
    id: 'stand_without_pain',
    question: 'Можете стоять без боли час?',
    type: 'radio',
    order: 15,
    options: [YES, NO],
  },
  {
    id: 'lift_groceries',
    question: 'Можете поднять пакет с продуктами?',
    type: 'radio',
    order: 16,
    options: [YES, NO],
  },
  {
    id: 'symptoms_duration',
    question: 'Сколько длится ухудшение вашего состояния?',
    type: 'radio',
    order: 17,
    options: ['До месяца', 'До полугода', 'Больше года', 'Больше трех лет'],
  },
  {
    id: 'spine_operation',
    question: 'У вас была операция на позвоночнике?',
    type: 'radio',
    order: 18,
    options: [YES, NO],
  },
  {
    id: 'current_flare_duration',
    question: 'Сколько длится каждое/текущее обострение?',
    type: 'radio',
    order: 19,
    options: ['До недели', 'До трех недель', 'До 5 месяцев'],
  },
  {
    id: 'researches',
    question: 'Какие исследования делали по заболеванию?<br><small>(один или несколько вариантов)</small>',
    type: 'checkbox',
    order: 20,
    options: ['МРТ', 'КТ', 'Рентген с функциональными пробами', 'ЭНМГ', 'Анализы крови', 'Не делали никаких исследований'],
  },
  // follow-up of researches
  {
    id: 'lumbar_mri_count',
    question: 'У вас 3 и более МРТ поясницы?',
    type: 'radio',
    order: 21,
    parentId: 'researches',
    conditions: ['МРТ'],
    options: [YES, NO],
  },
  {
    id: 'neurosurgeon_consultation',
    question: 'Была ли консультация нейрохирурга?',
    type: 'radio',
    order: 22,
    options: [YES, NO],
  },
  {
    id: 'trauma_or_sudden_onset',
    question: 'Текущее ухудшение состояния спины связано с травмой?<br><small>(обратите внимание, что важно учитывать только свежие травмы, а не события из детства)</small>',
    type: 'radio',
    order: 23,
    options: [YES, NO],
  },
  {
    id: 'sudden_onset',
    question: 'Ваше заболевание началось внезапно?',
    type: 'radio',
    order: 24,
    options: [YES, NO],
  },
  {
    id: 'stress_related_flare',
    question: 'Можно ли обострения связать со стрессом?',
    type: 'radio',
    order: 25,
    options: [YES, NO],
  },
  {
    id: 'neurosis_symptoms',
    question: 'Бывают ли у вас следующие симптомы?<br><small>(один или несколько вариантов)</small>',
    type: 'checkbox',
    order: 26,
    options: [
      'Головокружение',
      'Ощущение кома в горле',
      'Панические атаки',
      'Сердцебиение в покое или чувство аритмии сердца (трепетание)',
      'Ощущение мурашек по коже',
      'Онемение на лице',
      'Подергивание века',
      'Шум в ушах',
      'Периодические боли в животе и нарушения стула',
      'Частые головные боли',
      'Ощущение нехватки воздуха',
      'Снижение настроения',
      'Повышенная потливость',
      'Сложность с засыпанием или поверхностный сон',
      'Ничего из вышеперечисленного',
    ],
  },
  {
    id: 'head_mri',
    question: 'Делали ли МРТ головы?',
    type: 'radio',
    order: 27,
    options: [YES, NO],
  },
];

const defaultSettings = [
  { key: 'primaryColor', value: '#1a56db' },
  { key: 'backgroundColor', value: '#ffffff' },
  { key: 'textColor', value: '#111827' },
  { key: 'borderRadius', value: '8px' },
  { key: 'fontFamily', value: 'system-ui, sans-serif' },
  { key: 'surveyTitle', value: 'Опросник по боли в спине' },
  { key: 'surveyDisclaimer', value: 'Тест носит исключительно образовательный и информационный характер, а не медицинский. Для постановки диагноза и назначения лечения требуется консультация медицинского специалиста.' },
  { key: 'privacyPolicyUrl', value: 'https://epifanov.clinic/privacy' },
  { key: 'bitrixWebhookUrl', value: '' },
  { key: 'bitrixLeadTitle', value: 'Лид из бота про боль в спине' },
  { key: 'emailRecipients', value: 'web-iris@yandex.ru,info@epifanov.clinic' },
];

async function main() {
  console.log('Seeding questions...');

  for (const q of questions) {
    await prisma.question.upsert({
      where: { id: q.id },
      update: {},
      create: {
        id: q.id,
        question: q.question,
        type: q.type,
        order: q.order,
        parentId: q.parentId ?? null,
        conditions: q.conditions ?? [],
        options: q.options
          ? {
              create: q.options.map((value, index) => ({ value, order: index })),
            }
          : undefined,
      },
    });
  }

  console.log('Seeding settings...');
  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  console.log('Seeding admin user...');
  const defaultPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
  const passwordHash = bcrypt.hashSync(defaultPassword, 10);
  await (prisma as unknown as { admin: { upsert: (args: unknown) => Promise<unknown> } }).admin.upsert({
    where: { login: 'admin' },
    update: {},
    create: { login: 'admin', passwordHash, role: 'superadmin' },
  });

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
