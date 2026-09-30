import bcrypt from "bcryptjs";

import { UserModel } from "@/models/User";
import { connectDb } from "@/lib/db";

const DEFAULT_PIN = "9876";

const DEFAULT_USERS = [
  { username: "hamza", displayName: "Hamza" },
  { username: "bilal", displayName: "Bilal" },
];

export async function ensureDefaultUsers() {
  await connectDb();

  for (const user of DEFAULT_USERS) {
    const existing = await UserModel.findOne({ username: user.username });

    if (!existing) {
      const pinHash = await bcrypt.hash(DEFAULT_PIN, 12);

      await UserModel.create({
        username: user.username,
        displayName: user.displayName,
        pinHash,
      });
    }
  }

  return UserModel.find().sort({ createdAt: 1 }).lean();
}

export async function findUserByUsername(username: string) {
  await connectDb();
  return UserModel.findOne({ username: username.trim().toLowerCase() }).lean();
}
