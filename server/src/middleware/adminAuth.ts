import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'doctor-bot-admin-secret-change-in-production';

export interface AdminRequest extends Request {
  adminId?: number;
}

export function adminAuth(req: AdminRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { adminId: number };
    req.adminId = payload.adminId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function signAdminToken(adminId: number): string {
  return jwt.sign({ adminId }, JWT_SECRET, { expiresIn: '24h' });
}
