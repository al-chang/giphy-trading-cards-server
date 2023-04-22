-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_packId_fkey";

-- AlterTable
ALTER TABLE "Card" ALTER COLUMN "packId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Pack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
