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
export async function listCustomerServices(q = "") {
  const c = await collection();
  const escaped = q.trim().slice(0, 200).replace(/[.*+?^$()|[\]\\]/g, "\\$&");
  return c.aggregate([
    { $match: { isDeleted: false, ...(escaped ? { name: { $regex: escaped, $options: "i" } } : {}) } },
    { $lookup: { from: "orders", localField: "_id", foreignField: "customerServiceId", as: "orders" } },
    { $set: { orderCount: { $size: "$orders" } } },
    { $project: { orders: 0 } },
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
