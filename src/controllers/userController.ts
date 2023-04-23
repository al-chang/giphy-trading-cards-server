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

const getFeed = async (req: Request, res: Response) => {
  const FEED_ITEMS = 20;

  const { id } = req.session.user!;
  const following = await prisma.follows.findMany({
    where: {
      followerId: id,
    },
    select: {
      followingId: true,
    },
  });
  const selectIds = [id, ...following.map((f) => f.followingId)];

  const recentTrades = await prisma.trade.findMany({
    where: {
      OR: [
        {
          senderId: {
            in: selectIds,
          },
        },
        {
          receiverId: {
            in: selectIds,
          },
        },
      ],
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
        },
      },
      receiver: {
        select: {
          id: true,
          username: true,
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
    orderBy: {
      createdAt: "desc",
    },
    take: FEED_ITEMS,
  });
  const recentCards = await prisma.card.findMany({
    where: {
      ownerId: {
        in: selectIds,
      },
    },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: FEED_ITEMS,
  });

  const feed = [...recentTrades, ...recentCards].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  res.json(feed);
};

const updateUsername = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { updatedUsername } = req.body as { updatedUsername: string };
  const isOwnProfile = req.session.user?.id === id;
  if (!isOwnProfile) {
    res.status(400).json({ message: "Unauthorized to edit user profile" });
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: id,
    },
    data: {
      username: updatedUsername,
    },
  });

  if (!updatedUser) {
    res.status(404).json({ message: "Unable to update username" });
    return;
  }

  res.json({ message: "User Updated" });
};

const updateEmail = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { updatedUserEmail } = req.body as { updatedUserEmail: string };
  const isOwnProfile = req.session.user?.id === id;

  if (!isOwnProfile) {
    res.status(400).json({ message: "Unauthorized to edit user profile" });
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: id,
    },
    data: {
      email: updatedUserEmail,
    },
  });

  if (!updatedUser) {
    res.status(404).json({ message: "Unable to update email" });
    return;
  }

  res.json({ message: "Email Updated" });
};

const updatePassword = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { updatedUserPasword } = req.body as { updatedUserPasword: string };
  const isOwnProfile = req.session.user?.id === id;

  if (!isOwnProfile) {
    res.status(400).json({ message: "Unauthorized to edit user profile" });
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: id,
    },
    data: {
      password: updatedUserPasword,
    },
  });

  if (!updatedUser) {
    res.status(404).json({ message: "Unable to update password" });
    return;
  }

  res.json({ message: "Password Updated" });
};

const updateRole = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { updatedUserRole } = req.body as { updatedUserRole: Role };
  const currentUserAdmin = req.session.user?.role === Role.ADMIN;

  if (!currentUserAdmin) {
    res.status(400).json({ message: "Unauthorized to edit user profile" });
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: id,
    },
    data: {
      role: updatedUserRole,
    },
  });

  if (!updatedUser) {
    res.status(404).json({ message: "Unable to update role" });
    return;
  }

  res.json({ message: "Role Updated" });
};

export default (app: Express) => {
  app.get("/api/users", getUsers);
  app.get("/api/users/:id", getUser);

  app.post("/api/users/:id/follow", sessionCheck, followUser);
  app.delete("/api/users/:id/follow", sessionCheck, unfollowUser);

  app.get("/api/feed", sessionCheck, getFeed);
  app.put("/api/users/:id/edit/username", updateUsername);
  app.put("/api/users/:id/edit/email", updateEmail);
  app.put("/api/users/:id/edit/password", updatePassword);
  app.put("/api/users/:id/edit/role", updateRole);
};
