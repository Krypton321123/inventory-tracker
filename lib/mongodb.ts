import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectDB() {
  console.log(MONGODB_URI)
  if (cached.conn) {
    console.log("connected");
    return cached.conn;
  }

  if (!cached.promise) {
    console.log("connected");
    cached.promise = mongoose.connect(MONGODB_URI).then((m) => m);
  }

  cached.conn = await cached.promise;
  console.log("connected");
  return cached.conn;
}
