import { Router, Request, Response } from 'express';
import { prisma } from '../../db';
import { adminAuth } from '../../middleware/adminAuth';

export const adminSettingsRouter = Router();
adminSettingsRouter.use(adminAuth);

// GET /api/admin/settings
adminSettingsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.setting.findMany();
    const settings: Record<string, string> = {};
    rows.forEach((r) => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    console.error('GET /api/admin/settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/admin/settings
adminSettingsRouter.put('/', async (req: Request, res: Response) => {
  const updates: Record<string, string> = req.body;
  if (typeof updates !== 'object' || Array.isArray(updates)) {
    res.status(400).json({ error: 'Body must be a key/value object' });
    return;
  }

  try {
    await Promise.all(
      Object.entries(updates).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/admin/settings error:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});
