import { Express, Request, Response } from "express";
import prisma from "../prisma";
import { Role, User } from "@prisma/client";
import { SelectFields } from "../types";

const getUsers = async (req: Request, res: Response) => {
  const isAdmin = req.session.user?.role === Role.ADMIN;

  const fields: SelectFields<User> = isAdmin
    ? { email: true, username: true, createdAt: true, role: true, coins: true }
    : { username: true, coins: true };

  const page = parseInt(req.params.page) || 1;
  const limit = parseInt(req.params.limit) || 10;
  const offset = (page - 1) * limit;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      select: fields,
      skip: offset,
      take: limit,
    }),
    prisma.user.count(),
  ]);

  const next = total > page * limit ? page + 1 : null;
  const prev = page > 1 ? page - 1 : null;

  res.json({
    data: users,
    total,
    limit,
    page,
    next,
    prev,
  });
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
