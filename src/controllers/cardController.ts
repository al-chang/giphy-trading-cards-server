import { Express, Request, Response } from "express";
import sessionCheck from "../middleware/sessionCheck";
import prisma from "../prisma";
import { getRandomGIFs } from "../services/giphyService";
import adminCheck from "../middleware/adminCheck";
import randomword from "random-words";

const getCards = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  // Filters
  const ownerId = req.query.ownerId as string;
  const packId = req.query.packId as string;

  const [cards, total] = await prisma.$transaction([
    prisma.card.findMany({
      skip: offset,
      take: limit,
      where: {
        ownerId: ownerId ? ownerId : undefined,
        packId: packId ? packId : undefined,
      },
    }),
    prisma.card.count({
      where: {
        ownerId: ownerId ? ownerId : undefined,
        packId: packId ? packId : undefined,
      },
    }),
  ]);

  const next = total > page * limit ? page + 1 : null;
  const prev = page > 1 ? page - 1 : null;

  res.json({
    data: cards,
    total,
    limit,
    page,
    next,
    prev,
  });
};

const getCard = async (req: Request, res: Response) => {
  const { cardId } = req.params;
  const card = await prisma.card.findUnique({
    where: {
      id: cardId,
    },
    include: {
      pack: true,
      owner: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  if (!card) {
    res.sendStatus(404);
    return;
  }

  res.json(card);
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
  const { gif, source } = await getRandomGIFs(
    pack.tags[Math.floor(Math.random() * pack.tags.length)]
  );
  const [newCard] = await prisma.$transaction([
    prisma.card.create({
      data: {
        gif,
        // @ts-ignore
        name: randomword(),
        ownerId: user!.id,
        packId: pack.id,
        source,
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
  app.get("/api/cards", getCards);
  app.get("/api/cards/:cardId", getCard);

  // Packs operations
  app.get("/api/packs", getPacks);
  app.post("/api/packs", adminCheck, createPack);
  app.put("/api/packs/:packId", adminCheck, updatePack);

  app.post("/api/packs/open/:packId", sessionCheck, openPack);
};
