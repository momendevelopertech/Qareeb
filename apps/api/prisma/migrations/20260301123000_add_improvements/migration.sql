-- CreateEnum
CREATE TYPE "ImprovementStatus" AS ENUM ('pending', 'planned', 'completed', 'rejected');

-- CreateTable
CREATE TABLE "improvements" (
    "id" UUID NOT NULL,
    "suggestion_text" TEXT NOT NULL,
    "name" VARCHAR(120),
    "email" VARCHAR(255),
    "status" "ImprovementStatus" NOT NULL DEFAULT 'pending',
    "internal_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "improvements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "improvements_status_idx" ON "improvements"("status");

-- CreateIndex
CREATE INDEX "improvements_created_at_idx" ON "improvements"("created_at");
