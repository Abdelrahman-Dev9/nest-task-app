-- CreateTable
CREATE TABLE "TaskImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT NOT NULL,

    CONSTRAINT "TaskImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskImage_taskId_idx" ON "TaskImage"("taskId");

-- AddForeignKey
ALTER TABLE "TaskImage" ADD CONSTRAINT "TaskImage_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing single-image rows into TaskImage
INSERT INTO "TaskImage" ("id", "url", "publicId", "sortOrder", "createdAt", "taskId")
SELECT gen_random_uuid()::text, "imageUrl", "imagePublicId", 0, CURRENT_TIMESTAMP, "id"
FROM "Task"
WHERE "imageUrl" IS NOT NULL AND "imagePublicId" IS NOT NULL;

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "imagePublicId",
DROP COLUMN "imageUrl";
