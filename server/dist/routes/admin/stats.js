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
exports.adminStatsRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../db");
const adminAuth_1 = require("../../middleware/adminAuth");
exports.adminStatsRouter = (0, express_1.Router)();
exports.adminStatsRouter.use(adminAuth_1.adminAuth);
// GET /api/admin/stats
// Query params: dateFrom, dateTo
exports.adminStatsRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const dateFilter = {};
    if (req.query.dateFrom || req.query.dateTo) {
        dateFilter.createdAt = {};
        if (req.query.dateFrom) {
            dateFilter.createdAt.gte = new Date(req.query.dateFrom);
        }
        if (req.query.dateTo) {
            const to = new Date(req.query.dateTo);
            to.setHours(23, 59, 59, 999);
            dateFilter.createdAt.lte = to;
        }
    }
    try {
        const [totalSessions, completedSessions, totalSubmissions, bitrixSent, bitrixError, submissionsWithFile,] = yield Promise.all([
            db_1.prisma.session.count({ where: dateFilter }),
            db_1.prisma.session.count({ where: Object.assign(Object.assign({}, dateFilter), { completed: true }) }),
            db_1.prisma.submission.count({ where: dateFilter }),
            db_1.prisma.submission.count({ where: Object.assign(Object.assign({}, dateFilter), { bitrixStatus: 'sent' }) }),
            db_1.prisma.submission.count({ where: Object.assign(Object.assign({}, dateFilter), { bitrixStatus: 'error' }) }),
            db_1.prisma.submission.count({ where: Object.assign(Object.assign({}, dateFilter), { fileUrl: { not: null } }) }),
        ]);
        // Conversion rates
        const completionRate = totalSessions > 0
            ? Math.round((completedSessions / totalSessions) * 100)
            : 0;
        const submissionRate = completedSessions > 0
            ? Math.round((totalSubmissions / completedSessions) * 100)
            : 0;
        const bitrixRate = totalSubmissions > 0
            ? Math.round((bitrixSent / totalSubmissions) * 100)
            : 0;
        res.json({
            sessions: {
                total: totalSessions,
                completed: completedSessions,
                completionRate,
            },
            submissions: {
                total: totalSubmissions,
                withFile: submissionsWithFile,
                submissionRate,
            },
            bitrix: {
                sent: bitrixSent,
                error: bitrixError,
                pending: totalSubmissions - bitrixSent - bitrixError,
                sentRate: bitrixRate,
            },
            conversions: [
                { stage: 'Начали опрос', count: totalSessions, rate: 100 },
                { stage: 'Завершили опрос', count: completedSessions, rate: completionRate },
                { stage: 'Оставили контакты', count: totalSubmissions, rate: submissionRate },
                { stage: 'Отправлено в Bitrix', count: bitrixSent, rate: bitrixRate },
            ],
        });
    }
    catch (err) {
        console.error('GET /api/admin/stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
}));
//# sourceMappingURL=stats.js.map