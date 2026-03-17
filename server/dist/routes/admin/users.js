"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminUsersRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../../db");
const adminAuth_1 = require("../../middleware/adminAuth");
exports.adminUsersRouter = (0, express_1.Router)();
exports.adminUsersRouter.use(adminAuth_1.adminAuth);
exports.adminUsersRouter.use(adminAuth_1.requireSuperadmin);
function adminDb() {
    return db_1.prisma.admin;
}
// GET /api/admin/users — list all admin users
exports.adminUsersRouter.get('/', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield adminDb().findMany({
            select: { id: true, login: true, role: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        });
        res.json({ users });
    }
    catch (err) {
        console.error('GET /api/admin/users error:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
}));
// POST /api/admin/users — create new admin user (doctor or superadmin)
exports.adminUsersRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const existing = yield adminDb().findUnique({ where: { login } });
        if (existing) {
            res.status(409).json({ error: 'User with this login already exists' });
            return;
        }
        const passwordHash = bcryptjs_1.default.hashSync(password, 10);
        const user = yield adminDb().create({
            data: { login, passwordHash, role: userRole },
            select: { id: true, login: true, role: true, createdAt: true },
        });
        res.status(201).json({ user });
    }
    catch (err) {
        console.error('POST /api/admin/users error:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
}));
// PUT /api/admin/users/:id — update user (login, role, optionally password)
exports.adminUsersRouter.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const existing = yield adminDb().findUnique({ where: { login } });
        if (existing && existing.id !== id) {
            res.status(409).json({ error: 'Login already taken by another user' });
            return;
        }
        const updateData = { login };
        if (userRole)
            updateData.role = userRole;
        if (password) {
            if (password.length < 6) {
                res.status(400).json({ error: 'password must be at least 6 characters' });
                return;
            }
            updateData.passwordHash = bcryptjs_1.default.hashSync(password, 10);
        }
        const user = yield adminDb().update({
            where: { id },
            data: updateData,
            select: { id: true, login: true, role: true, createdAt: true },
        });
        res.json({ user });
    }
    catch (err) {
        console.error('PUT /api/admin/users/:id error:', err);
        res.status(500).json({ error: 'Failed to update user' });
    }
}));
// DELETE /api/admin/users/:id — delete user
exports.adminUsersRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    if (id === req.adminId) {
        res.status(400).json({ error: 'Cannot delete your own account' });
        return;
    }
    try {
        // Ensure at least one superadmin remains
        const target = yield adminDb().findUnique({ where: { id } });
        if (!target) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        if (target.role === 'superadmin') {
            const superadminCount = yield adminDb().count({ where: { role: 'superadmin' } });
            if (superadminCount <= 1) {
                res.status(400).json({ error: 'Cannot delete the last superadmin' });
                return;
            }
        }
        yield adminDb().delete({ where: { id } });
        res.json({ ok: true });
    }
    catch (err) {
        console.error('DELETE /api/admin/users/:id error:', err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
}));
//# sourceMappingURL=users.js.map