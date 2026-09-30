import mongoose from "mongoose";

const MONGODB_KEY = process.env.MONGODDB_KEY || "";

let isConnected = false;

export async function connectDb() {
  if (isConnected) {
    return;
  }

  if (!MONGODB_KEY) {
    throw new Error(
      "MONGODDB_KEY is not defined in the environment variables.",
    );
  }

  await mongoose.connect(MONGODB_KEY, {
    dbName: "indrive-app",
  });

  isConnected = true;
}
