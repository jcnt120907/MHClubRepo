import { NextRequest, NextResponse } from "next/server";
import { createOrder, listOrders } from "@/lib/db";
import { ZodError } from "zod";
import { CompanionError } from "@/lib/companions";
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
