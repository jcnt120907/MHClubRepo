import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ZodError } from "zod";
import { deleteCustomerService, updateCustomerService } from "@/lib/customer-services";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(req: NextRequest, ctx: Context) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "客服记录无效" }, { status: 400 });
  try {
    const item = await updateCustomerService(id, await req.json());
    return NextResponse.json(item || { error: "客服不存在" }, { status: item ? 200 : 404 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof ZodError ? e.issues[0].message : "客服更新失败。" }, { status: e instanceof ZodError ? 400 : 503 });
  }
}
export async function DELETE(_: NextRequest, ctx: Context) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "客服记录无效" }, { status: 400 });
  try {
    const result = await deleteCustomerService(id);
    return NextResponse.json(result.matchedCount ? { ok: true } : { error: "客服不存在" }, { status: result.matchedCount ? 200 : 404 });
  } catch { return NextResponse.json({ error: "客服删除失败。" }, { status: 503 }); }
}
