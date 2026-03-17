import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../db';
import { adminAuth, requireSuperadmin, AdminRequest } from '../../middleware/adminAuth';

export const adminUsersRouter = Router();
adminUsersRouter.use(adminAuth);
adminUsersRouter.use(requireSuperadmin);

type AdminRecord = { id: number; login: string; role: string; createdAt: Date };
type AdminDb = {
  admin: {
    findMany: (args: unknown) => Promise<AdminRecord[]>;
    findUnique: (args: unknown) => Promise<(AdminRecord & { passwordHash: string }) | null>;
    create: (args: unknown) => Promise<AdminRecord>;
    update: (args: unknown) => Promise<AdminRecord>;
    delete: (args: unknown) => Promise<AdminRecord>;
    count: (args?: unknown) => Promise<number>;
  };
};

function adminDb() {
  return (prisma as unknown as AdminDb).admin;
}

// GET /api/admin/users — list all admin users
adminUsersRouter.get('/', async (_req: AdminRequest, res: Response) => {
  try {
    const users = await adminDb().findMany({
      select: { id: true, login: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ users });
  } catch (err) {
    console.error('GET /api/admin/users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/admin/users — create new admin user (doctor or superadmin)
adminUsersRouter.post('/', async (req: AdminRequest, res: Response) => {
  const { login, password, role } = req.body;

  if (!login || !password) {
    res.status(400).json({ error: 'login and password are required' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'password must be at least 6 characters' });
    return;
  }

  const allowedRoles = ['superadmin', 'doctor'];
  const userRole = role && allowedRoles.includes(role) ? role : 'doctor';

  try {
    const existing = await adminDb().findUnique({ where: { login } });
    if (existing) {
      res.status(409).json({ error: 'User with this login already exists' });
      return;
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const user = await adminDb().create({
      data: { login, passwordHash, role: userRole },
      select: { id: true, login: true, role: true, createdAt: true },
    });

    res.status(201).json({ user });
  } catch (err) {
    console.error('POST /api/admin/users error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/admin/users/:id — update user (login, role, optionally password)
adminUsersRouter.put('/:id', async (req: AdminRequest, res: Response) => {
  const id = Number(req.params.id);
  const { login, role, password } = req.body;

  if (!login) {
    res.status(400).json({ error: 'login is required' });
    return;
  }

  const allowedRoles = ['superadmin', 'doctor'];
  const userRole = role && allowedRoles.includes(role) ? role : undefined;

  // Prevent superadmin from removing their own superadmin role
  if (id === req.adminId && userRole === 'doctor') {
    res.status(400).json({ error: 'Cannot downgrade your own account' });
    return;
  }

  try {
    // Check login uniqueness (exclude self)
    const existing = await adminDb().findUnique({ where: { login } });
    if (existing && existing.id !== id) {
      res.status(409).json({ error: 'Login already taken by another user' });
      return;
    }

    const updateData: Record<string, unknown> = { login };
    if (userRole) updateData.role = userRole;
    if (password) {
      if (password.length < 6) {
        res.status(400).json({ error: 'password must be at least 6 characters' });
        return;
      }
      updateData.passwordHash = bcrypt.hashSync(password, 10);
    }

    const user = await adminDb().update({
      where: { id },
      data: updateData,
      select: { id: true, login: true, role: true, createdAt: true },
    });

    res.json({ user });
  } catch (err) {
    console.error('PUT /api/admin/users/:id error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id — delete user
adminUsersRouter.delete('/:id', async (req: AdminRequest, res: Response) => {
  const id = Number(req.params.id);

  if (id === req.adminId) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }

  try {
    // Ensure at least one superadmin remains
    const target = await adminDb().findUnique({ where: { id } });
    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (target.role === 'superadmin') {
      const superadminCount = await adminDb().count({ where: { role: 'superadmin' } });
      if (superadminCount <= 1) {
        res.status(400).json({ error: 'Cannot delete the last superadmin' });
        return;
      }
    }

    await adminDb().delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/users/:id error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});
