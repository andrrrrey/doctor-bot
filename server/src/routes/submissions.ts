import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { prisma } from '../db';
import { sendLeadToBitrix } from '../bitrix';
import { sendMailWithPDF } from '../transporter';
import { generatePDF } from '../generate-pdf';
import { getOrCreateVersion } from '../questionnaire-version';

export const submissionsRouter = Router();

// ── File upload configuration ──────────────────────────────────────────────
const MAX_FILE_MB = Number(process.env.MAX_FILE_SIZE_MB ?? 50);
const MIN_FILE_MB = 20;
const ALLOWED_MIME = new Set([
  'application/zip',
  'application/x-zip-compressed',
  'application/x-zip',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/dicom',
  'application/octet-stream', // fallback for .dcm and .rar on some systems
]);
const ALLOWED_EXT = new Set(['.zip', '.rar', '.dcm']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? './uploads');
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return cb(new Error('Invalid file type. Allowed: zip, rar, dcm (DICOM)'));
    }
    cb(null, true);
  },
});

// ── POST /api/submissions ──────────────────────────────────────────────────
// Save submission after contact form is filled
submissionsRouter.post('/', async (req: Request, res: Response) => {
  const {
    sessionId,
    patientName,
    patientPhone,
    patientCity,
    diagnosis,
    extendedDiagnosis,
    diagnosisHtml,
    answers,
  } = req.body;

  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  // Snapshot the current questionnaire version (creates one if state changed)
  let versionId: string | undefined;
  try {
    versionId = await getOrCreateVersion();
  } catch (vErr) {
    console.error('Failed to get/create questionnaire version:', vErr);
  }

  let submission;
  try {
    submission = await prisma.submission.create({
      data: {
        sessionId,
        patientName,
        patientPhone,
        patientCity,
        diagnosis,
        extendedDiagnosis,
        diagnosisHtml,
        answers: answers ?? [],
        bitrixStatus: 'pending',
        ...(versionId ? { versionId } : {}),
      },
    });

    // Mark session as completed
    await prisma.session.update({
      where: { id: sessionId },
      data: { completed: true },
    });
  } catch (err) {
    console.error('POST /api/submissions DB error:', err);
    res.status(500).json({ error: 'Failed to save submission' });
    return;
  }

  // Send email + Bitrix in background (don't block response)
  res.status(201).json({ id: submission.id });

  // Async side-effects
  try {
    const rusAnswers: { question: string; answers: string[] }[] = Array.isArray(answers) ? answers : [];
    const pdfBuffer = await generatePDF(rusAnswers);
    await sendMailWithPDF(
      `Данные о пациенте\nИмя: ${patientName}\nТелефон: ${patientPhone}\nГород: ${patientCity}\nДиагноз: ${diagnosis}\nРасширенный диагноз: ${extendedDiagnosis}`,
      pdfBuffer,
    );
  } catch (mailErr) {
    console.error('Email send error:', mailErr);
  }

  try {
    const allQA = Array.isArray(answers)
      ? answers.map((a: { question: string; answers: string[] }) => `${a.question}: ${a.answers.join('. ')}`).join('\n')
      : '';
    await sendLeadToBitrix({
      name: patientName,
      phone: patientPhone,
      diagnosis,
      extendedDiagnosis,
      answers: allQA,
    });
    await prisma.submission.update({
      where: { id: submission.id },
      data: { bitrixStatus: 'sent' },
    });
  } catch (bitrixErr) {
    const errMsg = bitrixErr instanceof Error ? bitrixErr.message : String(bitrixErr);
    console.error('Bitrix send error:', bitrixErr);
    await prisma.submission.update({
      where: { id: submission.id },
      data: { bitrixStatus: 'error', bitrixError: errMsg },
    }).catch(() => {});
  }
});

// ── POST /api/submissions/:id/file ─────────────────────────────────────────
// Upload a file and attach to submission
submissionsRouter.post(
  '/:id/file',
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: `Файл слишком большой. Максимальный размер — ${MAX_FILE_MB} МБ` });
        return;
      }
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Reject files smaller than MIN_FILE_MB — considered erroneous
    if (req.file.size < MIN_FILE_MB * 1024 * 1024) {
      fs.unlink(req.file.path, () => {});
      res.status(400).json({
        error: `Файл слишком маленький (${(req.file.size / 1024 / 1024).toFixed(1)} МБ). Минимальный размер — ${MIN_FILE_MB} МБ. Возможно, файл повреждён или неполный.`,
      });
      return;
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const fileName = req.file.originalname;

    try {
      await prisma.submission.update({
        where: { id },
        data: { fileUrl, fileName },
      });
      res.json({ fileUrl, fileName });
    } catch (err) {
      console.error('POST /api/submissions/:id/file error:', err);
      res.status(500).json({ error: 'Failed to attach file' });
    }
  },
);
