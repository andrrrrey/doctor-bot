"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAdminToken = exports.requireSuperadmin = exports.adminAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = (_a = process.env.JWT_SECRET) !== null && _a !== void 0 ? _a : 'doctor-bot-admin-secret-change-in-production';
function adminAuth(req, res, next) {
    var _a;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.adminId = payload.adminId;
        req.adminRole = (_a = payload.role) !== null && _a !== void 0 ? _a : 'superadmin';
        next();
    }
    catch (_b) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
exports.adminAuth = adminAuth;
function requireSuperadmin(req, res, next) {
    if (req.adminRole !== 'superadmin') {
        res.status(403).json({ error: 'Access denied: superadmin only' });
        return;
    }
    next();
}
exports.requireSuperadmin = requireSuperadmin;
function signAdminToken(adminId, role) {
    return jsonwebtoken_1.default.sign({ adminId, role }, JWT_SECRET, { expiresIn: '24h' });
}
exports.signAdminToken = signAdminToken;
//# sourceMappingURL=adminAuth.js.map