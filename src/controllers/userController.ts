import { Express, Request, Response } from "express";
import prisma from "../prisma";
import { Role, User } from "@prisma/client";
import { SelectFields } from "../types";
import { exclude } from "../utils";
import sessionCheck from "../middleware/sessionCheck";

const getUsers = async (req: Request, res: Response) => {
  const isAdmin = req.session.user?.role === Role.ADMIN;

  const adminFields: SelectFields<User> = {
    email: true,
    role: true,
  };

  const fields: SelectFields<User> = {
    id: true,
    username: true,
    coins: true,
    createdAt: true,
    ...(isAdmin && adminFields),
  };

  const page = parseInt(req.params.page) || 1;
  const limit = parseInt(req.params.limit) || 10;
  const offset = (page - 1) * limit;

  // Filters
  const { username, email, role } = req.query;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      select: fields,
      skip: offset,
      take: limit,
      where: {
        username: {
          contains: username as string,
        },
        email: {
          contains: email as string,
        },
        role: {
          notIn: [Role.ADMIN, Role.USER].filter((r) =>
            !!role ? r !== role : false
          ),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
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
  const isAdmin = req.session.user?.role === Role.ADMIN;
  const isOwnProfile = req.session.user?.id === req.params.id;
  const showHiddenFields = isAdmin || isOwnProfile;

  const userQuery = prisma.user.findUnique({
    where: {
      id: req.params.id,
    },
  });
  const followerCountQuery = prisma.follows.count({
    where: {
      followingId: req.params.id,
    },
  });
  const followingCountQuery = prisma.follows.count({
    where: {
      followerId: req.params.id,
    },
  });
  const isFollowingQuery = prisma.follows.findFirst({
    where: {
      followerId: req.session.user?.id,
      followingId: req.params.id,
    },
  });

  const [user, followerCount, followingCount, isFollowing] =
    await prisma.$transaction([
      userQuery,
      followerCountQuery,
      followingCountQuery,
      isFollowingQuery,
    ]);

  if (!user) {
    res.sendStatus(404);
    return;
  }

  const userRes = {
    ...user,
    followerCount,
    followingCount,
    isFollowing: !!isFollowing,
  };
  res.json(
    exclude(userRes, showHiddenFields ? ["password"] : ["password", "email"])
  );
};

const followUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { id: userId } = req.session.user!;

  const user = await prisma.user.findUnique({
    where: { id },
  });
  if (!user) {
    res.sendStatus(404);
    return;
  }

  await prisma.follows.create({
    data: {
      follower: {
        connect: {
          id: userId,
        },
      },
      following: {
        connect: {
          id,
        },
      },
    },
  });

  res.sendStatus(200);
};

const unfollowUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { id: userId } = req.session.user!;

  const user = await prisma.user.findUnique({
    where: { id },
  });
  if (!user) {
    res.sendStatus(404);
    return;
  }

  await prisma.follows.deleteMany({
    where: {
      followerId: userId,
      followingId: id,
    },
  });

  res.sendStatus(200);
};

export default (app: Express) => {
  app.get("/api/users", getUsers);
  app.get("/api/users/:id", getUser);

  app.post("/api/users/:id/follow", sessionCheck, followUser);
  app.delete("/api/users/:id/follow", sessionCheck, unfollowUser);
};
