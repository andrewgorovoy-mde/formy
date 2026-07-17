-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AlterTable: add owner to Form
ALTER TABLE "Form" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "Form_userId_idx" ON "Form"("userId");
