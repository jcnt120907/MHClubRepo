import { MongoClient } from "mongodb";
const globalDb = globalThis as unknown as { mongo?: Promise<MongoClient> };
export async function database() {
  if (!process.env.MONGODB_URI) throw new Error("请设置 MONGODB_URI");
  if (!globalDb.mongo)
    globalDb.mongo = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
      maxPoolSize: 10,
    })
      .connect()
      .catch((e) => {
        globalDb.mongo = undefined;
        throw e;
      });
  return (await globalDb.mongo).db(process.env.MONGODB_DB || "peiwan_local");
}
