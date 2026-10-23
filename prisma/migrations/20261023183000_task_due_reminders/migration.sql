-- AlterTable
ALTER TABLE "Task" ADD COLUMN "dueAt" TIMESTAMP(3),
ADD COLUMN "remindBeforeMinutes" INTEGER;

-- CreateIndex
CREATE INDEX "Task_dueAt_idx" ON "Task"("dueAt");
