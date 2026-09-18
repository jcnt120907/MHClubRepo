import { NextRequest, NextResponse } from "next/server";
import { mergeCompanion, CompanionError } from "@/lib/companions";
export const runtime="nodejs";
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;const {targetId}=await req.json();return NextResponse.json(await mergeCompanion(id,targetId))}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"合并失败"},{status:e instanceof CompanionError?e.status:400})}}
