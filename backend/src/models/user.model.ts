import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export type UserRaw = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<UserRaw>;

export const UserModel = model("User", userSchema);
