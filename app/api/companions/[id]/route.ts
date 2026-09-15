import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ZodError } from "zod";
import {
  CompanionError,
  getCompanion,
  updateCompanion,
  deleteCompanion,
} from "@/lib/companions";
type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export async function GET(_req: NextRequest, ctx: Context) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id))
    return NextResponse.json({ error: "陪陪记录无效" }, { status: 400 });
  try {
    const item = await getCompanion(id);
    return NextResponse.json(item || { error: "陪陪不存在" }, {
      status: item ? 200 : 404,
    });
  } catch {
    return NextResponse.json(
      { error: "无法读取陪陪资料，请检查数据库连接。" },
      { status: 503 },
    );
  }
}
export async function PATCH(req: NextRequest, ctx: Context) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id))
    return NextResponse.json({ error: "陪陪记录无效" }, { status: 400 });
  try {
    const item = await updateCompanion(id, await req.json());
    return NextResponse.json(item || { error: "陪陪不存在" }, {
      status: item ? 200 : 404,
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
                : "更新失败，请检查数据库连接。",
      },
      { status },
    );
  }
}
export async function DELETE(_req: NextRequest, ctx: Context) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id))
    return NextResponse.json({ error: "陪陪记录无效" }, { status: 400 });
  try {
    const result = await deleteCompanion(id);
    return NextResponse.json(
      result.matchedCount ? { ok: true } : { error: "陪陪不存在" },
      { status: result.matchedCount ? 200 : 404 },
    );
  } catch {
    return NextResponse.json(
      { error: "删除失败，请检查数据库连接。" },
      { status: 503 },
    );
  }
}
