import { ObjectId } from "mongodb";
import { database } from "./mongo";

export type StoredOrder = { _id: string; orderId: string; orderNo: string; companion: string; date: string; durationMinutes: number; status: "进行中" | "完成"; previousOrderStatus: string; createdAt: string; completedAt?: string; updatedAt: string };
const validDuration = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 1440;
async function collection() {
  const db = await database(); const c = db.collection("storedOrders");
  await Promise.all([c.createIndex({ orderId: 1 }, { unique: true }), c.createIndex({ orderNo: 1 }, { unique: true }), c.createIndex({ status: 1, date: -1 })]);
  return { db, c };
}
export async function createStoredOrder(orderId: string, durationMinutes: number, previousOverride?: string) {
  if (!ObjectId.isValid(orderId) || !validDuration(durationMinutes)) throw new Error("存单资料无效");
  const { db, c } = await collection(); const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });
  if (!order) throw new Error("找不到原订单");
  if (order.type === "L") throw new Error("礼物单不能建立存单");
  const now = new Date().toISOString();
  const doc = { orderId, orderNo: order.orderNo as string, companion: order.companion as string, date: order.date as string, durationMinutes, status: "进行中" as const, previousOrderStatus: previousOverride || order.status as string, createdAt: now, updatedAt: now };
  await c.insertOne(doc); await db.collection("orders").updateOne({ _id: order._id }, { $set: { status: "进行中", updatedAt: now } });
  return { ...doc, _id: orderId };
}
export async function createStoredOrderForImportedOrder(order: { _id: string }, durationMinutes: number) { return createStoredOrder(order._id, durationMinutes, "未标记"); }
export async function listStoredOrders(p: URLSearchParams) {
  const { c } = await collection(); const q = p.get("q")?.trim(); const f: Record<string, unknown> = {};
  if (q) { const e=q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); f.$or=[{orderNo:{$regex:e,$options:"i"}},{companion:{$regex:e,$options:"i"}}]; }
  if (p.get("status")) f.status=p.get("status"); if (p.get("from")||p.get("to")) f.date={...(p.get("from")?{$gte:p.get("from")} : {}),...(p.get("to")?{$lte:p.get("to")} : {})};
  return (await c.find(f).sort({ date:-1, createdAt:-1 }).toArray()).map(x=>({...x,_id:x._id.toString()}));
}
export async function updateStoredOrder(id: string, raw: { durationMinutes?: unknown }) {
  if (!ObjectId.isValid(id) || !validDuration(raw.durationMinutes)) throw new Error("存单时长无效"); const { c }=await collection();
  return c.findOneAndUpdate({_id:new ObjectId(id),status:"进行中"},{$set:{durationMinutes:raw.durationMinutes,updatedAt:new Date().toISOString()}},{returnDocument:"after"});
}
export async function completeStoredOrder(id: string) {
  if (!ObjectId.isValid(id)) throw new Error("存单记录无效"); const { db,c }=await collection(); const item=await c.findOne({_id:new ObjectId(id)}); if(!item) return null;
  if(item.status==="完成") return item; const now=new Date().toISOString();
  await c.updateOne({_id:item._id},{$set:{status:"完成",completedAt:now,updatedAt:now}});
  await db.collection("orders").updateOne({_id:new ObjectId(item.orderId),status:{$ne:"已付款"}},{$set:{status:"可发放",updatedAt:now}});
  return {...item,status:"完成",completedAt:now,updatedAt:now};
}
export async function deleteStoredOrder(id: string) {
  if (!ObjectId.isValid(id)) throw new Error("存单记录无效"); const { db,c }=await collection(); const item=await c.findOne({_id:new ObjectId(id)}); if(!item) return false;
  if(item.status==="进行中") await db.collection("orders").updateOne({_id:new ObjectId(item.orderId),status:"进行中"},{$set:{status:item.previousOrderStatus,updatedAt:new Date().toISOString()}});
  await c.deleteOne({_id:item._id}); return true;
}
