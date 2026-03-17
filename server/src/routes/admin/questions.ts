import { Router, Request, Response } from 'express';
import { prisma } from '../../db';
import { adminAuth, requireSuperadmin } from '../../middleware/adminAuth';

export const adminQuestionsRouter = Router();
adminQuestionsRouter.use(adminAuth);
// Write operations are superadmin-only; GET is accessible by all admin roles

// GET /api/admin/questions — all questions (including inactive), with options
adminQuestionsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const questions = await prisma.question.findMany({
      orderBy: { order: 'asc' },
      include: { options: { orderBy: { order: 'asc' } } },
    });
    res.json({ questions });
  } catch (err) {
    console.error('GET /api/admin/questions error:', err);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// GET /api/admin/questions/:id
adminQuestionsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const question = await prisma.question.findUnique({
      where: { id: req.params.id },
      include: { options: { orderBy: { order: 'asc' } } },
    });
    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }
    res.json({ question });
  } catch (err) {
    console.error('GET /api/admin/questions/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch question' });
  }
});

// POST /api/admin/questions — create question
adminQuestionsRouter.post('/', requireSuperadmin, async (req: Request, res: Response) => {
  const { id, question, type, order, isActive, parentId, conditions, options } = req.body;

  if (!id || !question || !type) {
    res.status(400).json({ error: 'id, question, and type are required' });
    return;
  }

  const validTypes = ['number', 'radio', 'checkbox', 'text', 'file'];
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    return;
  }

  try {
    const maxOrder = await prisma.question.aggregate({ _max: { order: true } });
    const newOrder = order ?? (maxOrder._max.order ?? 0) + 1;

    const created = await prisma.question.create({
      data: {
        id,
        question,
        type,
        order: newOrder,
        isActive: isActive ?? true,
        parentId: parentId ?? null,
        conditions: conditions ?? [],
        options: options?.length
          ? { create: (options as OptionInput[]).map((opt, index) => {
              const { value, weights } = parseOption(opt);
              return { value, order: index, weights };
            }) }
          : undefined,
      },
      include: { options: { orderBy: { order: 'asc' } } },
    });
    res.status(201).json({ question: created });
  } catch (err) {
    console.error('POST /api/admin/questions error:', err);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// PUT /api/admin/questions/:id — full update
adminQuestionsRouter.put('/:id', requireSuperadmin, async (req: Request, res: Response) => {
  const { question, type, order, isActive, parentId, conditions } = req.body;

  const validTypes = ['number', 'radio', 'checkbox', 'text', 'file'];
  if (type && !validTypes.includes(type)) {
    res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    return;
  }

  try {
    const updated = await prisma.question.update({
      where: { id: req.params.id },
      data: {
        ...(question !== undefined && { question }),
        ...(type !== undefined && { type }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(conditions !== undefined && { conditions }),
      },
      include: { options: { orderBy: { order: 'asc' } } },
    });
    res.json({ question: updated });
  } catch (err) {
    console.error('PUT /api/admin/questions/:id error:', err);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// PATCH /api/admin/questions/:id/toggle — toggle isActive
adminQuestionsRouter.patch('/:id/toggle', requireSuperadmin, async (req: Request, res: Response) => {
  try {
    const current = await prisma.question.findUnique({ where: { id: req.params.id } });
    if (!current) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }
    const updated = await prisma.question.update({
      where: { id: req.params.id },
      data: { isActive: !current.isActive },
    });
    res.json({ isActive: updated.isActive });
  } catch (err) {
    console.error('PATCH /api/admin/questions/:id/toggle error:', err);
    res.status(500).json({ error: 'Failed to toggle question' });
  }
});

// PATCH /api/admin/questions/reorder — update order for multiple questions
adminQuestionsRouter.patch('/reorder', requireSuperadmin, async (req: Request, res: Response) => {
  const { items } = req.body as { items: { id: string; order: number }[] };

  if (!Array.isArray(items)) {
    res.status(400).json({ error: 'items must be an array of {id, order}' });
    return;
  }

  try {
    await Promise.all(
      items.map(({ id, order }) =>
        prisma.question.update({ where: { id }, data: { order } })
      )
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/admin/questions/reorder error:', err);
    res.status(500).json({ error: 'Failed to reorder questions' });
  }
});

// DELETE /api/admin/questions/:id
adminQuestionsRouter.delete('/:id', requireSuperadmin, async (req: Request, res: Response) => {
  try {
    await prisma.question.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/questions/:id error:', err);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// ── Answer options ───────────────────────────────────────────────────────────

type OptionInput = string | { value: string; weights?: Record<string, number> };

function parseOption(opt: OptionInput): { value: string; weights: Record<string, number> } {
  if (typeof opt === 'string') return { value: opt, weights: {} };
  return { value: opt.value, weights: opt.weights ?? {} };
}

// PUT /api/admin/questions/:id/options — replace all options for a question
// Accepts options as string[] or {value, weights?}[]
adminQuestionsRouter.put('/:id/options', requireSuperadmin, async (req: Request, res: Response) => {
  const { options } = req.body as { options: OptionInput[] };

  if (!Array.isArray(options)) {
    res.status(400).json({ error: 'options must be an array' });
    return;
  }

  try {
    // Delete existing options, then recreate
    await prisma.answerOption.deleteMany({ where: { questionId: req.params.id } });
    const parsed = options.map(parseOption);
    const created = await prisma.answerOption.createMany({
      data: parsed.map(({ value, weights }, index) => ({
        questionId: req.params.id,
        value,
        order: index,
        weights,
      })),
    });
    res.json({ count: created.count });
  } catch (err) {
    console.error('PUT /api/admin/questions/:id/options error:', err);
    res.status(500).json({ error: 'Failed to update options' });
  }
});
