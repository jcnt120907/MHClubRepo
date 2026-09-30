import { NextRequest, NextResponse } from "next/server";
import { confirmCompanionPayments, pendingCompanionPayments, settlementPeriod } from "@/lib/companion-payments";
export const runtime = "nodejs";
export async function GET(req: NextRequest) { try { const month = req.nextUrl.searchParams.get("month") || ""; const half = req.nextUrl.searchParams.get("half") || ""; settlementPeriod(month, half); return NextResponse.json(await pendingCompanionPayments(month, half)); } catch (error) { const invalidPeriod = error instanceof Error && error.message === "结算期无效"; return NextResponse.json({ error: invalidPeriod ? "结算期无效" : "付款资料加载失败，请检查数据库连接。" }, { status: invalidPeriod ? 400 : 503 }); } }
export async function POST(req: NextRequest) { try { return NextResponse.json(await confirmCompanionPayments(await req.json())); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "付款确认失败" }, { status: 400 }); } }
