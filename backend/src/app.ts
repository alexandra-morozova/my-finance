import cors from "cors";
import express from "express";
import { rejectCookieCsrf } from "./middleware/csrf.ts";
import { errorHandler } from "./middleware/error-handler.ts";
import { notFound } from "./middleware/not-found.ts";
import { requireHttps } from "./middleware/require-https.ts";
import { accountsRouter } from "./modules/accounts/accounts.routes.ts";
import { authRouter } from "./modules/auth/auth.routes.ts";
import { transactionRouter } from "./modules/transaction/transaction.routes.ts";
import { usersRouter } from "./modules/users/users.routes.ts";
import { env } from "./shared/env.ts";

const app = express();

// Production sits behind one TLS terminator. Trust that hop so req.secure and
// req.ip reflect the client (X-Forwarded-Proto / X-Forwarded-For), not the proxy.
if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(requireHttps);
app.use(rejectCookieCsrf);
app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/accounts", accountsRouter);
app.use("/transactions", transactionRouter);
app.use(notFound);
app.use(errorHandler);

export { app };
