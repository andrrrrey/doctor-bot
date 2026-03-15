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
exports.adminSubmissionsRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../db");
const adminAuth_1 = require("../../middleware/adminAuth");
exports.adminSubmissionsRouter = (0, express_1.Router)();
exports.adminSubmissionsRouter.use(adminAuth_1.adminAuth);
// GET /api/admin/submissions
// Query params: page, limit, dateFrom, dateTo, bitrixStatus, hasFile
exports.adminSubmissionsRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const where = {};
    if (req.query.dateFrom || req.query.dateTo) {
        where.createdAt = {};
        if (req.query.dateFrom) {
            where.createdAt.gte = new Date(req.query.dateFrom);
        }
        if (req.query.dateTo) {
            const to = new Date(req.query.dateTo);
            to.setHours(23, 59, 59, 999);
            where.createdAt.lte = to;
        }
    }
    if (req.query.bitrixStatus) {
        where.bitrixStatus = req.query.bitrixStatus;
    }
    if (req.query.hasFile === 'true') {
        where.fileUrl = { not: null };
    }
    else if (req.query.hasFile === 'false') {
        where.fileUrl = null;
    }
    try {
        const [submissions, total] = yield Promise.all([
            db_1.prisma.submission.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: { session: { select: { id: true, source: true, theme: true, completed: true } } },
            }),
            db_1.prisma.submission.count({ where }),
        ]);
        res.json({
            submissions,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    }
    catch (err) {
        console.error('GET /api/admin/submissions error:', err);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
}));
// GET /api/admin/submissions/:id
exports.adminSubmissionsRouter.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const submission = yield db_1.prisma.submission.findUnique({
            where: { id: req.params.id },
            include: { session: true },
        });
        if (!submission) {
            res.status(404).json({ error: 'Submission not found' });
            return;
        }
        res.json({ submission });
    }
    catch (err) {
        console.error('GET /api/admin/submissions/:id error:', err);
        res.status(500).json({ error: 'Failed to fetch submission' });
    }
}));
//# sourceMappingURL=submissions.js.map