import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  CompanionError,
  createCompanion,
  listCompanions,
} from "@/lib/companions";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      items: await listCompanions(req.nextUrl.searchParams.get("q") || ""),
    });
  } catch {
    return NextResponse.json(
      { error: "无法加载陪陪名单，请检查数据库连接。" },
      { status: 503 },
    );
  }
}
export async function POST(req: NextRequest) {
  try {
    return NextResponse.json(await createCompanion(await req.json()), {
      status: 201,
    });
  } catch (e) {
    const status =
      e instanceof CompanionError
        ? e.status
        : e instanceof ZodError || e instanceof SyntaxError
          ? 400
          : 503;
    return NextResponse.json(
      {
        error:
          e instanceof CompanionError
            ? e.message
            : e instanceof ZodError
              ? e.issues[0].message
              : status === 400
                ? "请求格式无效。"
                : "保存失败，请检查数据库连接。",
      },
      { status },
    );
  }
}
