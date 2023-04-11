import express, { Express, Request, Response } from "express";
import session from "express-session";
import userController from "./controllers/userController";
import cors from "cors";
import authController from "./controllers/authController";
import { User } from "@prisma/client";

declare module "express-session" {
  interface SessionData {
    user: { id: string; email: string };
  }
}

const app: Express = express();

app.use(express.json());
app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);

// app.set("trust proxy", 1);
app.use(
  session({
    secret: process.env.SECRET || "secret",
    resave: false,
    saveUninitialized: true,
    // cookie: { secure: true },
  })
);

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

userController(app);
authController(app);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});
