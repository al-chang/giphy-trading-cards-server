import { Express, Request, Response } from "express";
import sessionCheck from "../middleware/sessionCheck";
import prisma from "../prisma";
import { getRandomGIF } from "../services/giphyService";
import adminCheck from "../middleware/adminCheck";

const getCurrentUserCards = async (req: Request, res: Response) => {
  const { user } = req.session;
  const cards = await prisma.card.findMany({
    where: {
      ownerId: user!.id,
    },
  });
  res.json(cards);
};

export const getUserCards = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const cards = await prisma.card.findMany({
    where: {
      ownerId: userId,
    },
  });
  res.json(cards);
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
  const [newCard] = await prisma.$transaction([
    prisma.card.create({
      data: {
        gif: newCardGif,
        ownerId: user!.id,
        packId: pack.id,
      },
    }),
    prisma.user.update({
      where: {
        id: user!.id,
      },
      data: {
        coins: {
          decrement: pack.price,
        },
      },
    }),
  ]);

  res.json(newCard);
};

export const createPack = async (req: Request, res: Response) => {
  const { name, price, tags, coverGif } = req.body as {
    name: string;
    price: number;
    tags: string[];
    coverGif: string;
  };
  const newPack = await prisma.pack.create({
    data: {
      name,
      price,
      tags,
      coverGif,
    },
  });
  res.json(newPack);
};

export const updatePack = async (req: Request, res: Response) => {
  const { packId } = req.params;
  const { name, price, tags, coverGif } = req.body as {
    name: string;
    price: number;
    tags: string[];
    coverGif: string;
  };
  const updatedPack = await prisma.pack.update({
    where: {
      id: packId,
    },
    data: {
      name,
      price,
      tags,
      coverGif,
    },
  });
  res.json(updatedPack);
};

export default (app: Express) => {
  app.get("/api/cards", sessionCheck, getCurrentUserCards);
  app.get("/api/cards/:userId", getUserCards);
  app.post("/api/cards/open-pack/:pack-id", sessionCheck, openPack);
  app.post("/api/cards/create-pack", adminCheck, createPack);
  app.put("/api/cards/update-pack/:pack-id", adminCheck, updatePack);
};
