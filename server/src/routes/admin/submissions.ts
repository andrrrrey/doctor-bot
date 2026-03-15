import { Router, Request, Response } from 'express';
import { prisma } from '../../db';
import { adminAuth } from '../../middleware/adminAuth';

export const adminSubmissionsRouter = Router();
adminSubmissionsRouter.use(adminAuth);

// GET /api/admin/submissions
// Query params: page, limit, dateFrom, dateTo, bitrixStatus, hasFile
adminSubmissionsRouter.get('/', async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (req.query.dateFrom || req.query.dateTo) {
    where.createdAt = {};
    if (req.query.dateFrom) {
      (where.createdAt as Record<string, unknown>).gte = new Date(req.query.dateFrom as string);
    }
    if (req.query.dateTo) {
      const to = new Date(req.query.dateTo as string);
      to.setHours(23, 59, 59, 999);
      (where.createdAt as Record<string, unknown>).lte = to;
    }
  }

  if (req.query.bitrixStatus) {
    where.bitrixStatus = req.query.bitrixStatus;
  }

  if (req.query.hasFile === 'true') {
    where.fileUrl = { not: null };
  } else if (req.query.hasFile === 'false') {
    where.fileUrl = null;
  }

  try {
    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { session: { select: { id: true, source: true, theme: true, completed: true } } },
      }),
      prisma.submission.count({ where }),
    ]);

    res.json({
      submissions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('GET /api/admin/submissions error:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// GET /api/admin/submissions/:id
adminSubmissionsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
      include: { session: true },
    });
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }
    res.json({ submission });
  } catch (err) {
    console.error('GET /api/admin/submissions/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});
