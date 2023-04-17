import { Express, Request, Response } from "express";
import prisma from "../prisma";
import sessionCheck from "../middleware/sessionCheck";
import adminCheck from "../middleware/adminCheck";

const getCoins = async (req: Request, res: Response) => {
  const coins = await prisma.user.findUnique({
    where: { id: req.session.user!.id },
    select: {
      coins: true,
    },
  });
  res.json(coins?.coins);
};

const addCoins = async (req: Request, res: Response) => {
  const { coins, userId } = req.body;
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

export default (app: Express) => {
  app.get("/api/coins", sessionCheck, getCoins);
  app.post("/api/coins", adminCheck, addCoins);
};
