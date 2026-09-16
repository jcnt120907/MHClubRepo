import { ObjectId } from "mongodb";
import { database } from "./mongo";
import { customerServiceKey, customerServiceSchema } from "./customer-service-domain";
export class CustomerServiceError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
async function collection() {
  const db = await database();
  await db.collection("customerServices").createIndex(
    { nameKey: 1 },
    { unique: true, partialFilterExpression: { isDeleted: false } },
  );
  return db.collection("customerServices");
}
export async function listCustomerServices(q = "", month = "", half = "") {
  const c = await collection();
  const escaped = q.trim().slice(0, 200).replace(/[.*+?^$()|[\]\\]/g, "\\$&");
  const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  const validHalf = half === "1" || half === "2";
  const monthOrders = validMonth && validHalf
    ? {
        $filter: {
          input: "$successfulOrders",
          as: "order",
          cond: {
            $and: [
              { $gte: ["$$order.date", month + (half === "1" ? "-01" : "-16")] },
              { $lte: ["$$order.date", month + (half === "1" ? "-15" : "-31")] },
            ],
          },
        },
      }
    : validMonth
    ? { $filter: { input: "$successfulOrders", as: "order", cond: { $regexMatch: { input: "$$order.date", regex: "^" + month + "-" } } } }
      : "$successfulOrders";
  const wageFor = (input: string) => ({
    $sum: {
      $map: {
        input,
        as: "order",
        in: {
          $cond: [
            { $eq: ["$$order.type", "L"] },
            { $ifNull: ["$giftSuccessFee", 0.5] },
            { $ifNull: ["$serviceSuccessFee", 1] },
          ],
        },
      },
    },
  });
  return c.aggregate([
    { $match: { isDeleted: false, ...(escaped ? { name: { $regex: escaped, $options: "i" } } : {}) } },
    {
      $lookup: {
        from: "orders",
        let: { customerId: { $toString: "$_id" }, customerName: "$name" },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $eq: ["$customerServiceId", "$$customerId"] },
                  { $eq: ["$customerService", "$$customerName"] },
                ],
              },
            },
          },
        ],
        as: "orders",
      },
    },
    { $set: { successfulOrders: { $filter: { input: "$orders", as: "order", cond: { $in: ["$$order.status", ["可发放", "已付款"]] } } } } },
    { $set: { periodOrders: monthOrders } },
    { $set: { orderCount: { $size: "$successfulOrders" }, periodOrderCount: { $size: "$periodOrders" }, totalWage: wageFor("$successfulOrders"), periodWage: wageFor("$periodOrders") } },
    { $project: { orders: 0, successfulOrders: 0, periodOrders: 0 } },
    { $sort: { nameKey: 1 } },
  ]).toArray();
}
export async function createCustomerService(raw: unknown) {
  const v = customerServiceSchema.parse(raw), c = await collection(), now = new Date().toISOString();
  try {
    const r = await c.insertOne({ ...v, nameKey: customerServiceKey(v.name), isDeleted: false, createdAt: now, updatedAt: now });
    return { ...v, _id: r.insertedId.toString() };
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === 11000) throw new CustomerServiceError("已有同名客服，请使用其他名称。", 409);
    throw e;
  }
}
export async function updateCustomerService(id: string, raw: unknown) {
  const v = customerServiceSchema.parse(raw);
  return (await collection()).findOneAndUpdate({ _id: new ObjectId(id), isDeleted: false }, { $set: { ...v, nameKey: customerServiceKey(v.name), updatedAt: new Date().toISOString() } }, { returnDocument: "after" });
}
export async function deleteCustomerService(id: string) {
  return (await collection()).updateOne({ _id: new ObjectId(id), isDeleted: false }, { $set: { isDeleted: true, updatedAt: new Date().toISOString() } });
}
export async function resolveCustomerService<
  T extends { customerService: string; customerServiceId?: string },
>(v: T): Promise<T> {
  if (!v.customerServiceId) return v;
  const item = await (await collection()).findOne({ _id: new ObjectId(v.customerServiceId), isDeleted: false });
  if (!item) throw new CustomerServiceError("这位客服已删除或不存在，请重新选择。");
  return { ...v, customerService: item.name as string };
}
