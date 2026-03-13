import { Router, Request, Response } from 'express';
import { prisma } from '../db';

export const sessionsRouter = Router();

// POST /api/sessions — create anonymous session
sessionsRouter.post('/', async (req: Request, res: Response) => {
  const { projectId, source, theme } = req.body;
  try {
    const session = await prisma.session.create({
      data: { projectId, source, theme },
    });
    res.status(201).json({ id: session.id });
  } catch (err) {
    console.error('POST /api/sessions error:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// PATCH /api/sessions/:id/complete — mark session completed
sessionsRouter.patch('/:id/complete', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.session.update({ where: { id }, data: { completed: true } });
    res.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/sessions/:id/complete error:', err);
    res.status(500).json({ error: 'Failed to update session' });
  }
});
