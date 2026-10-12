import mongoose from "mongoose";
import { env } from "./env.config.ts";

export async function connectDatabase() {
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed", err);
    process.exit(1);
  }
}
