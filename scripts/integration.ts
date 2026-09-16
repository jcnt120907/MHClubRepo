import assert from "node:assert/strict";
import { MongoClient, ObjectId } from "mongodb";
import rows from "../data/september.json";
import { createOrder, listOrders, updateOrder, prepare } from "../lib/db";
import { seedSeptember } from "../lib/seed";
import { statsChecks } from "./stats-checks";
import { companionChecks } from "./companion-checks";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017";
process.env.MONGODB_DB = "peiwan_test_" + Date.now();
const db = await prepare();
const input = { ...rows[0], companion: "测试陪陪", notes: "特殊字符 .+ 测试" };
try {
  const records = await Promise.all(
    Array.from({ length: 20 }, () => createOrder(input)),
  );
  assert.equal(new Set(records.map((r) => r.orderNo)).size, 20);
  const t = await createOrder({ ...input, type: "T", service: "文字" });
  assert.equal(t.orderNo, "T0001");
  const l = await createOrder({
    ...input,
    type: "L",
    service: "礼物",
    unitPrice: 0,
    quantity: 0,
    addons: [],
    gift: 100,
  });
  assert.equal(l.orderNo, "L0001");
  const firstP = records.find((record) => record.orderNo === "P0001");
  assert.ok(firstP);
  await db.collection("orders").deleteOne({ _id: new ObjectId(firstP._id) });
  assert.equal((await createOrder(input)).orderNo, "P0001");
  const edited = await updateOrder(t._id, {
    ...input,
    type: "T",
    service: "语音条",
    notes: "更新备注",
  });
  assert.equal(edited?.orderNo, "T0001");
  assert.equal(edited?.notes, "更新备注");
  await assert.rejects(() => updateOrder(t._id, input), /类型/);
  const filtered = await listOrders(
    new URLSearchParams({
      type: "P",
      q: ".+",
      from: "2026-09-01",
      to: "2026-09-30",
      addon: "night",
      companion: "测试陪陪",
      status: "未标记",
    }),
  );
  assert.equal(filtered.summary.count, 20);
  assert.equal(filtered.items.length, 12);
  assert.equal(filtered.summary.total, 400);
  assert.equal(filtered.items[0].orderNo, "P0001");
  const dateSorted = await listOrders(
    new URLSearchParams({ type: "P", sort: "date" }),
  );
  assert.equal(dateSorted.items.length, 12);
  const second = await listOrders(
    new URLSearchParams({ type: "P", page: "2" }),
  );
  assert.equal(second.items.length, 8);
  const none = await listOrders(new URLSearchParams({ q: "不存在" }));
  assert.equal(none.summary.count, 0);
  assert.equal(
    (
      await createOrder({
        ...input,
        type: "L",
        service: "礼物",
        unitPrice: 0,
        quantity: 0,
        addons: [],
        gift: 1,
      })
    ).orderNo,
    "L0002",
  );
  const other = new MongoClient(process.env.MONGODB_URI);
  await other.connect();
  assert.ok(
    await other
      .db(process.env.MONGODB_DB)
      .collection("orders")
      .findOne({ orderNo: "T0001" }),
  );
  await other.close();
  assert.equal(await seedSeptember(), 24);
  assert.equal(await seedSeptember(), 0);
  const sample = await db
    .collection("orders")
    .findOne({ sourceKey: "sep26:2" });
  assert.ok(sample);
  await updateOrder(sample._id.toString(), { ...rows[0], notes: "保留编辑" });
  await db.collection("orders").deleteOne({ sourceKey: "sep26:3" });
  assert.equal(await seedSeptember(), 0);
  assert.equal(
    await db.collection("orders").countDocuments({ sourceKey: "sep26:3" }),
    0,
  );
  assert.equal(
    (await db.collection("orders").findOne({ sourceKey: "sep26:2" }))?.notes,
    "保留编辑",
  );
  console.log(
    "Integration passed: concurrency, reusable IDs, CRUD, filters, pagination, totals, reconnect and seed preserves edits/deletions.",
  );
  await companionChecks();
  await statsChecks();
} finally {
  await db.dropDatabase();
}
process.exit(0);
