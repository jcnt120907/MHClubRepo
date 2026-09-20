import { NextRequest, NextResponse } from "next/server";
import { createStoredOrder, listStoredOrders } from "@/lib/stored-orders";
export const runtime="nodejs";
export async function GET(req:NextRequest){try{return NextResponse.json({items:await listStoredOrders(req.nextUrl.searchParams)})}catch{return NextResponse.json({error:"存单列表加载失败，请检查数据库连接。"},{status:503})}}
export async function POST(req:NextRequest){try{const v=await req.json();return NextResponse.json(await createStoredOrder(v.orderId,v.durationMinutes,undefined,{source:v.ownerSource,id:v.ownerId}),{status:201})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"存单保存失败"},{status:400})}}
