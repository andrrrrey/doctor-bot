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
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminSettingsRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../db");
const adminAuth_1 = require("../../middleware/adminAuth");
exports.adminSettingsRouter = (0, express_1.Router)();
exports.adminSettingsRouter.use(adminAuth_1.adminAuth);
// GET /api/admin/settings
exports.adminSettingsRouter.get('/', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rows = yield db_1.prisma.setting.findMany();
        const settings = {};
        rows.forEach((r) => { settings[r.key] = r.value; });
        res.json(settings);
    }
    catch (err) {
        console.error('GET /api/admin/settings error:', err);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
}));
// PUT /api/admin/settings
exports.adminSettingsRouter.put('/', adminAuth_1.requireSuperadmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const updates = req.body;
    if (typeof updates !== 'object' || Array.isArray(updates)) {
        res.status(400).json({ error: 'Body must be a key/value object' });
        return;
    }
    try {
        yield Promise.all(Object.entries(updates).map(([key, value]) => db_1.prisma.setting.upsert({
            where: { key },
            update: { value: String(value) },
            create: { key, value: String(value) },
        })));
        res.json({ ok: true });
    }
    catch (err) {
        console.error('PUT /api/admin/settings error:', err);
        res.status(500).json({ error: 'Failed to save settings' });
    }
}));
//# sourceMappingURL=settings.js.map