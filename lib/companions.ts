import { ObjectId, type Db } from "mongodb";
import { database } from "./mongo";
import { companionSchema, nameKey } from "./companion-domain";
import type { Input } from "./domain";
export class CompanionError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
async function prepareRoster() {
  const db = await database();
  await db
    .collection("companions")
    .createIndex(
      { nameKey: 1 },
      { unique: true, partialFilterExpression: { isDeleted: false } },
    );
  return db;
}
export async function createCompanion(raw: unknown) {
  const input = companionSchema.parse(raw);
  const db = await prepareRoster();
  const now = new Date().toISOString();
  const doc = {
    ...input,
    nameKey: nameKey(input.name),
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
  try {
    const result = await db.collection("companions").insertOne(doc);
    return { ...doc, _id: result.insertedId.toString() };
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === 11000)
      throw new CompanionError("已有同名陪陪，请使用其他名称。", 409);
    throw e;
  }
}
// Link legacy orders once without rewriting the historical name or amounts.
// Import markers survive rename/deletion, so startup never restores removed members.
export async function importLegacyCompanions() {
  const db = await prepareRoster();
  const names = await db
    .collection("orders")
    .distinct("companion", { companionId: { $exists: false } });
  const history = db.collection<{ _id: string; companionId: string }>(
    "companionImports",
  );
  for (const name of names) {
    const key = nameKey(name);
    if (!key) continue;
    let marker = await history.findOne({ _id: key });
    if (!marker) {
      let companion = await db
        .collection("companions")
        .findOne({ nameKey: key, isDeleted: false });
      if (!companion) {
        try {
          const item = await createCompanion({ name, notes: "" });
          companion = { ...item, _id: new ObjectId(item._id) };
        } catch (e) {
          if (!(e instanceof CompanionError && e.status === 409)) throw e;
          companion = await db
            .collection("companions")
            .findOne({ nameKey: key, isDeleted: false });
        }
      }
      if (!companion) throw new Error("陪陪导入失败");
      await history.updateOne(
        { _id: key },
        { $setOnInsert: { companionId: companion._id.toString() } },
        { upsert: true },
      );
      marker = await history.findOne({ _id: key });
    }
    await db
      .collection("orders")
      .updateMany(
        { companion: name, companionId: { $exists: false } },
        { $set: { companionId: marker!.companionId } },
      );
  }
}
export async function listCompanions(q = "") {
  await importLegacyCompanions();
  const db = await database();
  const all = await db.collection("companions").find({ isDeleted: false }).toArray();
  const groups = new Map<string, typeof all>();
  for (const item of all) { const key = nameKey(item.name as string); groups.set(key, [...(groups.get(key) || []), item]); }
  for (const entries of groups.values()) if (entries.length > 1) {
    const keeper = entries.sort((a,b) => Number(Boolean(b.paymentMethod||b.paymentContent||b.paymentImage)) - Number(Boolean(a.paymentMethod||a.paymentContent||a.paymentImage)))[0];
    const duplicates = entries.filter(item => !item._id.equals(keeper._id));
    await Promise.all(duplicates.map(async item => {
      await db.collection("orders").updateMany({ companionId: item._id.toString() }, { $set: { companionId: keeper._id.toString(), companion: keeper.name } });
      await db.collection("companions").updateOne({ _id: item._id }, { $set: { isDeleted: true, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } });
    }));
  }
  const escaped = q
    .trim()
    .slice(0, 200)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return db
    .collection("companions")
    .find({
      isDeleted: false,
      ...(escaped
        ? {
            $or: [
              { name: { $regex: escaped, $options: "i" } },
              { notes: { $regex: escaped, $options: "i" } },
              { paymentMethod: { $regex: escaped, $options: "i" } },
              { paymentContent: { $regex: escaped, $options: "i" } },
            ],
          }
        : {}),
    })
    .sort({ nameKey: 1, _id: 1 })
    .toArray();
}
export async function getCompanion(id: string) {
  const db = await database();
  return db
    .collection("companions")
    .findOne({ _id: new ObjectId(id), isDeleted: false });
}
export async function updateCompanion(id: string, raw: unknown) {
  const v = companionSchema.parse(raw);
  const db = await prepareRoster();
  try {
    return await db
      .collection("companions")
      .findOneAndUpdate(
        { _id: new ObjectId(id), isDeleted: false },
        {
          $set: {
            ...v,
            nameKey: nameKey(v.name),
            updatedAt: new Date().toISOString(),
          },
        },
        { returnDocument: "after" },
      );
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === 11000)
      throw new CompanionError("已有同名陪陪，请使用其他名称。", 409);
    throw e;
  }
}
export async function deleteCompanion(id: string) {
  const db = await database();
  return db
    .collection("companions")
    .updateOne(
      { _id: new ObjectId(id), isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    );
}
export async function resolveOrderCompanion(
  db: Db,
  v: Input,
  old?: { companion: string; companionId?: string },
) {
  if (old && v.companionId === old.companionId && v.companion === old.companion)
    return v;
  if (!v.companionId) return v; // Compatibility for the existing seed and API clients.
  const member = await db
    .collection("companions")
    .findOne({ _id: new ObjectId(v.companionId), isDeleted: false });
  if (!member) throw new CompanionError("这位陪陪已删除或不存在，请重新选择。");
  return { ...v, companion: member.name as string };
}
