import 'dotenv/config';
import path from 'path';
import express, { Request, Response } from 'express';
import {
  START_DIAGNOSIS,
  PAIN_TEXT,
  INFLAMMATION_TEXT,
  PAIN_HEADER,
  INFLAMMATION_HEADER,
  NEUROSIS_HEADER,
  NEUROSIS_TEXT,
  getDiagnosisHTML,
  RUS_DIAGNOSIS,
  QUESTIONS,
} from './constants';
import {
  Answer,
  ConsultationAnswer,
  OptionWeightsMap,
  getPainScale,
  getRusQuestionsAndAnswers,
  processAnswers,
  processResultDiagnosis,
  secondProcessAnswers,
} from './process-answers';
import { prisma } from './db';
import { sendMailWithPDF } from './transporter';
import { generatePDF } from './generate-pdf';
import { sendLeadToBitrix } from './bitrix';
import { questionsRouter } from './routes/questions';
import { sessionsRouter } from './routes/sessions';
import { submissionsRouter } from './routes/submissions';
import { settingsRouter } from './routes/settings';
import { adminAuthRouter } from './routes/admin/auth';
import { adminQuestionsRouter } from './routes/admin/questions';
import { adminSubmissionsRouter } from './routes/admin/submissions';
import { adminStatsRouter } from './routes/admin/stats';
import { adminSettingsRouter } from './routes/admin/settings';

const app = express();
const port = Number(process.env.PORT ?? 3000);

// ── Static files ────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../../public')));

// Serve uploaded files
const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? './uploads');
app.use('/uploads', express.static(uploadDir));

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use((req: Request, res: Response, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// ── Widget HTML endpoint ─────────────────────────────────────────────────────
// Serves the embeddable widget page at /widget
app.get('/widget', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../public/widget.html'));
});

// ── Admin panel HTML ─────────────────────────────────────────────────────────
app.get('/admin', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../public/admin/index.html'));
});

// ── New API routes ───────────────────────────────────────────────────────────
app.use('/api/questions', questionsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/settings', settingsRouter);

// ── Admin API routes ─────────────────────────────────────────────────────────
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api/admin/questions', adminQuestionsRouter);
app.use('/api/admin/submissions', adminSubmissionsRouter);
app.use('/api/admin/stats', adminStatsRouter);
app.use('/api/admin/settings', adminSettingsRouter);

// ── Legacy routes (kept for backward compatibility with Telegram bot) ────────

app.get('/survey', (_req: Request, res: Response) => {
  res.json({ questions: QUESTIONS });
});

interface SubmitRequest extends Request {
  body: Answer[];
}

type PostTestResultsRequest = {
  html: string;
  diagnosis?: string;
  extendedDiagnosis?: string;
  answers?: { question: string; answers: string[] }[];
};

app.post('/postTestResults', async (req: SubmitRequest, res: Response) => {
  const answers = req.body;

  // Build option weights map from DB
  const questionIds = answers.map((a) => a.questionId);
  const dbOptions = await prisma.answerOption.findMany({
    where: { questionId: { in: questionIds } },
    select: { questionId: true, value: true, weights: true },
  });
  const optionWeights: OptionWeightsMap = new Map();
  for (const opt of dbOptions) {
    const w = opt.weights as Record<string, number>;
    const hasWeight = Object.values(w).some((v) => v !== 0);
    if (hasWeight) {
      optionWeights.set(`${opt.questionId}::${opt.value}`, w);
    }
  }

  const startDiagnosis = { ...START_DIAGNOSIS };
  const firstProcessDiagnosis = processAnswers(startDiagnosis, answers, optionWeights);
  const secondProcessDiagnosis = secondProcessAnswers(firstProcessDiagnosis, answers, optionWeights);

  let htmlContent = '';
  const extendedDiagnosis = `
    Нервоз: ${secondProcessDiagnosis.neurosis}
    Мышцы: ${secondProcessDiagnosis.muscles}
    Грыжа: ${secondProcessDiagnosis.hernia}
    Артроз: ${secondProcessDiagnosis.arthrosis}
    Стеноз: ${secondProcessDiagnosis.stenosis}
    Воспаление: ${secondProcessDiagnosis.inflammation}
  `;

  const painScale = getPainScale(answers);
  const painTextId = painScale < 4 ? 0 : painScale < 6 ? 1 : 2;
  htmlContent += `${PAIN_HEADER}${PAIN_TEXT[painTextId]}`;

  if (secondProcessDiagnosis.inflammation > 0) {
    htmlContent += `${INFLAMMATION_HEADER}${INFLAMMATION_TEXT[secondProcessDiagnosis.inflammation - 1]}`;
  }

  const resultDiagnosis = processResultDiagnosis(secondProcessDiagnosis);
  const rusDiagnosis = resultDiagnosis.map((d) => RUS_DIAGNOSIS[d]);
  htmlContent += getDiagnosisHTML(resultDiagnosis.join('_'));

  const isNeurosis = firstProcessDiagnosis.neurosis > 7;
  if (isNeurosis) htmlContent += `${NEUROSIS_HEADER}${NEUROSIS_TEXT}`;

  const rusAnswers = getRusQuestionsAndAnswers(answers);
  const result: PostTestResultsRequest = { html: htmlContent };

  if (!(resultDiagnosis.length === 1 && resultDiagnosis[0] === 'muscles' && isNeurosis)) {
    result.diagnosis = rusDiagnosis.join(' и ');
    result.extendedDiagnosis = extendedDiagnosis;
    result.answers = rusAnswers;
  }

  res.json(result);
});

interface SubmitConsultationRequest extends Request {
  body: ConsultationAnswer;
}

app.post('/postConsultationData', async (req: SubmitConsultationRequest, res: Response) => {
  const { patientName, patientPhone, patientCity, diagnosis, answers, extendedDiagnosis } = req.body;
  try {
    const pdfBuffer = await generatePDF(answers);
    await sendMailWithPDF(
      `Данные о пациенте\nИмя: ${patientName}\nТелефон: ${patientPhone}\nГород: ${patientCity}\nДиагноз: ${diagnosis}\nРасширенный диагноз: ${extendedDiagnosis}`,
      pdfBuffer,
    );
    const allQA = answers.map((item) => `${item.question}: ${item.answers.join('. ')}`).join('\n');
    await sendLeadToBitrix({ name: patientName, phone: patientPhone, diagnosis, extendedDiagnosis, answers: allQA });
    res.status(200).json({ message: 'Письмо успешно отправлено' });
  } catch (error) {
    res.status(500).json({ error });
  }
});

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
