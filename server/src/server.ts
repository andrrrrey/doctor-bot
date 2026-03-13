import express, { Request, Response } from 'express';
import { START_DIAGNOSIS, PAIN_TEXT, INFLAMMATION_TEXT, PAIN_HEADER, INFLAMMATION_HEADER, NEUROSIS_HEADER, NEUROSIS_TEXT, getDiagnosisHTML, RUS_DIAGNOSIS, QUESTIONS } from "./constants";
import { Answer, ConsultationAnswer, getPainScale, getRusQuestionsAndAnswers, processAnswers, processResultDiagnosis, secondProcessAnswers } from './process-answers';
import { sendMailWithPDF } from './transporter';
import { generatePDF } from './generate-pdf';
import { sendLeadToBitrix } from './bitrix';

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json());
app.use((req: Request, res: Response, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.get('/survey', (req: Request, res: Response) => {
  res.json({
    questions: QUESTIONS,
  });
});

interface SubmitRequest extends Request {
  body: Answer[];
}

type PostTestResultsRequest = {
  html: string;
  diagnosis?: string;
  extendedDiagnosis?: string;
  answers?: {
    question: string;
    answers: string[];
  }[]
};

app.post('/postTestResults', (req: SubmitRequest, res: Response) => {
  const answers = req.body;
  const startDiagnosis = { ...START_DIAGNOSIS };
  const firstProcessDiagnosis = processAnswers(startDiagnosis, answers);
  const secondProcessDiagnosis = secondProcessAnswers(firstProcessDiagnosis, answers);

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
  htmlContent += `
    ${PAIN_HEADER}
    ${PAIN_TEXT[painTextId]}`;

  if (secondProcessDiagnosis.inflammation > 0) {
    const inflammationTextId = secondProcessDiagnosis.inflammation - 1;
    htmlContent += `
      ${INFLAMMATION_HEADER}
      ${INFLAMMATION_TEXT[inflammationTextId]}`;
  }

  const resultDiagnosis = processResultDiagnosis(secondProcessDiagnosis);
  const rusDiagnosis = resultDiagnosis.map(diagnosis => RUS_DIAGNOSIS[diagnosis]);

  htmlContent += getDiagnosisHTML(resultDiagnosis.join('_'));

  const isNeurosis = firstProcessDiagnosis.neurosis > 7;

  if (isNeurosis) {
    htmlContent += `
      ${NEUROSIS_HEADER}
      ${NEUROSIS_TEXT}`;
  }

  const rusAnswers = getRusQuestionsAndAnswers(answers);

  const result: PostTestResultsRequest = {
    html: htmlContent,
  };

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
  const consultationData = req.body;
  const { patientName, patientPhone, patientCity, diagnosis, answers, extendedDiagnosis } = consultationData;
  try {
    const pdfBuffer = await generatePDF(answers);

    await sendMailWithPDF(`
      Данные о пациенте  
      Имя:  ${patientName}
      Телефон:  ${patientPhone}
      Город:  ${patientCity}
      Диагноз:  ${diagnosis}
      Расширенный диагноз:  ${extendedDiagnosis}
    `,
      pdfBuffer
    );

    const allQuestionsAndAnswers = answers.map(item => `${item.question}: ${item.answers.join('. ')}`).join('\n');
    await sendLeadToBitrix({
      name: patientName,
      phone: patientPhone,
      diagnosis: diagnosis,
      extendedDiagnosis: extendedDiagnosis,
      answers: allQuestionsAndAnswers,
    });


    res.status(200).json({ message: 'Письмо успешно отправлено' });
  } catch (error) {
    res.status(500).json({ error });
  }
});

app.listen(port, () => { });