import Link from "next/link";
import { Layers3, Trophy, UsersRound } from "lucide-react";
import BrandMark from "./BrandMark";
export default function Workspace({
  section,
  children,
}: {
  section: "orders" | "companions" | "leaderboard";
  children: React.ReactNode;
}) {
  const title =
    section === "orders"
      ? "订单管理"
      : section === "companions"
        ? "陪陪管理"
        : "排行榜";
  return (
    <div className="shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="https://www.instagram.com/cottonstudio.mh/"
          target="_blank"
          rel="noreferrer"
          aria-label="打开棉花陪玩俱乐部 Instagram"
        >
          <BrandMark />
          <strong>
            棉花俱乐部<span>@cottonstudio.mh</span>
          </strong>
        </a>
        <div className="workspace">订单与结算</div>
        <nav className="workspace-nav" aria-label="主导航">
          <Link
            href="/"
            className={section === "orders" ? "nav-active" : "nav-item"}
            aria-current={section === "orders" ? "page" : undefined}
          >
            <Layers3 size={19} />
            订单管理<span>01</span>
          </Link>
          <Link
            href="/companions"
            className={section === "companions" ? "nav-active" : "nav-item"}
            aria-current={section === "companions" ? "page" : undefined}
          >
            <UsersRound size={19} />
            陪陪管理<span>02</span>
          </Link>
          <Link
            href="/leaderboard"
            className={section === "leaderboard" ? "nav-active" : "nav-item"}
            aria-current={section === "leaderboard" ? "page" : undefined}
          >
            <Trophy size={19} />
            单量排行榜<span>03</span>
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <BrandMark compact />
          <div>
            管理工作台<small>本地版本 · MYR</small>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>
            棉花俱乐部 <span className="slash">/</span>
            <b>{title}</b>
          </span>
          <nav className="mobile-nav" aria-label="手机导航">
            <Link
              href="/"
              aria-current={section === "orders" ? "page" : undefined}
            >
              订单
            </Link>
            <Link
              href="/companions"
              aria-current={section === "companions" ? "page" : undefined}
            >
              陪陪管理
            </Link>
            <Link
              href="/leaderboard"
              aria-current={section === "leaderboard" ? "page" : undefined}
            >
              排行榜
            </Link>
          </nav>
        </header>
        {children}
      </main>
    </div>
  );
}
