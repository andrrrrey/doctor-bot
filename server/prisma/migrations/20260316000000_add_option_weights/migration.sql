-- AlterTable
ALTER TABLE "AnswerOption" ADD COLUMN "weights" JSONB NOT NULL DEFAULT '{}';
