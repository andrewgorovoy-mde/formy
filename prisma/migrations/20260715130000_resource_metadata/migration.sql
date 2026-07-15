-- AlterTable: resource/registry metadata for searchable, indexable forms
ALTER TABLE "Form" ADD COLUMN "category" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Form" ADD COLUMN "tags" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Form" ADD COLUMN "resourceUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Form" ADD COLUMN "ogTitle" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Form" ADD COLUMN "ogDescription" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Form" ADD COLUMN "ogImage" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Form" ADD COLUMN "ogSiteName" TEXT NOT NULL DEFAULT '';
