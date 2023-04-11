/*
  Warnings:

  - You are about to drop the column `keywords` on the `Pack` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Pack" DROP COLUMN "keywords",
ADD COLUMN     "tags" TEXT[];
