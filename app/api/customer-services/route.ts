import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { CustomerServiceError, createCustomerService, listCustomerServices } from "@/lib/customer-services";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try { return NextResponse.json({ items: await listCustomerServices(req.nextUrl.searchParams.get("q") || "", req.nextUrl.searchParams.get("month") || "") }); }
  catch { return NextResponse.json({ error: "客服名单加载失败，请检查数据库连接。" }, { status: 503 }); }
}
export async function POST(req: NextRequest) {
  try { return NextResponse.json(await createCustomerService(await req.json()), { status: 201 }); }
  catch (e) {
    const status = e instanceof CustomerServiceError ? e.status : e instanceof ZodError || e instanceof SyntaxError ? 400 : 503;
    return NextResponse.json({ error: e instanceof CustomerServiceError ? e.message : e instanceof ZodError ? e.issues[0].message : "客服保存失败。" }, { status });
  }
}
