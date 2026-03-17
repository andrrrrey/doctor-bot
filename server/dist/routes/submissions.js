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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.submissionsRouter = void 0;
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const db_1 = require("../db");
const bitrix_1 = require("../bitrix");
const transporter_1 = require("../transporter");
const generate_pdf_1 = require("../generate-pdf");
const questionnaire_version_1 = require("../questionnaire-version");
exports.submissionsRouter = (0, express_1.Router)();
// ── File upload configuration ──────────────────────────────────────────────
const MAX_FILE_MB = Number((_a = process.env.MAX_FILE_SIZE_MB) !== null && _a !== void 0 ? _a : 10);
const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const ALLOWED_EXT = new Set(['.pdf', '.jpg', '.jpeg', '.png']);
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        var _a;
        const uploadDir = path_1.default.resolve((_a = process.env.UPLOAD_DIR) !== null && _a !== void 0 ? _a : './uploads');
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
        cb(null, unique);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: MAX_FILE_MB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (!ALLOWED_MIME.has(file.mimetype) || !ALLOWED_EXT.has(ext)) {
            return cb(new Error('Invalid file type. Allowed: pdf, jpg, jpeg, png'));
        }
        cb(null, true);
    },
});
// ── POST /api/submissions ──────────────────────────────────────────────────
// Save submission after contact form is filled
exports.submissionsRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { sessionId, patientName, patientPhone, patientCity, diagnosis, extendedDiagnosis, diagnosisHtml, answers, } = req.body;
    if (!sessionId) {
        res.status(400).json({ error: 'sessionId is required' });
        return;
    }
    // Snapshot the current questionnaire version (creates one if state changed)
    let versionId;
    try {
        versionId = yield (0, questionnaire_version_1.getOrCreateVersion)();
    }
    catch (vErr) {
        console.error('Failed to get/create questionnaire version:', vErr);
    }
    let submission;
    try {
        submission = yield db_1.prisma.submission.create({
            data: Object.assign({ sessionId,
                patientName,
                patientPhone,
                patientCity,
                diagnosis,
                extendedDiagnosis,
                diagnosisHtml, answers: answers !== null && answers !== void 0 ? answers : [], bitrixStatus: 'pending' }, (versionId ? { versionId } : {})),
        });
        // Mark session as completed
        yield db_1.prisma.session.update({
            where: { id: sessionId },
            data: { completed: true },
        });
    }
    catch (err) {
        console.error('POST /api/submissions DB error:', err);
        res.status(500).json({ error: 'Failed to save submission' });
        return;
    }
    // Send email + Bitrix in background (don't block response)
    res.status(201).json({ id: submission.id });
    // Async side-effects
    try {
        const rusAnswers = Array.isArray(answers) ? answers : [];
        const pdfBuffer = yield (0, generate_pdf_1.generatePDF)(rusAnswers);
        yield (0, transporter_1.sendMailWithPDF)(`Данные о пациенте\nИмя: ${patientName}\nТелефон: ${patientPhone}\nГород: ${patientCity}\nДиагноз: ${diagnosis}\nРасширенный диагноз: ${extendedDiagnosis}`, pdfBuffer);
    }
    catch (mailErr) {
        console.error('Email send error:', mailErr);
    }
    try {
        const allQA = Array.isArray(answers)
            ? answers.map((a) => `${a.question}: ${a.answers.join('. ')}`).join('\n')
            : '';
        yield (0, bitrix_1.sendLeadToBitrix)({
            name: patientName,
            phone: patientPhone,
            diagnosis,
            extendedDiagnosis,
            answers: allQA,
        });
        yield db_1.prisma.submission.update({
            where: { id: submission.id },
            data: { bitrixStatus: 'sent' },
        });
    }
    catch (bitrixErr) {
        const errMsg = bitrixErr instanceof Error ? bitrixErr.message : String(bitrixErr);
        console.error('Bitrix send error:', bitrixErr);
        yield db_1.prisma.submission.update({
            where: { id: submission.id },
            data: { bitrixStatus: 'error', bitrixError: errMsg },
        }).catch(() => { });
    }
}));
// ── POST /api/submissions/:id/file ─────────────────────────────────────────
// Upload a file and attach to submission
exports.submissionsRouter.post('/:id/file', upload.single('file'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    const fileName = req.file.originalname;
    try {
        yield db_1.prisma.submission.update({
            where: { id },
            data: { fileUrl, fileName },
        });
        res.json({ fileUrl, fileName });
    }
    catch (err) {
        console.error('POST /api/submissions/:id/file error:', err);
        res.status(500).json({ error: 'Failed to attach file' });
    }
}));
//# sourceMappingURL=submissions.js.map