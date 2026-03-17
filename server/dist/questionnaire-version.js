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
exports.buildQuestionnaireSnapshot = buildQuestionnaireSnapshot;
exports.hashSnapshot = hashSnapshot;
exports.getOrCreateVersion = getOrCreateVersion;
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("./db");
/**
 * Reads all questions (including inactive) from DB and returns a sorted snapshot.
 * The snapshot captures the complete state so history is accurate even for inactive questions.
 */
function buildQuestionnaireSnapshot() {
    return __awaiter(this, void 0, void 0, function* () {
        const questions = yield db_1.prisma.question.findMany({
            orderBy: { order: 'asc' },
            include: { options: { orderBy: { order: 'asc' } } },
        });
        return questions.map((q) => ({
            id: q.id,
            question: q.question,
            type: q.type,
            order: q.order,
            isActive: q.isActive,
            parentId: q.parentId,
            conditions: q.conditions,
            options: q.options.map((o) => {
                var _a;
                return ({
                    value: o.value,
                    order: o.order,
                    weights: ((_a = o.weights) !== null && _a !== void 0 ? _a : {}),
                });
            }),
        }));
    });
}
function hashSnapshot(snapshot) {
    const str = JSON.stringify(snapshot);
    return crypto_1.default.createHash('sha256').update(str).digest('hex');
}
/**
 * Finds an existing version with the same hash, or creates a new one.
 * This deduplicates versions so repeated submissions with unchanged questionnaire
 * all point to the same version record.
 */
function getOrCreateVersion(description) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const snapshot = yield buildQuestionnaireSnapshot();
        const hash = hashSnapshot(snapshot);
        const existing = yield db_1.prisma.questionnaireVersion.findUnique({ where: { hash } });
        if (existing)
            return existing.id;
        const agg = yield db_1.prisma.questionnaireVersion.aggregate({ _max: { version: true } });
        const nextVersion = ((_a = agg._max.version) !== null && _a !== void 0 ? _a : 0) + 1;
        const created = yield db_1.prisma.questionnaireVersion.create({
            data: {
                version: nextVersion,
                description: description !== null && description !== void 0 ? description : null,
                snapshot: snapshot,
                hash,
            },
        });
        return created.id;
    });
}
//# sourceMappingURL=questionnaire-version.js.map