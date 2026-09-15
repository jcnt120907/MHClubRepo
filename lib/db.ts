import { ObjectId, type Filter, type Document } from "mongodb";
import { database } from "./mongo";
export { database } from "./mongo";
import { resolveOrderCompanion } from "./companions";
import {
  inputSchema,
  calculate,
  orderNumber,
  statuses,
  type Input,
} from "./domain";
const globalOrderQuery = globalThis as unknown as {
  companionOptions?: { names: string[]; expiresAt: number };
};
function clearCompanionOptions() {
  globalOrderQuery.companionOptions = undefined;
}
export async function prepare() {
  const db = await database();
  await db.collection("orders").createIndex({ orderNo: 1 }, { unique: true });
  await db
    .collection("orders")
    .createIndex({ sourceKey: 1 }, { unique: true, sparse: true });
  await db.collection("orders").createIndex({ date: -1, time: -1 });
  await Promise.all([
    db.collection("orders").createIndex({ companion: 1, date: -1, time: -1 }),
    db.collection("orders").createIndex({ type: 1, date: -1, time: -1 }),
    db.collection("orders").createIndex({ service: 1, date: -1, time: -1 }),
    db.collection("orders").createIndex({ status: 1, date: -1, time: -1 }),
  ]);
  return db;
}
export async function createOrder(
  raw: unknown,
  metadata: Record<string, unknown> = {},
) {
  const db = await prepare();
  const v = await resolveOrderCompanion(db, inputSchema.parse(raw));
  const c = await db
    .collection<{ _id: string; seq: number }>("counters")
    .findOneAndUpdate(
      { _id: v.type },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" },
    );
  const now = new Date().toISOString();
  const doc = {
    ...metadata,
    ...v,
    ...calculate(v),
    orderNo: orderNumber(v.type, c!.seq),
    createdAt: now,
    updatedAt: now,
  };
  const r = await db.collection("orders").insertOne(doc);
  clearCompanionOptions();
  return { ...doc, _id: r.insertedId.toString() };
}
export async function updateOrder(id: string, raw: unknown) {
  let v = inputSchema.parse(raw);
  const db = await database();
  const old = await db.collection("orders").findOne({ _id: new ObjectId(id) });
  if (!old) return null;
  v = await resolveOrderCompanion(db, v, {
    companion: old.companion,
    companionId: old.companionId,
  });
  if (old.type !== v.type) throw new Error("不能更改订单类型，请重新开单");
  const result = await db
    .collection("orders")
    .findOneAndUpdate(
      { _id: old._id },
      { $set: { ...v, ...calculate(v), updatedAt: new Date().toISOString() } },
      { returnDocument: "after" },
    );
  clearCompanionOptions();
  return result;
}
export async function updateOrderStatuses(ids: string[], status: (typeof statuses)[number]) {
  const db = await database();
  const result = await db.collection("orders").updateMany(
    { _id: { $in: ids.map((id) => new ObjectId(id)) } },
    { $set: { status, updatedAt: new Date().toISOString() } },
  );
  return result.modifiedCount;
}
export function filterFor(p: URLSearchParams) {
  const f: Filter<Document> = {};
  const q = p.get("q")?.trim();
  if (q) {
    const escaped = q.slice(0, 200).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    f.$or = ["orderNo", "companion", "service", "notes"].map((k) => ({
      [k]: { $regex: escaped, $options: "i" },
    }));
  }
  for (const k of ["type", "companion", "service", "status"])
    if (p.get(k)) f[k] = p.get(k);
  if (p.get("from") || p.get("to"))
    f.date = {
      ...(p.get("from") ? { $gte: p.get("from") } : {}),
      ...(p.get("to") ? { $lte: p.get("to") } : {}),
    };
  const a = p.getAll("addon").filter(Boolean);
  if (a.length) f.addons = { $all: a };
  return f;
}
export async function listOrders(p: URLSearchParams) {
  const db = await database();
  const f = filterFor(p);
  const page = Math.floor(
    Math.max(1, Math.min(100000, Number(p.get("page")) || 1)),
  );
  const size = 12;
  const cachedOptions = globalOrderQuery.companionOptions;
  const needsOptions = !cachedOptions || cachedOptions.expiresAt < Date.now();
  const [result, companions] = await Promise.all([
    db
      .collection("orders")
      .aggregate([
        { $match: f },
        {
          $facet: {
            items: [
              { $sort: { date: -1, time: -1, _id: -1 } },
              { $skip: (page - 1) * size },
              { $limit: size },
            ],
            summary: [
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 },
                  total: { $sum: "$total" },
                  wage: { $sum: "$wage" },
                  remaining: { $sum: "$remaining" },
                },
              },
              {
                $project: {
                  _id: 0,
                  count: 1,
                  total: { $round: ["$total", 2] },
                  wage: { $round: ["$wage", 2] },
                  remaining: { $round: ["$remaining", 2] },
                },
              },
            ],
          },
        },
      ])
      .toArray(),
    needsOptions
      ? db.collection("orders").distinct("companion")
      : Promise.resolve(cachedOptions.names),
  ]);
  if (needsOptions)
    globalOrderQuery.companionOptions = {
      names: companions.sort(),
      expiresAt: Date.now() + 60_000,
    };
  return {
    items: result[0].items,
    summary: result[0].summary[0] || {
      count: 0,
      total: 0,
      wage: 0,
      remaining: 0,
    },
    companions,
    page,
    pageSize: size,
  };
}
