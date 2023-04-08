import { Request, Response, NextFunction } from "express";

const sessionCheck = (req: Request, res: Response, next: NextFunction) => {
  // @ts-ignore
  if (req.session.profile) {
    next();
  } else {
    res.sendStatus(401);
  }
};

export default sessionCheck;
