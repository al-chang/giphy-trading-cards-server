import { Express, Request, Response } from "express";
import prisma from "../prisma";
import sessionCheck from "../middleware/sessionCheck";
import { exclude } from "../utils";

const signup = async (req: Request, res: Response) => {
  const newUser = req.body as {
    email: string;
    username: string;
    password: string;
  };

  if (!newUser.email || !newUser.username || !newUser.password) {
    res.statusMessage = "Email, username and password are required";
    res.sendStatus(400);
    return;
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        {
          email: newUser.email,
        },
        {
          username: newUser.username,
        },
      ],
    },
  });
  if (existingUser) {
    if (
      existingUser.email === newUser.email &&
      existingUser.username === newUser.username
    ) {
      res.statusMessage = "Email and username already exists";
    } else if (existingUser.email === newUser.email) {
      res.statusMessage = "Email  already exists";
    } else if (existingUser.username === newUser.username) {
      res.statusMessage = "Username already exists";
    }

    res.sendStatus(409);
    return;
  }

  const insertedUser = await prisma.user.create({
    data: newUser,
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
    },
  });
  req.session.user = insertedUser;
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
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
    },
  });
  if (existingUser) {
    req.session.user = existingUser;
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
  const userId = req.session.user!.id;
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
    },
  });
  if (user) {
    res.json(user);
  } else {
    res.sendStatus(404);
  }
};

const authController = (app: Express) => {
  app.post("/api/auth/signup", signup);
  app.post("/api/auth/login", login);
  app.get("/api/auth/profile", sessionCheck, profile);
  app.post("/api/auth/logout", logout);
};

export default authController;
