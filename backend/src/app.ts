import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/error-handler.ts";
import { notFound } from "./middleware/not-found.ts";
import { usersRouter } from "./modules/users/users.routes.ts";
import { env } from "./shared/env.ts";

const app = express();

app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/users", usersRouter);
app.use(notFound);
app.use(errorHandler);

export { app };
