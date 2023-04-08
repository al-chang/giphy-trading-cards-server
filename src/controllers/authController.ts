import { Express, Request, Response } from "express";
import prisma from "../prisma";

const signup = async (req: Request, res: Response) => {
  const newUser = req.body as { email: string; password: string };

  const existingUser = await prisma.user.findFirst({
    where: {
      email: newUser.email,
    },
  });
  if (existingUser) {
    res.sendStatus(403);
    return;
  }

  const insertedUser = await prisma.user.create({
    data: newUser,
  });
  insertedUser.password = "";
  // @ts-ignore
  req.session["profile"] = insertedUser;
  res.json(insertedUser);
};

const login = async (req: Request, res: Response) => {
  const user = req.body as { email: string; password: string };
  const email = user.email;
  const password = user.password;
  const existingUser = await prisma.user.findFirst({
    where: {
      email: email,
      password: password,
    },
  });
  if (existingUser) {
    existingUser.password = "";
    // @ts-ignore
    req.session["profile"] = existingUser;
    res.json(existingUser);
  } else {
    res.sendStatus(403);
  }
};

const logout = (req: Request, res: Response) => {
  req.session.destroy(() => {});
  res.sendStatus(200);
};

const profile = async (req: Request, res: Response) => {
  // @ts-ignore
  const profile = req.session["profile"];
  if (!profile) {
    res.sendStatus(403);
    return;
  }
  res.send(profile);
};

const authController = (app: Express) => {
  app.post("/api/auth/signup", signup);
  app.post("/api/auth/login", login);
  app.get("/api/auth/profile", profile);
  app.post("/api/auth/logout", logout);
};

export default authController;
