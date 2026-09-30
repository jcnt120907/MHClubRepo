"use client";

import { useState } from "react";
import { Check, Copy, Trophy } from "lucide-react";

export type RankEntry = { id: string; name: string; count: number; earnings: number; rank: number };

export default function Leaderboard({ monthly, allTime, month }: { monthly: RankEntry[]; allTime: RankEntry[]; month: string }) {
  const [period, setPeriod] = useState<"monthly" | "allTime">("monthly");
  const [copied, setCopied] = useState<"top" | "all" | null>(null);
  const entries = period === "monthly" ? monthly : allTime;
  const label = period === "monthly" ? `${month} 月榜` : "总榜";

  const copyChatRecord = async (kind: "top" | "all") => {
    const selected = kind === "top" ? entries.slice(0, 10) : entries;
    const lines = [
      `🏆 棉花俱乐部陪陪单量排行榜｜${label}`,
      "",
      ...selected.map((entry, index) => kind === "top"
        ? `${index + 1}. ${entry.name}｜${entry.count} 单量｜RM ${entry.earnings.toFixed(2)}`
        : `${index + 1}. ${entry.name}｜${entry.count} 单量`),
      "",
      "统计方式：半小时 = 1 单量，1 小时 = 2 单量；不计算礼物单。",
    ];
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2200);
    } catch {
      window.prompt("复制以下聊天记录", text);
    }
  };

  return <section className="orders-panel leaderboard">
    <div className="panel-title">
      <h2><Trophy size={19} /> 陪陪单量排行榜</h2>
      <div className="rank-actions">
        <div className="rank-switch">
          <button className={period === "monthly" ? "selected" : ""} onClick={() => setPeriod("monthly")}>每月</button>
          <button className={period === "allTime" ? "selected" : ""} onClick={() => setPeriod("allTime")}>总量</button>
        </div>
        <button className="secondary rank-copy" onClick={() => copyChatRecord("top")}>{copied === "top" ? <Check size={16} /> : <Copy size={16} />} {copied === "top" ? "已复制" : "复制前10"}</button>
        <button className="secondary rank-copy" onClick={() => copyChatRecord("all")}>{copied === "all" ? <Check size={16} /> : <Copy size={16} />} {copied === "all" ? "已复制" : "复制全部单量"}</button>
      </div>
    </div>
    <p className="rank-caption">{label} · 按服务时长单量排名，同单量按收入排序</p>
    <div className="rank-grid">{entries.slice(0, 10).map(entry => <div className="rank-person" key={entry.id}><span className={`rank-number podium-${entry.rank}`}>{String(entry.rank).padStart(2, "0")}</span><strong>{entry.name}</strong><div><b>{entry.count} <small>单量</small></b><span>RM {entry.earnings.toFixed(2)}</span></div></div>)}</div>
    {!entries.length && <p className="rank-empty">{period === "monthly" ? "这个月还没有服务订单" : "还没有服务订单记录"}</p>}
    <p className="rank-caption">显示前10名 · 半小时 = 1 单量、1 小时 = 2 单量；收入为陪陪工资，不计算礼物单。</p>
  </section>;
}
