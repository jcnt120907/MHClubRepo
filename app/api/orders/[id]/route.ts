import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { database, updateOrder } from "@/lib/db";
import { ZodError } from "zod";
import { CompanionError } from "@/lib/companions";
type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export async function PATCH(req: NextRequest, c: Context) {
  const { id } = await c.params;
  if (!ObjectId.isValid(id))
    return NextResponse.json({ error: "单号记录无效" }, { status: 400 });
  try {
    const doc = await updateOrder(id, await req.json());
    return NextResponse.json(doc || { error: "订单不存在" }, {
      status: doc ? 200 : 404,
    });
  } catch (e) {
    const typeChange =
      e instanceof Error && e.message === "不能更改订单类型，请重新开单";
    const invalid =
      e instanceof CompanionError ||
      e instanceof ZodError ||
      e instanceof SyntaxError ||
      typeChange;
    return NextResponse.json(
      {
        error:
          e instanceof CompanionError
            ? e.message
            : e instanceof ZodError
              ? e.issues[0].message
              : e instanceof SyntaxError
                ? "请求格式无效，请提交 JSON。"
                : typeChange
                  ? e.message
                  : "更新失败，请检查数据库连接。",
      },
      { status: invalid ? 400 : 503 },
    );
  }
}
export async function DELETE(req: NextRequest, c: Context) {
  const { id } = await c.params;
  if (!ObjectId.isValid(id))
    return NextResponse.json({ error: "记录无效" }, { status: 400 });
  try {
    const db = await database();
    const r = await db
      .collection("orders")
      .deleteOne({ _id: new ObjectId(id) });
    if (r.deletedCount)
      await db.collection("storedOrders").deleteMany({ orderId: id });
    return NextResponse.json(
      r.deletedCount ? { ok: true } : { error: "订单不存在" },
      { status: r.deletedCount ? 200 : 404 },
    );
  } catch {
    return NextResponse.json(
      { error: "删除失败，请检查数据库连接。" },
      { status: 503 },
    );
  }
}
