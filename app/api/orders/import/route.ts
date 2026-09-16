import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/db";
import { createCompanion, listCompanions } from "@/lib/companions";
import { listCustomerServices } from "@/lib/customer-services";
import { addons, services, type Input } from "@/lib/domain";

type Parsed = { raw: string; input?: Input; requestedOrderNo?: string; errors: string[]; warnings: string[] };
const pick = (text: string, label: string) => text.match(new RegExp(label + "：\\s*([^\\n]+?)(?=\\s+(?:陪陪|客服|服务|礼物|时间|日期)：|$)"))?.[1].trim() || "";
const toTime = (value: string) => {
  const match = value.trim().match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toLowerCase() === "pm") hour += 12;
  return hour * 60 + Number(match[2]);
};
const parseOne = (raw: string): Parsed => {
  const errors: string[] = [], warnings: string[] = [];
  const requestedOrderNo = raw.match(/单号：\s*([PTL]\d{4,})/i)?.[1]?.toUpperCase();
  const type = requestedOrderNo?.[0] as Input["type"] | undefined;
  const companionRaw = pick(raw, "陪陪");
  const companion = companionRaw.split(/[（(]/)[0].trim();
  const customerService = pick(raw, "客服");
  const serviceText = pick(raw, "服务");
  const giftText = pick(raw, "礼物");
  const dateText = pick(raw, "日期").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const timeText = pick(raw, "时间");
  if (!requestedOrderNo || !type) errors.push("找不到有效单号");
  if (!companion) errors.push("找不到陪陪");
  if (!customerService) errors.push("找不到客服");
  if (!dateText) errors.push("找不到日期");
  const start = toTime(timeText.split("-")[0] || "");
  const end = toTime(timeText.split("-")[1] || "");
  if (start === null || end === null) errors.push("找不到有效时间");
  const addonKeys = Object.entries(addons).filter(([, addon]) => raw.includes(addon.label) || (addon.label === "夜单" && /[（(]\s*夜\s*[）)]/.test(raw))).map(([key]) => key as keyof typeof addons);
  if (companionRaw.includes("优等")) addonKeys.push("excellent");
  if (companionRaw.includes("独家")) addonKeys.push("exclusive");
  if (companionRaw.includes("声优")) addonKeys.push("voice");
  const uniqueAddons = [...new Set(addonKeys)];
  const date = dateText ? dateText[3] + "-" + dateText[2].padStart(2,"0") + "-" + dateText[1].padStart(2,"0") : "";
  const minutes = start !== null && end !== null ? ((end - start + 1440) % 1440 || 1440) : 0;
  const service = type === "L" ? "礼物" : type === "P" ? "手游" : /通话|电话/.test(serviceText) ? "语音通话" : /视频/.test(serviceText) ? "视频" : /文字/.test(serviceText) ? "文字" : "语音通话";
  const amount = Number(giftText.match(/(?:单价|RM|¥)?\s*(\d+(?:\.\d+)?)/i)?.[1] || 0);
  if (type === "L" && !amount) errors.push("礼物单需要可识别的金额");
  if (type === "L") uniqueAddons.splice(0, uniqueAddons.length, ...uniqueAddons.filter((key) => ["star","exclusive","popular"].includes(key)));
  if (type === "L" && /夜|续|通话/.test(serviceText)) warnings.push("礼物单已只保留礼物金额；原服务文字会存入备注");
  if (type === "P" && /hok/i.test(serviceText)) warnings.push("HOK 已按手游默认价格计算，原服务名称会存入备注");
  if (type && date && start !== null) return { raw, requestedOrderNo, errors, warnings, input: { type, date, time: String(Math.floor(start/60)).padStart(2,"0") + ":" + String(start%60).padStart(2,"0"), companion, customerService, service, unitPrice: type === "L" ? 0 : services[service], quantity: type === "L" ? 0 : Number((minutes / 60).toFixed(2)), addons: uniqueAddons, gift: type === "L" ? amount : amount, notes: "Telegram 报单：" + raw.replace(/\s+/g," ").trim(), status: "未标记" } };
  return { raw, requestedOrderNo, errors, warnings };
};
const parse = (text: string) => text.split(/^\s*\d+[.、]\s*/m).filter(Boolean).map(parseOne).slice(0,100);
export async function POST(req: NextRequest) {
  try {
    const { text, save } = await req.json();
    if (typeof text !== "string" || !text.trim()) return NextResponse.json({ error: "请贴上 Telegram 报单内容。" }, { status: 400 });
    const items = parse(text);
    if (!save) return NextResponse.json({ items });
    if (items.some((item) => item.errors.length || !item.input)) return NextResponse.json({ error: "请先修正预览中的错误。", items }, { status: 400 });
    const customers = await listCustomerServices();
    for (const item of items) {
      const input = item.input!;
      const customer = customers.find((entry) => entry.name === input.customerService);
      if (!customer) return NextResponse.json({ error: "客服「" + input.customerService + "」不存在，请先在客服管理新增。", items }, { status: 400 });
      let companion = (await listCompanions()).find((entry) => entry.name === input.companion);
      if (!companion) {
        await createCompanion({ name: input.companion, notes: "由 Telegram 批量报单自动新增" });
        companion = (await listCompanions()).find((entry) => entry.name === input.companion);
      }
      input.companionId = companion?._id.toString();
      input.customerServiceId = customer._id.toString();
      await createOrder(input, { importedFrom: "telegram" }, item.requestedOrderNo);
    }
    return NextResponse.json({ created: items.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Telegram 导入失败，请检查格式和单号。" }, { status: 400 });
  }
}
