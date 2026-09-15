import Link from "next/link";
import { Gamepad2, Layers3, UsersRound } from "lucide-react";
export default function Workspace({
  section,
  children,
}: {
  section: "orders" | "companions";
  children: React.ReactNode;
}) {
  const title = section === "orders" ? "订单管理" : "陪陪管理";
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">
            <Gamepad2 size={25} />
          </span>
          <strong>
            棉花<span>俱乐部</span>
          </strong>
        </div>
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
        </nav>
        <div className="sidebar-bottom">
          <span className="avatar">管</span>
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
          </nav>
          <span className="local-label">LOCAL WORKSPACE</span>
        </header>
        {children}
      </main>
    </div>
  );
}
