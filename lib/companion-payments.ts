import { ObjectId } from "mongodb";
import { z } from "zod";
import { database } from "./mongo";
import { listCompanions } from "./companions";

export type SettlementPeriod = { month: string; half: "1" | "2"; start: string; end: string; label: string };
export function settlementPeriod(month: string, half: string): SettlementPeriod {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || (half !== "1" && half !== "2")) throw new Error("结算期无效");
  const [year, currentMonth] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, currentMonth, 0)).getUTCDate();
  return half === "1"
    ? { month, half, start: `${month}-01`, end: `${month}-15`, label: `${month} 上半月（1–15日）` }
    : { month, half, start: `${month}-16`, end: `${month}-${String(lastDay).padStart(2, "0")}`, label: `${month} 下半月（16–${lastDay}日）` };
}

type PendingOrder = { _id: ObjectId; orderNo: string; date: string; service: string; type: string; wage: number; status: string };
async function paymentCollection() {
  const db = await database(); const collection = db.collection("companionPayments");
  await Promise.all([collection.createIndex({ companionId: 1, paidAt: -1 }), collection.createIndex({ periodStart: 1, periodEnd: 1 })]);
  return { db, collection };
}

export async function pendingCompanionPayments(month: string, half: string) {
  const period = settlementPeriod(month, half); const { db, collection } = await paymentCollection(); const companions = await listCompanions();
  const ids = companions.map(companion => companion._id.toString());
  const orders = await db.collection<PendingOrder>("orders").find({ companionId: { $in: ids }, status: "可发放", date: { $gte: period.start, $lte: period.end } }).sort({ date: 1, time: 1, orderNo: 1 }).toArray();
  const ordersByCompanion = new Map<string, PendingOrder[]>();
  for (const order of orders) { const key = String((order as PendingOrder & { companionId: string }).companionId); ordersByCompanion.set(key, [...(ordersByCompanion.get(key) || []), order]); }
  const items = companions.map(companion => {
    const companionOrders = ordersByCompanion.get(companion._id.toString()) || [];
    return { companionId: companion._id.toString(), name: companion.name, paymentMethod: companion.paymentMethod || "", paymentContent: companion.paymentContent || "", paymentImage: companion.paymentImage || "", notes: companion.notes || "", missingPaymentInfo: !companion.paymentMethod && !companion.paymentContent && !companion.paymentImage, orderCount: companionOrders.length, totalWage: Number(companionOrders.reduce((sum, order) => sum + Number(order.wage || 0), 0).toFixed(2)), orders: companionOrders.map(order => ({ id: order._id.toString(), orderNo: order.orderNo, date: order.date, service: order.service, type: order.type, wage: Number(order.wage || 0), status: order.status })) };
  }).filter(item => item.orderCount > 0).sort((a, b) => b.totalWage - a.totalWage || a.name.localeCompare(b.name, "zh-CN"));
  const history = await collection.find({ periodStart: period.start, periodEnd: period.end }).sort({ paidAt: -1, createdAt: -1 }).toArray();
  return { period, summary: { companionCount: items.length, orderCount: orders.length, totalWage: Number(items.reduce((sum, item) => sum + item.totalWage, 0).toFixed(2)) }, items, history: history.map(record => ({ ...record, _id: record._id.toString() })) };
}

const confirmSchema = z.object({ companionIds: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).min(1).max(100).transform(ids => [...new Set(ids)]), month: z.string(), half: z.enum(["1", "2"]), paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), notes: z.string().trim().max(1000).default("") });
export async function confirmCompanionPayments(raw: unknown) {
  const input = confirmSchema.parse(raw); const period = settlementPeriod(input.month, input.half); const { db, collection } = await paymentCollection(); const companions = await db.collection("companions").find({ _id: { $in: input.companionIds.map(id => new ObjectId(id)) }, isDeleted: false }).toArray();
  const results: Array<{ companionId: string; name: string; orderCount: number; totalWage: number }> = [];
  const now = new Date().toISOString();
  for (const companion of companions) {
    const companionId = companion._id.toString();
    const candidates = await db.collection<PendingOrder>("orders").find({ companionId, status: "可发放", date: { $gte: period.start, $lte: period.end } }).toArray();
    const paidOrders: PendingOrder[] = [];
    for (const order of candidates) {
      const updated = await db.collection<PendingOrder>("orders").findOneAndUpdate({ _id: order._id, status: "可发放" }, { $set: { status: "已付款", updatedAt: now } }, { returnDocument: "before" });
      if (updated) paidOrders.push(updated);
    }
    if (!paidOrders.length) continue;
    const totalWage = Number(paidOrders.reduce((sum, order) => sum + Number(order.wage || 0), 0).toFixed(2));
    await collection.insertOne({ companionId, companionName: companion.name, periodMonth: period.month, periodHalf: period.half, periodStart: period.start, periodEnd: period.end, orderIds: paidOrders.map(order => order._id.toString()), orders: paidOrders.map(order => ({ orderNo: order.orderNo, date: order.date, service: order.service, type: order.type, wage: Number(order.wage || 0) })), orderCount: paidOrders.length, totalWage, paidAt: input.paidAt, notes: input.notes, createdAt: now });
    results.push({ companionId, name: String(companion.name), orderCount: paidOrders.length, totalWage });
  }
  return { period, paid: results, skipped: input.companionIds.length - results.length, totalWage: Number(results.reduce((sum, item) => sum + item.totalWage, 0).toFixed(2)) };
}
