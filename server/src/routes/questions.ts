import { Router, Request, Response } from 'express';
import { prisma } from '../db';

export const questionsRouter = Router();

// GET /api/questions — all active questions with options, structured with follow-ups
questionsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const all = await prisma.question.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: { options: { orderBy: { order: 'asc' } } },
    });

    // Separate top-level and follow-up questions
    const topLevel = all.filter((q) => !q.parentId);
    const followUps = all.filter((q) => q.parentId);

    const questions = topLevel.map((q) => ({
      id: q.id,
      question: q.question,
      type: q.type,
      options: q.options.map((o) => o.value),
      followUpQuestions: followUps
        .filter((f) => f.parentId === q.id)
        .map((f) => ({
          id: f.id,
          dependencyId: f.parentId,
          conditions: f.conditions,
          question: f.question,
          type: f.type,
          options: f.options.map((o) => o.value),
        })),
    }));

    res.json({ questions });
  } catch (err) {
    console.error('GET /api/questions error:', err);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});
