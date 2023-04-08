import { Request, Response, NextFunction } from "express";

const adminCheck = (req: Request, res: Response, next: NextFunction) => {
  // @ts-ignore
  if (req.session.profile && req.session.profile.admin) {
    next();
  } else {
    res.sendStatus(401);
  }
};

export default adminCheck;
