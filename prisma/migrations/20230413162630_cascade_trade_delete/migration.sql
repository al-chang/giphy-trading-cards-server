-- DropForeignKey
ALTER TABLE "CardsInTrades" DROP CONSTRAINT "CardsInTrades_cardId_fkey";

-- DropForeignKey
ALTER TABLE "CardsInTrades" DROP CONSTRAINT "CardsInTrades_tradeId_fkey";

-- AddForeignKey
ALTER TABLE "CardsInTrades" ADD CONSTRAINT "CardsInTrades_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardsInTrades" ADD CONSTRAINT "CardsInTrades_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
