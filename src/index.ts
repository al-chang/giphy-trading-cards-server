import express, { Express } from "express";
import session from "express-session";
import userController from "./controllers/userController";
import cors from "cors";
import authController from "./controllers/authController";
import { Role } from "@prisma/client";
import cardController from "./controllers/cardController";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import prisma from "./prisma";
import * as dotenv from "dotenv";
import tradeController from "./controllers/tradeController";

dotenv.config();

declare module "express-session" {
  interface SessionData {
    user: { id: string; email: string; role: Role };
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
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000, //ms
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }),
    // cookie: { secure: true },
  })
);

userController(app);
authController(app);
cardController(app);
tradeController(app);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});
