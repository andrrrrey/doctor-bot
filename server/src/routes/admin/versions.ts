import { Router, Request, Response } from 'express';
import { prisma } from '../../db';
import { adminAuth, requireSuperadmin } from '../../middleware/adminAuth';
import { getOrCreateVersion, buildQuestionnaireSnapshot } from '../../questionnaire-version';

export const adminVersionsRouter = Router();
adminVersionsRouter.use(adminAuth);
adminVersionsRouter.use(requireSuperadmin);

// GET /api/admin/versions — list all versions with submission counts
adminVersionsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const versions = await prisma.questionnaireVersion.findMany({
      orderBy: { version: 'desc' },
      include: { _count: { select: { submissions: true } } },
    });

    res.json({
      versions: versions.map((v) => ({
        id: v.id,
        version: v.version,
        description: v.description,
        submissionCount: v._count.submissions,
        createdAt: v.createdAt,
      })),
    });
  } catch (err) {
    console.error('GET /api/admin/versions error:', err);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

// GET /api/admin/versions/current — snapshot of the current (live) questionnaire state
adminVersionsRouter.get('/current', async (_req: Request, res: Response) => {
  try {
    const snapshot = await buildQuestionnaireSnapshot();
    res.json({ snapshot });
  } catch (err) {
    console.error('GET /api/admin/versions/current error:', err);
    res.status(500).json({ error: 'Failed to build snapshot' });
  }
});

// GET /api/admin/versions/:id — full snapshot for a specific version
adminVersionsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const v = await prisma.questionnaireVersion.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { submissions: true } } },
    });

    if (!v) {
      res.status(404).json({ error: 'Version not found' });
      return;
    }

    res.json({
      id: v.id,
      version: v.version,
      description: v.description,
      snapshot: v.snapshot,
      submissionCount: v._count.submissions,
      createdAt: v.createdAt,
    });
  } catch (err) {
    console.error('GET /api/admin/versions/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch version' });
  }
});

// POST /api/admin/versions — manually save the current state as a named version
adminVersionsRouter.post('/', async (req: Request, res: Response) => {
  const { description } = req.body as { description?: string };

  try {
    const versionId = await getOrCreateVersion(description);
    const v = await prisma.questionnaireVersion.findUnique({ where: { id: versionId } });
    res.status(201).json({ id: versionId, version: v?.version, description: v?.description, createdAt: v?.createdAt });
  } catch (err) {
    console.error('POST /api/admin/versions error:', err);
    res.status(500).json({ error: 'Failed to save version' });
  }
});

// POST /api/admin/versions/:id/restore — restore questionnaire to a saved version
adminVersionsRouter.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const v = await prisma.questionnaireVersion.findUnique({ where: { id: req.params.id } });
    if (!v) {
      res.status(404).json({ error: 'Version not found' });
      return;
    }

    const snapshot = Array.isArray(v.snapshot) ? (v.snapshot as {
      id: string;
      question: string;
      type: string;
      order: number;
      isActive: boolean;
      parentId: string | null;
      conditions: string[];
      options: { value: string; order: number; weights: Record<string, number> }[];
    }[]) : [];

    // Replace all questions atomically
    await prisma.$transaction(async (tx) => {
      // Delete all existing questions (options cascade automatically)
      await tx.question.deleteMany({});

      // Recreate from snapshot in order (parents before children)
      const roots = snapshot.filter((q) => !q.parentId);
      const children = snapshot.filter((q) => q.parentId);

      for (const q of [...roots, ...children]) {
        await tx.question.create({
          data: {
            id: q.id,
            question: q.question,
            type: q.type as 'radio' | 'checkbox' | 'number' | 'text' | 'file',
            order: q.order,
            isActive: q.isActive,
            parentId: q.parentId,
            conditions: q.conditions,
            options: {
              create: q.options.map((o) => ({
                value: o.value,
                order: o.order,
                weights: o.weights,
              })),
            },
          },
        });
      }
    });

    res.json({ ok: true, restoredVersion: v.version });
  } catch (err) {
    console.error('POST /api/admin/versions/:id/restore error:', err);
    res.status(500).json({ error: 'Failed to restore version' });
  }
});
