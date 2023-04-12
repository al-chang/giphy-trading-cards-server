import { Express, Request, Response } from "express";
import sessionCheck from "../middleware/sessionCheck";
import prisma from "../prisma";
import { getRandomGIFs } from "../services/giphyService";
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

const getUserCards = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const cards = await prisma.card.findMany({
    where: {
      ownerId: userId,
    },
  });
  res.json(cards);
};

const openPack = async (req: Request, res: Response) => {
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
  const newCardGif = await getRandomGIFs(
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

const getPacks = async (req: Request, res: Response) => {
  const packs = await prisma.pack.findMany();
  res.json(packs);
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
  // Cards operations
  app.get("/api/cards", sessionCheck, getCurrentUserCards);
  app.get("/api/cards/:userId", getUserCards);

  // Packs operations
  app.get("/api/packs", getPacks);
  app.post("/api/packs", adminCheck, createPack);
  app.put("/api/packs/:packId", adminCheck, updatePack);

  app.post("/api/packs/open/:packId", sessionCheck, openPack);
};
