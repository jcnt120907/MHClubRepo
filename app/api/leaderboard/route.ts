import { NextRequest, NextResponse } from "next/server";
import { companionDashboard, monthRange } from "@/lib/companion-stats";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") || "";
  try {
    monthRange(month);
  } catch {
    return NextResponse.json({ error: "请选择有效月份。" }, { status: 400 });
  }
  try {
    return NextResponse.json(await companionDashboard("", month));
  } catch {
    return NextResponse.json(
      { error: "排行榜加载失败，请检查数据库连接。" },
      { status: 503 },
    );
  }
}
