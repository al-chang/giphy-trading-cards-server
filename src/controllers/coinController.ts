import { Express, Request, Response } from "express";
import prisma from "../prisma";
import sessionCheck from "../middleware/sessionCheck";
import adminCheck from "../middleware/adminCheck";

const getCoins = async (req: Request, res: Response) => {
  const coins = await prisma.user.findUnique({
    where: { id: req.session.user!.id },
    select: {
      coins: true,
      lastCollected: true,
    },
  });
  res.json(coins);
};

const addCoins = async (req: Request, res: Response) => {
  const { coins, userId } = req.body as { coins: number; userId: string };
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    res.sendStatus(404);
    return;
  }
  await prisma.user.update({
    where: { id: userId },
    data: {
      coins: user.coins + coins,
    },
  });
  res.sendStatus(200);
};

const collectDailyCoins = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.session.user!.id },
  });
  if (!user) {
    res.sendStatus(404);
    return;
  }
  const lastCollected = new Date(user.lastCollected);
  const now = new Date();

  if (
    lastCollected.getDate() === now.getDate() &&
    lastCollected.getMonth() === now.getMonth() &&
    lastCollected.getFullYear() === now.getFullYear()
  ) {
    console.log("test");
    res.sendStatus(400);
    return;
  }

  const coins = Math.floor(Math.random() * 400) + 100;

  await prisma.user.update({
    where: { id: req.session.user!.id },
    data: {
      coins: user.coins + coins,
      lastCollected: now,
    },
  });
  res.json({ coins });
};

export default (app: Express) => {
  app.get("/api/coins", sessionCheck, getCoins);
  app.post("/api/coins", adminCheck, addCoins);

  app.post("/api/coins/daily", sessionCheck, collectDailyCoins);
};
