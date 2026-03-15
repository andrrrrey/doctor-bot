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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const constants_1 = require("./constants");
const process_answers_1 = require("./process-answers");
const transporter_1 = require("./transporter");
const generate_pdf_1 = require("./generate-pdf");
const bitrix_1 = require("./bitrix");
const questions_1 = require("./routes/questions");
const sessions_1 = require("./routes/sessions");
const submissions_1 = require("./routes/submissions");
const settings_1 = require("./routes/settings");
const auth_1 = require("./routes/admin/auth");
const questions_2 = require("./routes/admin/questions");
const submissions_2 = require("./routes/admin/submissions");
const stats_1 = require("./routes/admin/stats");
const settings_2 = require("./routes/admin/settings");
const app = (0, express_1.default)();
const port = Number((_a = process.env.PORT) !== null && _a !== void 0 ? _a : 3000);
// ── Static files ────────────────────────────────────────────────────────────
app.use(express_1.default.static(path_1.default.join(__dirname, '../../public')));
// Serve uploaded files
const uploadDir = path_1.default.resolve((_b = process.env.UPLOAD_DIR) !== null && _b !== void 0 ? _b : './uploads');
app.use('/uploads', express_1.default.static(uploadDir));
// ── Middleware ───────────────────────────────────────────────────────────────
app.use(express_1.default.json());
app.use((req, res, next) => {
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
app.get('/widget', (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../public/widget.html'));
});
// ── Admin panel HTML ─────────────────────────────────────────────────────────
app.get('/admin', (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../public/admin/index.html'));
});
// ── New API routes ───────────────────────────────────────────────────────────
app.use('/api/questions', questions_1.questionsRouter);
app.use('/api/sessions', sessions_1.sessionsRouter);
app.use('/api/submissions', submissions_1.submissionsRouter);
app.use('/api/settings', settings_1.settingsRouter);
// ── Admin API routes ─────────────────────────────────────────────────────────
app.use('/api/admin/auth', auth_1.adminAuthRouter);
app.use('/api/admin/questions', questions_2.adminQuestionsRouter);
app.use('/api/admin/submissions', submissions_2.adminSubmissionsRouter);
app.use('/api/admin/stats', stats_1.adminStatsRouter);
app.use('/api/admin/settings', settings_2.adminSettingsRouter);
// ── Legacy routes (kept for backward compatibility with Telegram bot) ────────
app.get('/survey', (_req, res) => {
    res.json({ questions: constants_1.QUESTIONS });
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
    htmlContent += `${constants_1.PAIN_HEADER}${constants_1.PAIN_TEXT[painTextId]}`;
    if (secondProcessDiagnosis.inflammation > 0) {
        htmlContent += `${constants_1.INFLAMMATION_HEADER}${constants_1.INFLAMMATION_TEXT[secondProcessDiagnosis.inflammation - 1]}`;
    }
    const resultDiagnosis = (0, process_answers_1.processResultDiagnosis)(secondProcessDiagnosis);
    const rusDiagnosis = resultDiagnosis.map((d) => constants_1.RUS_DIAGNOSIS[d]);
    htmlContent += (0, constants_1.getDiagnosisHTML)(resultDiagnosis.join('_'));
    const isNeurosis = firstProcessDiagnosis.neurosis > 7;
    if (isNeurosis)
        htmlContent += `${constants_1.NEUROSIS_HEADER}${constants_1.NEUROSIS_TEXT}`;
    const rusAnswers = (0, process_answers_1.getRusQuestionsAndAnswers)(answers);
    const result = { html: htmlContent };
    if (!(resultDiagnosis.length === 1 && resultDiagnosis[0] === 'muscles' && isNeurosis)) {
        result.diagnosis = rusDiagnosis.join(' и ');
        result.extendedDiagnosis = extendedDiagnosis;
        result.answers = rusAnswers;
    }
    res.json(result);
});
app.post('/postConsultationData', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { patientName, patientPhone, patientCity, diagnosis, answers, extendedDiagnosis } = req.body;
    try {
        const pdfBuffer = yield (0, generate_pdf_1.generatePDF)(answers);
        yield (0, transporter_1.sendMailWithPDF)(`Данные о пациенте\nИмя: ${patientName}\nТелефон: ${patientPhone}\nГород: ${patientCity}\nДиагноз: ${diagnosis}\nРасширенный диагноз: ${extendedDiagnosis}`, pdfBuffer);
        const allQA = answers.map((item) => `${item.question}: ${item.answers.join('. ')}`).join('\n');
        yield (0, bitrix_1.sendLeadToBitrix)({ name: patientName, phone: patientPhone, diagnosis, extendedDiagnosis, answers: allQA });
        res.status(200).json({ message: 'Письмо успешно отправлено' });
    }
    catch (error) {
        res.status(500).json({ error });
    }
}));
// ── Start ───────────────────────────────────────────────────────────────────
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
//# sourceMappingURL=server.js.map