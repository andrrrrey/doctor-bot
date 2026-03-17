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
exports.adminVersionsRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../db");
const adminAuth_1 = require("../../middleware/adminAuth");
const questionnaire_version_1 = require("../../questionnaire-version");
exports.adminVersionsRouter = (0, express_1.Router)();
exports.adminVersionsRouter.use(adminAuth_1.adminAuth);
exports.adminVersionsRouter.use(adminAuth_1.requireSuperadmin);
// GET /api/admin/versions — list all versions with submission counts
exports.adminVersionsRouter.get('/', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const versions = yield db_1.prisma.questionnaireVersion.findMany({
            orderBy: { version: 'desc' },
            include: { _count: { select: { submissions: true } } },
        });
        res.json({
            versions: versions.map((v) => ({
                id: v.id,
                version: v.version,
                description: v.description,
                submissionCount: v._count.submissions,
                createdAt: v.createdAt,
            })),
        });
    }
    catch (err) {
        console.error('GET /api/admin/versions error:', err);
        res.status(500).json({ error: 'Failed to fetch versions' });
    }
}));
// GET /api/admin/versions/current — snapshot of the current (live) questionnaire state
exports.adminVersionsRouter.get('/current', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const snapshot = yield (0, questionnaire_version_1.buildQuestionnaireSnapshot)();
        res.json({ snapshot });
    }
    catch (err) {
        console.error('GET /api/admin/versions/current error:', err);
        res.status(500).json({ error: 'Failed to build snapshot' });
    }
}));
// GET /api/admin/versions/:id — full snapshot for a specific version
exports.adminVersionsRouter.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const v = yield db_1.prisma.questionnaireVersion.findUnique({
            where: { id: req.params.id },
            include: { _count: { select: { submissions: true } } },
        });
        if (!v) {
            res.status(404).json({ error: 'Version not found' });
            return;
        }
        res.json({
            id: v.id,
            version: v.version,
            description: v.description,
            snapshot: v.snapshot,
            submissionCount: v._count.submissions,
            createdAt: v.createdAt,
        });
    }
    catch (err) {
        console.error('GET /api/admin/versions/:id error:', err);
        res.status(500).json({ error: 'Failed to fetch version' });
    }
}));
// POST /api/admin/versions — manually save the current state as a named version
exports.adminVersionsRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { description } = req.body;
    try {
        const versionId = yield (0, questionnaire_version_1.getOrCreateVersion)(description);
        const v = yield db_1.prisma.questionnaireVersion.findUnique({ where: { id: versionId } });
        res.status(201).json({ id: versionId, version: v === null || v === void 0 ? void 0 : v.version, description: v === null || v === void 0 ? void 0 : v.description, createdAt: v === null || v === void 0 ? void 0 : v.createdAt });
    }
    catch (err) {
        console.error('POST /api/admin/versions error:', err);
        res.status(500).json({ error: 'Failed to save version' });
    }
}));
//# sourceMappingURL=versions.js.map