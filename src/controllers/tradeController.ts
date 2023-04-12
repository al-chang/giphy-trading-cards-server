import { Express, Request, Response } from "express";
import prisma from "../prisma";
import sessionCheck from "../middleware/sessionCheck";
import { TradeStatus } from "@prisma/client";

const getPendingTrades = async (req: Request, res: Response) => {
  const userId = req.session.user!.id;
  const trades = await prisma.trade.findMany({
    where: {
      OR: [
        {
          senderId: userId,
        },
        {
          receiverId: userId,
        },
      ],
      status: TradeStatus.PENDING,
    },
    select: {
      id: true,
      sender: {
        select: {
          id: true,
          email: true,
        },
      },
      receiver: {
        select: {
          id: true,
          email: true,
        },
      },
      cards: {
        select: {
          card: {
            select: {
              id: true,
              gif: true,
              ownerId: true,
            },
          },
        },
      },
    },
  });
  res.json(trades);
};

const getPendingTrade = async (req: Request, res: Response) => {
  const { tradeId } = req.params;
  if (!tradeId) {
    res.status(400).json({ message: "Missing tradeId" });
    return;
  }

  const trade = await prisma.trade.findUnique({
    where: {
      id: tradeId,
    },
    select: {
      sender: {
        select: {
          id: true,
        },
      },
      receiver: {
        select: {
          id: true,
        },
      },
      cards: {
        select: {
          card: {
            select: {
              id: true,
              gif: true,
              ownerId: true,
              pack: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
      status: true,
    },
  });

  if (trade?.status !== TradeStatus.PENDING) {
    res.status(400).json({ message: "Trade is not pending" });
    return;
  }

  res.json(trade);
};

const getTradeHistory = async (req: Request, res: Response) => {
  const userId = req.session.user!.id;
  const trades = await prisma.trade.findMany({
    where: {
      OR: [
        {
          senderId: userId,
        },
        {
          receiverId: userId,
        },
      ],
      status: {
        not: TradeStatus.PENDING,
      },
    },
    select: {
      id: true,
      sender: {
        select: {
          id: true,
        },
      },
      receiver: {
        select: {
          id: true,
        },
      },
      status: true,
    },
  });
  res.json(trades);
};

const sendTrade = async (req: Request, res: Response) => {
  const senderId = req.session.user!.id;
  const { userId: receiverId, cards } = req.body as {
    userId: string;
    cards: string[];
  };
  const insertedTrade = await prisma.trade.create({
    data: {
      senderId,
      receiverId,
      status: TradeStatus.PENDING,
      cards: {
        createMany: {
          data: cards.map((cardId) => ({ cardId })),
        },
      },
    },
    select: {
      id: true,
    },
  });
  res.json(insertedTrade.id);
};

const acceptTrade = async (req: Request, res: Response) => {
  const { tradeId } = req.params;
  if (!tradeId) {
    res.status(400).json({ message: "Missing tradeId" });
    return;
  }

  const trade = await prisma.trade.findUnique({
    where: {
      id: tradeId,
    },
    select: {
      senderId: true,
      receiverId: true,
      status: true,
      cards: {
        select: {
          cardId: true,
        },
      },
    },
  });

  if (!trade) {
    res.status(404).json({ message: "Trade not found" });
    return;
  }
  if (trade.status !== TradeStatus.PENDING) {
    res.status(400).json({ message: "Trade is not pending" });
    return;
  }

  const updateToAccept = prisma.trade.update({
    where: {
      id: tradeId,
    },
    data: {
      status: TradeStatus.ACCEPTED,
    },
  });
  const cardsToSend = await prisma.card.findMany({
    where: {
      id: {
        in: trade.cards.map((card) => card.cardId),
      },
      ownerId: trade.receiverId,
    },
    select: {
      id: true,
    },
  });
  const cardsToReceive = await prisma.card.findMany({
    where: {
      id: {
        in: trade.cards.map((card) => card.cardId),
      },
      ownerId: trade.senderId,
    },
    select: {
      id: true,
    },
  });
  const sendToReceiver = prisma.card.updateMany({
    where: {
      id: {
        in: cardsToReceive.map((card) => card.id),
      },
      ownerId: trade.senderId,
    },
    data: {
      ownerId: trade.receiverId,
    },
  });
  const sendToSender = prisma.card.updateMany({
    where: {
      id: {
        in: cardsToSend.map((card) => card.id),
      },
      ownerId: trade.receiverId,
    },
    data: {
      ownerId: trade.senderId,
    },
  });

  await prisma.$transaction([updateToAccept, sendToReceiver, sendToSender]);

  res.json({ message: "Trade accepted" });
};

const rejectTrade = async (req: Request, res: Response) => {
  const { tradeId } = req.params;

  if (!tradeId) {
    res.status(400).json({ message: "Missing tradeId" });
    return;
  }

  const trade = await prisma.trade.findUnique({
    where: {
      id: tradeId,
    },
    select: {
      status: true,
    },
  });

  if (!trade) {
    res.status(404).json({ message: "Trade not found" });
    return;
  }
  if (trade.status !== TradeStatus.PENDING) {
    res.status(400).json({ message: "Trade is not pending" });
    return;
  }

  await prisma.trade.update({
    where: {
      id: tradeId,
    },
    data: {
      status: TradeStatus.REJECTED,
    },
  });

  res.json({ message: "Trade rejected" });
};

export default (app: Express) => {
  app.get("/api/trade", sessionCheck, getPendingTrades);
  app.get("/api/trade/:tradeId", sessionCheck, getPendingTrade);
  app.get("/api/trade/history", sessionCheck, getTradeHistory);
  app.post("/api/trade", sessionCheck, sendTrade);
  app.put("/api/trade/accept/:tradeId", sessionCheck, acceptTrade);
  app.put("/api/trade/reject/:tradeId", sessionCheck, rejectTrade);
};
