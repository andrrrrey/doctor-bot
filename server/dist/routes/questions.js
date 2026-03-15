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
exports.questionsRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
exports.questionsRouter = (0, express_1.Router)();
// GET /api/questions — all active questions with options, structured with follow-ups
exports.questionsRouter.get('/', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const all = yield db_1.prisma.question.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' },
            include: { options: { orderBy: { order: 'asc' } } },
        });
        // Separate top-level and follow-up questions
        const topLevel = all.filter((q) => !q.parentId);
        const followUps = all.filter((q) => q.parentId);
        const questions = topLevel.map((q) => ({
            id: q.id,
            question: q.question,
            type: q.type,
            options: q.options.map((o) => o.value),
            followUpQuestions: followUps
                .filter((f) => f.parentId === q.id)
                .map((f) => ({
                id: f.id,
                dependencyId: f.parentId,
                conditions: f.conditions,
                question: f.question,
                type: f.type,
                options: f.options.map((o) => o.value),
            })),
        }));
        res.json({ questions });
    }
    catch (err) {
        console.error('GET /api/questions error:', err);
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
}));
//# sourceMappingURL=questions.js.map