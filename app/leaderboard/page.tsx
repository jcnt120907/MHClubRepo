"use client";

import { useEffect, useState } from "react";
import Workspace from "../components/Workspace";
import Leaderboard, { type RankEntry } from "../components/Leaderboard";

function currentMonth() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
}

export default function LeaderboardPage() {
  const [month, setMonth] = useState(currentMonth);
  const [monthly, setMonthly] = useState<RankEntry[]>([]);
  const [allTime, setAllTime] = useState<RankEntry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    fetch("/api/leaderboard?month=" + encodeURIComponent(month), {
      signal: controller.signal,
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        if (!controller.signal.aborted) {
          setMonthly(data.leaderboard.monthly);
          setAllTime(data.leaderboard.allTime);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message || "加载失败");
      });
    return () => controller.abort();
  }, [month]);

  return (
    <Workspace section="leaderboard">
      <div className="content">
        <div className="heading">
          <div>
            <div className="eyebrow">COMPANION RANKING</div>
            <h1>陪陪单量排行榜</h1>
            <p>按订单笔数统计，收入以陪陪工资计算。</p>
          </div>
        </div>
        <div className="month-toolbar">
          <label>
            统计月份
            <input
              type="month"
              aria-label="统计月份"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
            />
          </label>
          <span>月榜包含陪玩、语聊及礼物单；总榜统计全部月份。</span>
        </div>
        {error ? (
          <div className="empty error" role="alert">
            <h3>暂时无法加载排行榜</h3>
            <p>{error}</p>
          </div>
        ) : (
          <Leaderboard monthly={monthly} allTime={allTime} month={month} />
        )}
      </div>
    </Workspace>
  );
}
