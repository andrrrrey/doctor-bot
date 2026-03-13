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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const constants_1 = require("./constants");
const process_answers_1 = require("./process-answers");
const transporter_1 = require("./transporter");
const generate_pdf_1 = require("./generate-pdf");
const bitrix_1 = require("./bitrix");
const app = (0, express_1.default)();
const port = 3000;
app.use(express_1.default.static('public'));
app.use(express_1.default.json());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});
app.get('/survey', (req, res) => {
    res.json({
        questions: constants_1.QUESTIONS,
    });
});
app.post('/postTestResults', (req, res) => {
    const answers = req.body;
    const startDiagnosis = Object.assign({}, constants_1.START_DIAGNOSIS);
    const firstProcessDiagnosis = (0, process_answers_1.processAnswers)(startDiagnosis, answers);
    const secondProcessDiagnosis = (0, process_answers_1.secondProcessAnswers)(firstProcessDiagnosis, answers);
    let htmlContent = '';
    const extendedDiagnosis = `
          Нервоз: ${secondProcessDiagnosis.neurosis}
          Мышцы: ${secondProcessDiagnosis.muscles}
          Грыжа: ${secondProcessDiagnosis.hernia}
          Артроз: ${secondProcessDiagnosis.arthrosis}
          Стеноз: ${secondProcessDiagnosis.stenosis}
          Воспаление: ${secondProcessDiagnosis.inflammation}
  `;
    const painScale = (0, process_answers_1.getPainScale)(answers);
    const painTextId = painScale < 4 ? 0 : painScale < 6 ? 1 : 2;
    htmlContent += `
    ${constants_1.PAIN_HEADER}
    ${constants_1.PAIN_TEXT[painTextId]}`;
    if (secondProcessDiagnosis.inflammation > 0) {
        const inflammationTextId = secondProcessDiagnosis.inflammation - 1;
        htmlContent += `
      ${constants_1.INFLAMMATION_HEADER}
      ${constants_1.INFLAMMATION_TEXT[inflammationTextId]}`;
    }
    const resultDiagnosis = (0, process_answers_1.processResultDiagnosis)(secondProcessDiagnosis);
    const rusDiagnosis = resultDiagnosis.map(diagnosis => constants_1.RUS_DIAGNOSIS[diagnosis]);
    htmlContent += (0, constants_1.getDiagnosisHTML)(resultDiagnosis.join('_'));
    const isNeurosis = firstProcessDiagnosis.neurosis > 7;
    if (isNeurosis) {
        htmlContent += `
      ${constants_1.NEUROSIS_HEADER}
      ${constants_1.NEUROSIS_TEXT}`;
    }
    const rusAnswers = (0, process_answers_1.getRusQuestionsAndAnswers)(answers);
    const result = {
        html: htmlContent,
    };
    if (!(resultDiagnosis.length === 1 && resultDiagnosis[0] === 'muscles' && isNeurosis)) {
        result.diagnosis = rusDiagnosis.join(' и ');
        result.extendedDiagnosis = extendedDiagnosis;
        result.answers = rusAnswers;
    }
    res.json(result);
});
app.post('/postConsultationData', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const consultationData = req.body;
    const { patientName, patientPhone, patientCity, diagnosis, answers, extendedDiagnosis } = consultationData;
    try {
        const pdfBuffer = yield (0, generate_pdf_1.generatePDF)(answers);
        yield (0, transporter_1.sendMailWithPDF)(`
      Данные о пациенте  
      Имя:  ${patientName}
      Телефон:  ${patientPhone}
      Город:  ${patientCity}
      Диагноз:  ${diagnosis}
      Расширенный диагноз:  ${extendedDiagnosis}
    `, pdfBuffer);
        const allQuestionsAndAnswers = answers.map(item => `${item.question}: ${item.answers.join('. ')}`).join('\n');
        yield (0, bitrix_1.sendLeadToBitrix)({
            name: patientName,
            phone: patientPhone,
            diagnosis: diagnosis,
            extendedDiagnosis: extendedDiagnosis,
            answers: allQuestionsAndAnswers,
        });
        res.status(200).json({ message: 'Письмо успешно отправлено' });
    }
    catch (error) {
        res.status(500).json({ error });
    }
}));
app.listen(port, () => { });
//# sourceMappingURL=server.js.map