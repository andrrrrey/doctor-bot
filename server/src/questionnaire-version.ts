import crypto from 'crypto';
import { prisma } from './db';

export type QuestionSnapshot = {
  id: string;
  question: string;
  type: string;
  order: number;
  isActive: boolean;
  parentId: string | null;
  conditions: string[];
  options: { value: string; order: number; weights: Record<string, number> }[];
};

/**
 * Reads all questions (including inactive) from DB and returns a sorted snapshot.
 * The snapshot captures the complete state so history is accurate even for inactive questions.
 */
export async function buildQuestionnaireSnapshot(): Promise<QuestionSnapshot[]> {
  const questions = await prisma.question.findMany({
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
    options: q.options.map((o) => ({
      value: o.value,
      order: o.order,
      weights: (o.weights ?? {}) as Record<string, number>,
    })),
  }));
}

export function hashSnapshot(snapshot: QuestionSnapshot[]): string {
  const str = JSON.stringify(snapshot);
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Finds an existing version with the same hash, or creates a new one.
 * This deduplicates versions so repeated submissions with unchanged questionnaire
 * all point to the same version record.
 */
export async function getOrCreateVersion(description?: string): Promise<string> {
  const snapshot = await buildQuestionnaireSnapshot();
  const hash = hashSnapshot(snapshot);

  const existing = await prisma.questionnaireVersion.findUnique({ where: { hash } });
  if (existing) return existing.id;

  const agg = await prisma.questionnaireVersion.aggregate({ _max: { version: true } });
  const nextVersion = (agg._max.version ?? 0) + 1;

  const created = await prisma.questionnaireVersion.create({
    data: {
      version: nextVersion,
      description: description ?? null,
      snapshot: snapshot as object[],
      hash,
    },
  });

  return created.id;
}
