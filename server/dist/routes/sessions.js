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
exports.sessionsRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
exports.sessionsRouter = (0, express_1.Router)();
// POST /api/sessions — create anonymous session
exports.sessionsRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId, source, theme } = req.body;
    try {
        const session = yield db_1.prisma.session.create({
            data: { projectId, source, theme },
        });
        res.status(201).json({ id: session.id });
    }
    catch (err) {
        console.error('POST /api/sessions error:', err);
        res.status(500).json({ error: 'Failed to create session' });
    }
}));
// PATCH /api/sessions/:id/complete — mark session completed
exports.sessionsRouter.patch('/:id/complete', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield db_1.prisma.session.update({ where: { id }, data: { completed: true } });
        res.json({ ok: true });
    }
    catch (err) {
        console.error('PATCH /api/sessions/:id/complete error:', err);
        res.status(500).json({ error: 'Failed to update session' });
    }
}));
//# sourceMappingURL=sessions.js.map