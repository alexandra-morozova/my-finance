import cors from "cors";
import express from "express";
import { connectDatabase } from "./config/db.config.ts";
import { env } from "./config/env.config.ts";
import { errorHandler, notFound } from "./middleware/error-handler.ts";

const app = express();

app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(notFound);
app.use(errorHandler);

await connectDatabase();

app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`Server running on ${env.BASE_URL}`);
});

