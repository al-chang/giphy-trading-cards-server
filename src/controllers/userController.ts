import { Express, Request, Response } from "express";
import prisma from "../prisma";

const getUsers = async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
    },
  });
  res.json(users);
};

const getUser = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: {
      id: req.params.id,
    },
  });
  res.json(user);
};

export default (app: Express) => {
  app.get("/api/users", getUsers);
  app.get("/api/users/:id", getUser);
};
