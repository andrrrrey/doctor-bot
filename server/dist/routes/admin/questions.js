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
exports.adminQuestionsRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../db");
const adminAuth_1 = require("../../middleware/adminAuth");
exports.adminQuestionsRouter = (0, express_1.Router)();
exports.adminQuestionsRouter.use(adminAuth_1.adminAuth);
// GET /api/admin/questions — all questions (including inactive), with options
exports.adminQuestionsRouter.get('/', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const questions = yield db_1.prisma.question.findMany({
            orderBy: { order: 'asc' },
            include: { options: { orderBy: { order: 'asc' } } },
        });
        res.json({ questions });
    }
    catch (err) {
        console.error('GET /api/admin/questions error:', err);
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
}));
// GET /api/admin/questions/:id
exports.adminQuestionsRouter.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const question = yield db_1.prisma.question.findUnique({
            where: { id: req.params.id },
            include: { options: { orderBy: { order: 'asc' } } },
        });
        if (!question) {
            res.status(404).json({ error: 'Question not found' });
            return;
        }
        res.json({ question });
    }
    catch (err) {
        console.error('GET /api/admin/questions/:id error:', err);
        res.status(500).json({ error: 'Failed to fetch question' });
    }
}));
// POST /api/admin/questions — create question
exports.adminQuestionsRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id, question, type, order, isActive, parentId, conditions, options } = req.body;
    if (!id || !question || !type) {
        res.status(400).json({ error: 'id, question, and type are required' });
        return;
    }
    const validTypes = ['number', 'radio', 'checkbox', 'text', 'file'];
    if (!validTypes.includes(type)) {
        res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
        return;
    }
    try {
        const maxOrder = yield db_1.prisma.question.aggregate({ _max: { order: true } });
        const newOrder = order !== null && order !== void 0 ? order : ((_a = maxOrder._max.order) !== null && _a !== void 0 ? _a : 0) + 1;
        const created = yield db_1.prisma.question.create({
            data: {
                id,
                question,
                type,
                order: newOrder,
                isActive: isActive !== null && isActive !== void 0 ? isActive : true,
                parentId: parentId !== null && parentId !== void 0 ? parentId : null,
                conditions: conditions !== null && conditions !== void 0 ? conditions : [],
                options: (options === null || options === void 0 ? void 0 : options.length)
                    ? { create: options.map((value, index) => ({ value, order: index })) }
                    : undefined,
            },
            include: { options: { orderBy: { order: 'asc' } } },
        });
        res.status(201).json({ question: created });
    }
    catch (err) {
        console.error('POST /api/admin/questions error:', err);
        res.status(500).json({ error: 'Failed to create question' });
    }
}));
// PUT /api/admin/questions/:id — full update
exports.adminQuestionsRouter.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { question, type, order, isActive, parentId, conditions } = req.body;
    const validTypes = ['number', 'radio', 'checkbox', 'text', 'file'];
    if (type && !validTypes.includes(type)) {
        res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
        return;
    }
    try {
        const updated = yield db_1.prisma.question.update({
            where: { id: req.params.id },
            data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (question !== undefined && { question })), (type !== undefined && { type })), (order !== undefined && { order })), (isActive !== undefined && { isActive })), (parentId !== undefined && { parentId: parentId || null })), (conditions !== undefined && { conditions })),
            include: { options: { orderBy: { order: 'asc' } } },
        });
        res.json({ question: updated });
    }
    catch (err) {
        console.error('PUT /api/admin/questions/:id error:', err);
        res.status(500).json({ error: 'Failed to update question' });
    }
}));
// PATCH /api/admin/questions/:id/toggle — toggle isActive
exports.adminQuestionsRouter.patch('/:id/toggle', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const current = yield db_1.prisma.question.findUnique({ where: { id: req.params.id } });
        if (!current) {
            res.status(404).json({ error: 'Question not found' });
            return;
        }
        const updated = yield db_1.prisma.question.update({
            where: { id: req.params.id },
            data: { isActive: !current.isActive },
        });
        res.json({ isActive: updated.isActive });
    }
    catch (err) {
        console.error('PATCH /api/admin/questions/:id/toggle error:', err);
        res.status(500).json({ error: 'Failed to toggle question' });
    }
}));
// PATCH /api/admin/questions/reorder — update order for multiple questions
exports.adminQuestionsRouter.patch('/reorder', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { items } = req.body;
    if (!Array.isArray(items)) {
        res.status(400).json({ error: 'items must be an array of {id, order}' });
        return;
    }
    try {
        yield Promise.all(items.map(({ id, order }) => db_1.prisma.question.update({ where: { id }, data: { order } })));
        res.json({ ok: true });
    }
    catch (err) {
        console.error('PATCH /api/admin/questions/reorder error:', err);
        res.status(500).json({ error: 'Failed to reorder questions' });
    }
}));
// DELETE /api/admin/questions/:id
exports.adminQuestionsRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db_1.prisma.question.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }
    catch (err) {
        console.error('DELETE /api/admin/questions/:id error:', err);
        res.status(500).json({ error: 'Failed to delete question' });
    }
}));
// ── Answer options ───────────────────────────────────────────────────────────
// PUT /api/admin/questions/:id/options — replace all options for a question
exports.adminQuestionsRouter.put('/:id/options', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { options } = req.body;
    if (!Array.isArray(options)) {
        res.status(400).json({ error: 'options must be an array of strings' });
        return;
    }
    try {
        // Delete existing options, then recreate
        yield db_1.prisma.answerOption.deleteMany({ where: { questionId: req.params.id } });
        const created = yield db_1.prisma.answerOption.createMany({
            data: options.map((value, index) => ({ questionId: req.params.id, value, order: index })),
        });
        res.json({ count: created.count });
    }
    catch (err) {
        console.error('PUT /api/admin/questions/:id/options error:', err);
        res.status(500).json({ error: 'Failed to update options' });
    }
}));
//# sourceMappingURL=questions.js.map