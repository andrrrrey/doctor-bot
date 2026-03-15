import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../db';
import { adminAuth, signAdminToken, AdminRequest } from '../../middleware/adminAuth';

export const adminAuthRouter = Router();

// POST /api/admin/auth/login
adminAuthRouter.post('/login', async (req: Request, res: Response) => {
  const { login, password } = req.body;

  if (!login || !password) {
    res.status(400).json({ error: 'login and password are required' });
    return;
  }

  try {
    const admin = await (prisma as unknown as { admin: { findUnique: (args: unknown) => Promise<{ id: number; passwordHash: string } | null> } })
      .admin.findUnique({ where: { login } });

    if (!admin || !bcrypt.compareSync(password, admin.passwordHash)) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signAdminToken(admin.id);
    res.json({ token });
  } catch (err) {
    console.error('POST /api/admin/auth/login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/auth/me — check token validity
adminAuthRouter.get('/me', adminAuth, (req: AdminRequest, res: Response) => {
  res.json({ adminId: req.adminId, ok: true });
});

// POST /api/admin/auth/change-password
adminAuthRouter.post('/change-password', adminAuth, async (req: AdminRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'currentPassword and newPassword are required' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: 'newPassword must be at least 6 characters' });
    return;
  }

  try {
    const admin = await (prisma as unknown as { admin: { findUnique: (args: unknown) => Promise<{ id: number; passwordHash: string } | null>; update: (args: unknown) => Promise<unknown> } })
      .admin.findUnique({ where: { id: req.adminId } });

    if (!admin || !bcrypt.compareSync(currentPassword, admin.passwordHash)) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);
    await (prisma as unknown as { admin: { update: (args: unknown) => Promise<unknown> } })
      .admin.update({ where: { id: req.adminId }, data: { passwordHash } });

    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/admin/auth/change-password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
