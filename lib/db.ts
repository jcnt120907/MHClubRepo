import { ObjectId, type Filter, type Document } from "mongodb";
import { database } from "./mongo";
export { database } from "./mongo";
import { resolveOrderCompanion } from "./companions";
import { resolveCustomerService } from "./customer-services";
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
  requestedOrderNo?: string,
) {
  const db = await prepare();
  let v = await resolveOrderCompanion(db, inputSchema.parse(raw));
  v = await resolveCustomerService(v);
  if (requestedOrderNo && (!/^[PTL]\d{4,}$/.test(requestedOrderNo) || requestedOrderNo[0] !== v.type))
    throw new Error("Telegram 单号与订单类型不符");
  // Reuse the first gap for this type. The unique orderNo index is the
  // concurrency guard: a competing insert retries with a freshly computed gap.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const existing = await db
      .collection<{ orderNo: string }>("orders")
      .find({ type: v.type }, { projection: { orderNo: 1 } })
      .toArray();
    const used = new Set(
      existing
        .map((order) => /^.[0-9]+$/.test(order.orderNo) ? Number(order.orderNo.slice(1)) : 0)
        .filter(Number.isSafeInteger),
    );
    let sequence = 1;
    while (used.has(sequence)) sequence += 1;
    const now = new Date().toISOString();
    const doc = {
      ...metadata,
      ...v,
      ...calculate(v),
      orderNo: requestedOrderNo || orderNumber(v.type, sequence),
      createdAt: now,
      updatedAt: now,
    };
    try {
      const r = await db.collection("orders").insertOne(doc);
      await db
        .collection<{ _id: string; seq: number }>("counters")
        .updateOne(
          { _id: v.type },
          { $max: { seq: sequence } },
          { upsert: true },
        );
      clearCompanionOptions();
      return { ...doc, _id: r.insertedId.toString() };
    } catch (e) {
      if (
        requestedOrderNo ||
        !(e && typeof e === "object" && "code" in e && e.code === 11000) ||
        attempt === 19
      )
        throw e;
    }
  }
  throw new Error("无法生成可用单号");
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
  v = await resolveCustomerService(v);
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
    f.$or = ["orderNo", "companion", "customerService", "service", "notes"].map((k) => ({
      [k]: { $regex: escaped, $options: "i" },
    }));
  }
  for (const k of ["type", "companion", "customerService", "service", "status"])
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
  const requestedSort = p.get("sort") || "orderNo";
  const descending = requestedSort.endsWith("Desc");
  const sort = requestedSort.replace(/Desc$/, "");
  const supportedSorts = [
    "orderNo",
    "date",
    "companion",
    "customerService",
    "service",
    "total",
    "wage",
    "remaining",
    "status",
  ];
  const safeSort = supportedSorts.includes(sort) ? sort : "orderNo";
  const direction = descending ? -1 : 1;
  const itemSort =
    safeSort === "date"
      ? [{ $sort: { date: descending ? 1 : -1, time: descending ? 1 : -1, _id: descending ? 1 : -1 } }]
      : safeSort === "orderNo"
        ? [
          {
            $set: {
              _orderType: { $substrBytes: ["$orderNo", 0, 1] },
              _orderSequence: {
                $toInt: { $substrBytes: ["$orderNo", 1, -1] },
              },
            },
          },
          { $sort: { _orderType: direction, _orderSequence: direction } },
          { $unset: ["_orderType", "_orderSequence"] },
        ]
        : [{ $sort: { [safeSort]: direction, _id: direction } }];
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
              ...itemSort,
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
