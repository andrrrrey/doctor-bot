import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'doctor-bot-admin-secret-change-in-production';

export interface AdminRequest extends Request {
  adminId?: number;
  adminRole?: string;
}

export function adminAuth(req: AdminRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { adminId: number; role?: string };
    req.adminId = payload.adminId;
    req.adminRole = payload.role ?? 'superadmin';
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireSuperadmin(req: AdminRequest, res: Response, next: NextFunction): void {
  if (req.adminRole !== 'superadmin') {
    res.status(403).json({ error: 'Access denied: superadmin only' });
    return;
  }
  next();
}

export function signAdminToken(adminId: number, role: string): string {
  return jwt.sign({ adminId, role }, JWT_SECRET, { expiresIn: '24h' });
}
