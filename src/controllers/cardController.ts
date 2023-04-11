import { Express, Request, Response } from "express";
import sessionCheck from "../middleware/sessionCheck";
import prisma from "../prisma";
import { getRandomGIF } from "../services/giphyService";

const getCurrentUserCards = async (req: Request, res: Response) => {
  const { user } = req.session;
  const cards = await prisma.card.findMany({
    where: {
      ownerId: user!.id,
    },
  });
  res.send(cards);
};

export const getUserCards = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const cards = await prisma.card.findMany({
    where: {
      ownerId: userId,
    },
  });
  res.send(cards);
};

export const openPack = async (req: Request, res: Response) => {
  const { user } = req.session;
  const { packId } = req.params;
  const pack = await prisma.pack.findUnique({
    where: {
      id: packId,
    },
  });
  if (!pack) {
    res.sendStatus(404);
    return;
  }
  const userCoins = await prisma.user.findUnique({
    where: {
      id: user!.id,
    },
    select: {
      coins: true,
    },
  });
  if (userCoins!.coins < pack.price) {
    res.sendStatus(403);
    return;
  }
  const newCardGif = await getRandomGIF(
    pack.tags[Math.floor(Math.random() * pack.tags.length)]
  );
  const newCard = await prisma.card.create({
    data: {
      gif: newCardGif,
      ownerId: user!.id,
      packId: pack.id,
    },
  });
  res.json(newCard);
};

export default (app: Express) => {
  app.get("/api/cards", sessionCheck, getCurrentUserCards);
  app.get("/api/cards/:userId", getUserCards);
  app.post("/api/cards/open-pack/:pack-id", sessionCheck, openPack);
};
