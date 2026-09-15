"use client";
import { useState } from "react";
import { Trophy } from "lucide-react";
export type RankEntry={id:string;name:string;count:number;earnings:number;rank:number};
export default function Leaderboard({monthly,allTime,month}:{monthly:RankEntry[];allTime:RankEntry[];month:string}){
 const [period,setPeriod]=useState<"monthly"|"allTime">("monthly");const entries=period==="monthly"?monthly:allTime;
 return <section className="orders-panel leaderboard"><div className="panel-title"><h2><Trophy size={19}/> 陪陪单量排行榜</h2><div className="rank-switch"><button className={period==="monthly"?"selected":""} onClick={()=>setPeriod("monthly")}>每月</button><button className={period==="allTime"?"selected":""} onClick={()=>setPeriod("allTime")}>总量</button></div></div><p className="rank-caption">{period==="monthly"?month+" 月榜":"全部月份总榜"} · 按订单笔数排名，同单量按收入排序</p><div className="rank-grid">{entries.slice(0,10).map(p=><div className="rank-person" key={p.id}><span className={"rank-number podium-"+p.rank}>{String(p.rank).padStart(2,"0")}</span><strong>{p.name}</strong><div><b>{p.count} <small>单</small></b><span>RM {p.earnings.toFixed(2)}</span></div></div>)}</div>{!entries.length&&<p className="rank-empty">{period==="monthly"?"这个月还没有订单":"还没有订单记录"}</p>}<p className="rank-caption">显示前10名 · 收入为陪陪工资（含未付款订单），不等于已到账金额。</p></section>;
}
