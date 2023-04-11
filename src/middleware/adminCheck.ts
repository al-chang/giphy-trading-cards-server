import { Request, Response, NextFunction } from "express";
import sessionCheck from "./sessionCheck";
import prisma from "../prisma";
import { Role } from "@prisma/client";

const adminCheck = (req: Request, res: Response, next: NextFunction) => {
  sessionCheck(req, res, async () => {
    const { user } = req.session;
    const userRole = await prisma.user.findUnique({
      where: {
        id: user!.id,
      },
      select: {
        role: true,
      },
    });
    if (userRole?.role === Role.ADMIN) {
      next();
    } else {
      res.sendStatus(401);
    }
  });
};

export default adminCheck;
