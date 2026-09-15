import assert from "node:assert/strict";
import {
  createCompanion,
  updateCompanion,
  deleteCompanion,
  getCompanion,
  listCompanions,
  importLegacyCompanions,
  CompanionError,
} from "../lib/companions";
import { createOrder, updateOrder, database } from "../lib/db";
import { companionSchema } from "../lib/companion-domain";
import rows from "../data/september.json";
export async function companionChecks() {
  assert.equal(
    companionSchema.safeParse({ name: "   ", notes: "" }).success,
    false,
  );
  const person = await createCompanion({
    name: " 新陪陪QA ",
    notes: "端游与语聊",
  });
  assert.equal(person.name, "新陪陪QA");
  await assert.rejects(
    () => createCompanion({ name: "新陪陪QA", notes: "duplicate" }),
    (e) => e instanceof CompanionError && e.status === 409,
  );
  const order = await createOrder({
    ...rows[0],
    companionId: person._id,
    companion: "客户端假名字",
  });
  assert.equal(order.companion, "新陪陪QA");
  await updateCompanion(person._id, {
    name: "新陪陪改名QA",
    notes: "改名后的备注",
  });
  assert.equal((await getCompanion(person._id))?.name, "新陪陪改名QA");
  assert.equal((await listCompanions("改名后的备注")).length, 1);
  const db = await database();
  assert.equal(
    (await db.collection("orders").findOne({ orderNo: order.orderNo }))
      ?.companion,
    "新陪陪QA",
  );
  const another = await createOrder({
    ...rows[0],
    companionId: person._id,
    companion: "新陪陪QA",
  });
  assert.equal(another.companion, "新陪陪改名QA");
  assert.equal((await deleteCompanion(person._id)).matchedCount, 1);
  assert.equal(await getCompanion(person._id), null);
  assert.equal((await listCompanions("新陪陪改名QA")).length, 0);
  await assert.rejects(
    () => createOrder({ ...rows[0], companionId: person._id }),
    (e) => e instanceof CompanionError,
  );
  const edited = await updateOrder(order._id, {
    ...order,
    notes: "删除陪陪后仍能编辑订单",
  });
  assert.equal(edited?.companion, "新陪陪QA");
  assert.equal(
    await db.collection("orders").countDocuments({ companionId: person._id }),
    2,
  );
  assert.equal((await deleteCompanion(person._id)).matchedCount, 0);
  const legacy = await db
    .collection("companions")
    .findOne({ name: "小孩", isDeleted: false });
  assert.ok(legacy);
  await updateCompanion(legacy._id.toString(), { name: "小孩更名", notes: "" });
  await importLegacyCompanions();
  assert.equal((await listCompanions("小孩")).length, 1);
  await deleteCompanion(legacy._id.toString());
  await importLegacyCompanions();
  assert.equal((await listCompanions("小孩")).length, 0);
  console.log(
    "Companions passed: CRUD, uniqueness, legacy migration, order selection, rename/delete history preservation.",
  );
}
