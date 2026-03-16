-- CreateTable
CREATE TABLE "QuestionnaireVersion" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "description" TEXT,
    "snapshot" JSONB NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionnaireVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireVersion_version_key" ON "QuestionnaireVersion"("version");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireVersion_hash_key" ON "QuestionnaireVersion"("hash");

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN "versionId" TEXT;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuestionnaireVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
