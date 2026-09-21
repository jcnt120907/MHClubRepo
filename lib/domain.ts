import { z } from "zod";
import Decimal from "decimal.js";
export const services: Record<string, number> = {
  端游: 25,
  手游: 16,
  文字: 15,
  语音条: 18,
  语音通话: 23,
  视频: 57,
  虚拟恋人不买断: 35,
  虚拟恋人买断: 50,
  哄睡: 27,
  挂睡: 8,
  陪看: 15,
  树洞: 20,
  受气包: 20,
  头像: 7,
};
// `unitPrice` stays an hourly rate so that existing orders and custom prices
// keep their meaning.  Half-hour packages have their own fixed charge, so the
// suggested hourly rate is doubled when quantity is 0.5.
export const halfHourPrices: Partial<Record<keyof typeof services, number>> = {
  手游: 10,
  端游: 20,
  文字: 9,
  语音条: 13,
  语音通话: 17,
  视频: 37,
  哄睡: 16,
  虚拟恋人买断: 37,
  虚拟恋人不买断: 27,
  头像: 4,
  陪看: 17,
};
export function unitPriceFor(service: string, quantity: number) {
  const halfHour = halfHourPrices[service as keyof typeof services];
  return quantity === 0.5 && halfHour !== undefined ? halfHour * 2 : services[service];
}
export const types = { P: "陪玩", T: "语聊", L: "礼物" };
export const addons = {
  night: { label: "夜单", price: 4 },
  sweet: { label: "甜蜜", price: 5 },
  technical: { label: "技术", price: 5 },
  voice: { label: "声优", price: 3 },
  excellent: { label: "优等", price: 2 },
  star: { label: "头牌", price: 5 },
  exclusive: { label: "独家", price: 3 },
  popular: { label: "人气", price: 3 },
};
export function addonPrice(key: keyof typeof addons, service: string) {
  return key === "technical" && service === "手游" ? 4 : addons[key].price;
}
export const statuses = [
  "未标记",
  "进行中",
  "可发放",
  "已付款",
] as const;
export function category(service: string) {
  return ["端游", "手游"].includes(service) ? "P" : "T";
}
export function normalizeService(s: string) {
  return (
    (
      {
        通话: "语音通话",
        "陪看 2小时": "陪看",
        "受气包/树洞": "树洞",
      } as Record<string, string>
    )[s] || s
  );
}
const money = z
  .number()
  .finite()
  .min(0)
  .max(1000000)
  .refine((n) => new Decimal(n).decimalPlaces() <= 2, "金额最多两位小数");
export const inputSchema = z
  .object({
    type: z.enum(["P", "T", "L"]),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(
        (s) =>
          !Number.isNaN(Date.parse(s)) &&
          new Date(s).toISOString().slice(0, 10) === s,
        "日期无效",
      ),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    companion: z.string().trim().min(1).max(80),
    companionId: z
      .string()
      .regex(/^[a-f0-9]{24}$/i, "陪陪记录无效")
      .optional(),
    customerService: z.string().trim().max(80).default(""),
    customerServiceId: z
      .string()
      .regex(/^[a-f0-9]{24}$/i, "客服记录无效")
      .optional(),
    service: z.string().max(40),
    unitPrice: money,
    quantity: z.number().finite().min(0).max(10000).multipleOf(0.01),
    addons: z
      .array(
        z.enum([
          "night",
          "sweet",
          "technical",
          "voice",
          "excellent",
          "star",
          "exclusive",
          "popular",
        ]),
      )
      .max(7)
      .transform((a) => [...new Set(a)]),
    gift: money,
    notes: z.string().trim().max(2000),
    status: z.enum(statuses),
  })
  .superRefine((v, c) => {
    if (v.type === "L") {
      if (
        v.service !== "礼物" ||
        v.unitPrice !== 0 ||
        v.quantity !== 0 ||
        v.gift <= 0 ||
        v.addons.some((a) => !["star", "exclusive", "popular"].includes(a))
      )
        c.addIssue({
          code: "custom",
          message: "礼物单需填写礼物金额，不能包含服务费用",
        });
    } else if (
      !(v.service in services) ||
      category(v.service) !== v.type ||
      v.quantity <= 0
    )
      c.addIssue({ code: "custom", message: "服务、数量与订单类型不符" });
  });
export type Input = z.infer<typeof inputSchema>;
export function calculate(v: Input) {
  const add =
    v.type === "L" ? 0 : v.addons.reduce((sum, k) => sum + addonPrice(k, v.service), 0);
  const sub = new Decimal(v.unitPrice).plus(add).times(v.quantity);
  const rate = v.addons.some((k) => k === "star" || k === "popular")
    ? 0.8
    : v.addons.includes("exclusive")
      ? 0.85
      : 0.75;
  const giftRate = rate === 0.75 ? 0.8 : rate;
  const total = sub.plus(v.gift).toDecimalPlaces(2).toNumber();
  const wage = sub
    .times(rate)
    .plus(new Decimal(v.gift).times(giftRate))
    .toDecimalPlaces(2)
    .toNumber();
  return { total, wage, remaining: new Decimal(total).minus(wage).toNumber() };
}
export function orderNumber(type: string, n: number) {
  return type + String(n).padStart(4, "0");
}
export type Order = Input &
  ReturnType<typeof calculate> & {
    _id: string;
    orderNo: string;
    createdAt: string;
    updatedAt: string;
  };
