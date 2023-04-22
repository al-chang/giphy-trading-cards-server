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
  const cardName = req.query.cardName as string;
  const following = req.query.following as string;

  if (following && !req.session.user) {
    return res.status(401).json({
      message: "You must be logged in to see cards from users you follow",
    });
  }

  const followingUsersIds = await prisma.follows.findMany({
    where: {
      followerId: req.session.user?.id,
    },
    select: {
      followingId: true,
    },
  });

  const [cards, total] = await prisma.$transaction([
    prisma.card.findMany({
      skip: offset,
      take: limit,
      where: {
        ownerId: following
          ? {
              in: followingUsersIds.map((user) => user.followingId),
            }
          : ownerId
          ? ownerId
          : undefined,
        packId: packId ? packId : undefined,
        name: cardName ? { contains: cardName } : undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.card.count({
      where: {
        ownerId: following
          ? {
              in: followingUsersIds.map((user) => user.followingId),
            }
          : ownerId
          ? ownerId
          : undefined,
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
        name: randomword(3).join(" "),
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

const getPack = async (req: Request, res: Response) => {
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
  res.json(pack);
};

export const createPack = async (req: Request, res: Response) => {
  const { name, price, tags } = req.body as {
    name: string;
    price: number;
    tags: string[];
  };

  const { gif } = await getRandomGIFs(
    tags[Math.floor(Math.random() * tags.length)]
  );
  const newPack = await prisma.pack.create({
    data: {
      name,
      price,
      tags,
      coverGif: gif,
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

const getCustomCards = async (req: Request, res: Response) => {
  const { term } = req.query;
  if (!term) {
    res.sendStatus(400);
    return;
  }

  const cardRequests = Array.from({ length: 12 }, () =>
    getRandomGIFs(term as string)
  );
  const data = await Promise.all(cardRequests);
  res.json(data);
};

const createCustomCard = async (req: Request, res: Response) => {
  const { user } = req.session;
  const { gif, source } = req.body as { gif: string; source: string };

  const giphyRegex =
    /https:\/\/media[0-9].giphy.com\/media\/[a-zA-Z0-9]+\/giphy.gif/;
  if (!giphyRegex.test(gif)) {
    res.sendStatus(400);
    return;
  }

  const giphySourceRegex = /https:\/\/giphy.com\/gifs\/[a-zA-Z0-9]+/;
  if (!giphySourceRegex.test(source)) {
    res.sendStatus(400);
    return;
  }

  const newCard = await prisma.card.create({
    data: {
      gif,
      name: randomword(3).join(" "),
      ownerId: user!.id,
      source,
    },
  });
  res.json(newCard);
};

export default (app: Express) => {
  // Cards operations
  app.get("/api/cards", getCards);
  app.get("/api/cards/:cardId", getCard);

  // Packs operations
  app.get("/api/packs", getPacks);
  app.get("/api/packs/:packId", getPack);
  app.post("/api/packs", adminCheck, createPack);
  app.put("/api/packs/:packId", adminCheck, updatePack);

  app.post("/api/packs/open/:packId", sessionCheck, openPack);

  app.get("/api/custom/cards", getCustomCards);
  app.post("/api/custom/cards", sessionCheck, createCustomCard);
};
