import { test } from "node:test";
import assert from "node:assert/strict";
import rows from "../data/september.json";
import {
  calculate,
  inputSchema,
  normalizeService,
  orderNumber,
  category,
  unitPriceFor,
  type Input,
} from "../lib/domain";
const base = inputSchema.parse(rows[0]);
test("all 24 workbook records reconcile", () => {
  assert.equal(rows.length, 24);
  for (const row of rows) {
    assert.deepEqual(
      calculate(inputSchema.parse(row)),
      row.expected,
      row.sourceKey,
    );
    assert.equal(category(row.service), row.type);
  }
});
test("price overrides, fractional quantities and gifts", () => {
  assert.deepEqual(
    calculate({ ...base, unitPrice: 10, quantity: 1.5, gift: 5 }),
    { total: 26, wage: 19.75, remaining: 6.25 },
  );
});
test("half-hour packages use their current fixed prices", () => {
  const halfHour = (service: Input["service"], expected: number) => {
    const input = { ...base, type: category(service), service, quantity: 0.5, unitPrice: unitPriceFor(service, 0.5), addons: [], gift: 0 } as Input;
    assert.equal(calculate(inputSchema.parse(input)).total, expected, service);
  };
  halfHour("手游", 10); halfHour("端游", 20); halfHour("文字", 9); halfHour("语音条", 13);
  halfHour("语音通话", 17); halfHour("视频", 37); halfHour("哄睡", 16); halfHour("虚拟恋人买断", 37);
  halfHour("虚拟恋人不买断", 27); halfHour("头像", 4); halfHour("陪看", 17);
  assert.equal(unitPriceFor("手游", 1), 16);
});
test("exclusive payout and star/popular precedence", () => {
  assert.equal(
    calculate({ ...base, addons: ["exclusive"], gift: 10 }).wage,
    24.65,
  );
  assert.equal(
    calculate({ ...base, addons: ["exclusive", "star"], gift: 10 }).wage,
    27.2,
  );
  assert.equal(
    calculate({ ...base, addons: ["exclusive", "popular"], gift: 10 }).wage,
    25.6,
  );
});
test("gift-only payout with no service surcharges", () => {
  const gift: Input = {
    ...base,
    type: "L",
    service: "礼物",
    quantity: 0,
    unitPrice: 0,
    addons: [],
    gift: 100,
  };
  assert.equal(calculate(inputSchema.parse(gift)).wage, 80);
  assert.equal(calculate({ ...gift, addons: ["exclusive"] }).wage, 85);
  assert.equal(calculate({ ...gift, addons: ["exclusive", "star"] }).wage, 80);
  assert.equal(
    inputSchema.safeParse({ ...gift, addons: ["night"] }).success,
    false,
  );
});
test("money rounds half up and balances", () => {
  assert.deepEqual(
    calculate({ ...base, unitPrice: 0.01, quantity: 2, addons: [], gift: 0 }),
    { total: 0.02, wage: 0.02, remaining: 0 },
  );
});
test("reject invalid date, types, quantities, amounts", () => {
  for (const value of [
    { date: "2026-02-30" },
    { quantity: 0 },
    { gift: -1 },
    { unitPrice: 1.001 },
    { type: "T" },
    { time: "25:00" },
    { companion: "   " },
  ])
    assert.equal(inputSchema.safeParse({ ...base, ...value }).success, false);
});
test("service aliases and numbers expand past 9999", () => {
  assert.equal(normalizeService("通话"), "语音通话");
  assert.equal(normalizeService("陪看 2小时"), "陪看");
  assert.equal(normalizeService("受气包/树洞"), "树洞");
  assert.equal(orderNumber("P", 1), "P0001");
  assert.equal(orderNumber("P", 10000), "P10000");
});
