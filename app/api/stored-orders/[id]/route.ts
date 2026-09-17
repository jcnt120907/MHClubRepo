import { NextRequest, NextResponse } from "next/server";
import { completeStoredOrder, deleteStoredOrder, updateStoredOrder } from "@/lib/stored-orders";
export const runtime="nodejs";
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;const v=await req.json();const result=v.action==="complete"?await completeStoredOrder(id):await updateStoredOrder(id,v);return result?NextResponse.json(result):NextResponse.json({error:"存单不存在"},{status:404})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"存单更新失败"},{status:400})}}
export async function DELETE(_:NextRequest,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;return (await deleteStoredOrder(id))?NextResponse.json({ok:true}):NextResponse.json({error:"存单不存在"},{status:404})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"存单删除失败"},{status:400})}}
