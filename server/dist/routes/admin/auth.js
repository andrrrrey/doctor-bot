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
exports.adminAuthRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../../db");
const adminAuth_1 = require("../../middleware/adminAuth");
exports.adminAuthRouter = (0, express_1.Router)();
// POST /api/admin/auth/login
exports.adminAuthRouter.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { login, password } = req.body;
    if (!login || !password) {
        res.status(400).json({ error: 'login and password are required' });
        return;
    }
    try {
        const admin = yield db_1.prisma
            .admin.findUnique({ where: { login } });
        if (!admin || !bcryptjs_1.default.compareSync(password, admin.passwordHash)) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const token = (0, adminAuth_1.signAdminToken)(admin.id);
        res.json({ token });
    }
    catch (err) {
        console.error('POST /api/admin/auth/login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// GET /api/admin/auth/me — check token validity
exports.adminAuthRouter.get('/me', adminAuth_1.adminAuth, (req, res) => {
    res.json({ adminId: req.adminId, ok: true });
});
// POST /api/admin/auth/change-password
exports.adminAuthRouter.post('/change-password', adminAuth_1.adminAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const admin = yield db_1.prisma
            .admin.findUnique({ where: { id: req.adminId } });
        if (!admin || !bcryptjs_1.default.compareSync(currentPassword, admin.passwordHash)) {
            res.status(401).json({ error: 'Current password is incorrect' });
            return;
        }
        const passwordHash = bcryptjs_1.default.hashSync(newPassword, 10);
        yield db_1.prisma
            .admin.update({ where: { id: req.adminId }, data: { passwordHash } });
        res.json({ ok: true });
    }
    catch (err) {
        console.error('POST /api/admin/auth/change-password error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
//# sourceMappingURL=auth.js.map