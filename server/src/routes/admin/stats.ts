import { Router, Request, Response } from 'express';
import { prisma } from '../../db';
import { adminAuth } from '../../middleware/adminAuth';

export const adminStatsRouter = Router();
adminStatsRouter.use(adminAuth);

// GET /api/admin/stats
// Query params: dateFrom, dateTo
adminStatsRouter.get('/', async (req: Request, res: Response) => {
  const dateFilter: Record<string, unknown> = {};

  if (req.query.dateFrom || req.query.dateTo) {
    dateFilter.createdAt = {};
    if (req.query.dateFrom) {
      (dateFilter.createdAt as Record<string, unknown>).gte = new Date(req.query.dateFrom as string);
    }
    if (req.query.dateTo) {
      const to = new Date(req.query.dateTo as string);
      to.setHours(23, 59, 59, 999);
      (dateFilter.createdAt as Record<string, unknown>).lte = to;
    }
  }

  try {
    const [
      totalSessions,
      completedSessions,
      totalSubmissions,
      bitrixSent,
      bitrixError,
      submissionsWithFile,
    ] = await Promise.all([
      prisma.session.count({ where: dateFilter }),
      prisma.session.count({ where: { ...dateFilter, completed: true } }),
      prisma.submission.count({ where: dateFilter }),
      prisma.submission.count({ where: { ...dateFilter, bitrixStatus: 'sent' } }),
      prisma.submission.count({ where: { ...dateFilter, bitrixStatus: 'error' } }),
      prisma.submission.count({ where: { ...dateFilter, fileUrl: { not: null } } }),
    ]);

    // Conversion rates
    const completionRate = totalSessions > 0
      ? Math.round((completedSessions / totalSessions) * 100)
      : 0;
    const submissionRate = completedSessions > 0
      ? Math.round((totalSubmissions / completedSessions) * 100)
      : 0;
    const bitrixRate = totalSubmissions > 0
      ? Math.round((bitrixSent / totalSubmissions) * 100)
      : 0;

    res.json({
      sessions: {
        total: totalSessions,
        completed: completedSessions,
        completionRate,
      },
      submissions: {
        total: totalSubmissions,
        withFile: submissionsWithFile,
        submissionRate,
      },
      bitrix: {
        sent: bitrixSent,
        error: bitrixError,
        pending: totalSubmissions - bitrixSent - bitrixError,
        sentRate: bitrixRate,
      },
      conversions: [
        { stage: 'Начали опрос', count: totalSessions, rate: 100 },
        { stage: 'Завершили опрос', count: completedSessions, rate: completionRate },
        { stage: 'Оставили контакты', count: totalSubmissions, rate: submissionRate },
        { stage: 'Отправлено в Bitrix', count: bitrixSent, rate: bitrixRate },
      ],
    });
  } catch (err) {
    console.error('GET /api/admin/stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
