import { Request, Response, NextFunction } from "express";

const sessionCheck = (req: Request, res: Response, next: NextFunction) => {
  if (req.session.user?.id && req.session.user?.email) {
    next();
  } else {
    res.sendStatus(401);
  }
};

export default sessionCheck;
