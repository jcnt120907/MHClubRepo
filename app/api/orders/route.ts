import { NextRequest, NextResponse } from "next/server";
import { createOrder, listOrders, updateOrderStatuses } from "@/lib/db";
import { ZodError, z } from "zod";
import { CompanionError } from "@/lib/companions";
import { statuses } from "@/lib/domain";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try {
    return NextResponse.json(await listOrders(req.nextUrl.searchParams));
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "无法连接数据库，请确认 MongoDB 已启动。" },
      { status: 503 },
    );
  }
}
export async function POST(req: NextRequest) {
  try {
    return NextResponse.json(await createOrder(await req.json()), {
      status: 201,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof CompanionError
            ? e.message
            : e instanceof SyntaxError
              ? "请求格式无效，请提交 JSON。"
              : e instanceof ZodError
                ? e.issues[0].message
                : "保存失败，请检查输入和数据库连接。",
      },
      {
        status:
          e instanceof CompanionError
            ? e.status
            : e instanceof ZodError || e instanceof SyntaxError
              ? 400
              : 503,
      },
    );
  }
}
const bulkStatusSchema = z.object({
  ids: z
    .array(z.string().regex(/^[a-f0-9]{24}$/i, "订单记录无效"))
    .min(1, "请先选择订单")
    .max(100, "一次最多更新 100 笔订单")
    .transform((ids) => [...new Set(ids)]),
  status: z.enum(statuses),
});
export async function PATCH(req: NextRequest) {
  try {
    const { ids, status } = bulkStatusSchema.parse(await req.json());
    const updated = await updateOrderStatuses(ids, status);
    return NextResponse.json({ updated });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof ZodError
            ? e.issues[0].message
            : e instanceof SyntaxError
              ? "请求格式无效，请提交 JSON。"
              : "批量更新失败，请检查数据库连接。",
      },
      { status: e instanceof ZodError || e instanceof SyntaxError ? 400 : 503 },
    );
  }
}
