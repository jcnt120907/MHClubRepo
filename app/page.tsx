"use client";
import { useEffect, useState } from "react";
import Workspace from "./components/Workspace";
import Modal from "./components/Modal";
import type { Companion } from "@/lib/companion-domain";
import {
  Plus,
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  Gamepad2,
  MessageCircle,
  Gift,
  Layers3,
  X,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  RefreshCw,
  Wallet,
  Coins,
} from "lucide-react";
import {
  addons,
  calculate,
  category,
  services,
  statuses,
  types,
  type Input,
  type Order,
} from "@/lib/domain";
const rm = (v: number) =>
  new Intl.NumberFormat("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
const initialFilters = {
  q: "",
  from: "2026-09-01",
  to: "2026-09-30",
  type: "",
  companion: "",
  service: "",
  status: "",
  addon: "",
};
type Filters = typeof initialFilters;
type Data = {
  items: Order[];
  summary: { count: number; total: number; wage: number; remaining: number };
  companions: string[];
  page: number;
  pageSize: number;
};
function fresh(): Input {
  const now = new Date();
  return {
    type: "P",
    date: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kuala_Lumpur",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now),
    time: new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kuala_Lumpur",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now),
    companion: "",
    service: "手游",
    unitPrice: 16,
    quantity: 1,
    addons: [],
    gift: 0,
    notes: "",
    status: "未标记",
  };
}
export default function Page() {
  const [filters, setFilters] = useState(initialFilters),
    [search, setSearch] = useState(initialFilters.q),
    [page, setPage] = useState(1),
    [data, setData] = useState<Data | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [showMore, setShowMore] = useState(false),
    [revision, setRevision] = useState(0),
    [editor, setEditor] = useState<Order | "new" | null>(null),
    [deleting, setDeleting] = useState<Order | null>(null),
    [paymentFor, setPaymentFor] = useState<Companion | null>(null),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState("");
  const update = (k: keyof Filters, v: string) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) =>
        current.q === search ? current : { ...current, q: search },
      );
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    (async () => {
      try {
        const p = new URLSearchParams({ ...filters, page: String(page) });
        const r = await fetch("/api/orders?" + p, {
          signal: controller.signal,
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setData(d);
        if (
          d.summary.count > 0 &&
          page > Math.ceil(d.summary.count / d.pageSize)
        )
          setPage(Math.ceil(d.summary.count / d.pageSize));
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => {
      controller.abort();
    };
  }, [filters, page, revision]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const saved = (message: string) => {
    setEditor(null);
    setDeleting(null);
    setRevision((v) => v + 1);
    setToast(message);
  };
  async function showPayment(name: string) {
    try {
      const r = await fetch("/api/companions?q=" + encodeURIComponent(name));
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      const member = d.items.find((m: Companion) => m.name === name);
      if (!member) throw new Error("找不到这位陪陪的付款资料。");
      setPaymentFor(member);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "付款资料加载失败");
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      const r = await fetch("/api/orders/" + deleting._id, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error((await r.json()).error);
      saved("订单已删除，单号保留不再使用");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }
  const s = error ? undefined : data?.summary;
  return (
    <Workspace section="orders">
      <div className="content">
        <div className="heading">
          <div>
            <div className="eyebrow">ORDER MANAGEMENT</div>
            <h1>陪玩单管理</h1>
            <p>管理陪玩、语聊与礼物订单，查看收入和陪陪工资。</p>
          </div>
          <button className="primary" onClick={() => setEditor("new")}>
            <Plus size={18} />
            新增订单
          </button>
        </div>
        <section className="stats" aria-label="筛选结果汇总">
          <div className="stat">
            <span>
              订单总数
              <Layers3 size={18} />
            </span>
            <strong>
              {s?.count ?? "—"}
              <small>单</small>
            </strong>
            <p>当前筛选范围</p>
          </div>
          <div className="stat accent">
            <span>
              订单总金额
              <ArrowUpRight size={19} />
            </span>
            <strong>
              <small>RM</small>
              {s ? rm(s.total) : "—"}
            </strong>
            <p>服务金额 + 礼物金额</p>
          </div>
          <div className="stat">
            <span>
              陪陪工资
              <Wallet size={18} />
            </span>
            <strong>
              <small>RM</small>
              {s ? rm(s.wage) : "—"}
            </strong>
            <p>按订单分成规则计算</p>
          </div>
          <div className="stat">
            <span>
              剩下金额
              <Coins size={18} />
            </span>
            <strong>
              <small>RM</small>
              {s ? rm(s.remaining) : "—"}
            </strong>
            <p>总金额 − 陪陪工资</p>
          </div>
        </section>
        <section className="orders-panel">
          <div className="panel-title">
            <h2>
              订单明细 <span>{s?.count ?? 0}</span>
            </h2>
            <button
              className="icon-btn"
              aria-label="刷新订单"
              onClick={() => setRevision((v) => v + 1)}
            >
              <RefreshCw size={17} />
            </button>
          </div>
          <div className="tabs" role="group" aria-label="订单类型">
            {[
              ["", "全部订单", Layers3],
              ["P", "陪玩", Gamepad2],
              ["T", "语聊", MessageCircle],
              ["L", "礼物", Gift],
            ].map(([key, label, Icon]) => (
              <button
                key={String(key)}
                className={filters.type === key ? "tab selected" : "tab"}
                onClick={() => {
                  update("type", String(key));
                  update("service", "");
                }}
              >
                {typeof Icon !== "string" && <Icon size={16} />} {String(label)}
              </button>
            ))}
          </div>
          <div className="filter-row">
            <label className="search">
              <Search size={18} />
              <input
                aria-label="搜索订单"
                placeholder="搜索单号、陪陪、服务或备注"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="date-filter">
              <span>日期</span>
              <input
                aria-label="开始日期"
                type="date"
                value={filters.from}
                onChange={(e) => update("from", e.target.value)}
              />
              <span>—</span>
              <input
                aria-label="结束日期"
                type="date"
                value={filters.to}
                onChange={(e) => update("to", e.target.value)}
              />
            </label>
            <button
              className={showMore ? "secondary active" : "secondary"}
              onClick={() => setShowMore((v) => !v)}
            >
              <SlidersHorizontal size={16} />
              筛选
            </button>
            <button
              className="text-btn"
              onClick={() => {
                setFilters({ ...initialFilters, from: "", to: "" });
                setSearch("");
                setPage(1);
              }}
            >
              重置
            </button>
          </div>
          {showMore && (
            <div className="extra-filters">
              <label>
                陪陪
                <select
                  value={filters.companion}
                  onChange={(e) => update("companion", e.target.value)}
                >
                  <option value="">全部陪陪</option>
                  {data?.companions.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                服务
                <select
                  value={filters.service}
                  onChange={(e) => update("service", e.target.value)}
                >
                  <option value="">全部服务</option>
                  {Object.keys(services)
                    .filter(
                      (n) => !filters.type || category(n) === filters.type,
                    )
                    .map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  {(!filters.type || filters.type === "L") && (
                    <option>礼物</option>
                  )}
                </select>
              </label>
              <label>
                状态
                <select
                  value={filters.status}
                  onChange={(e) => update("status", e.target.value)}
                >
                  <option value="">全部状态</option>
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                附加项目
                <select
                  value={filters.addon}
                  onChange={(e) => update("addon", e.target.value)}
                >
                  <option value="">全部项目</option>
                  {Object.entries(addons).map(([k, a]) => (
                    <option key={k} value={k}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {error ? (
            <div className="empty error" role="alert">
              <h3>暂时无法加载订单</h3>
              <p>{error}</p>
              <button
                className="secondary"
                onClick={() => setRevision((v) => v + 1)}
              >
                重试
              </button>
            </div>
          ) : (
            <>
              <div
                className={"table-wrap " + (loading ? "loading" : "")}
                aria-busy={loading}
              >
                <table>
                  <thead>
                    <tr>
                      <th>单号 / 日期</th>
                      <th>陪陪</th>
                      <th>服务 / 数量</th>
                      <th>附加项目</th>
                      <th className="number">总金额</th>
                      <th className="number">陪陪工资</th>
                      <th className="number">剩下</th>
                      <th>状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.items.map((o) => (
                      <tr key={o._id}>
                        <td>
                          <span className="order-no">{o.orderNo}</span>
                          <small>
                            {o.date.slice(5)}{" "}
                            <span className="muted">{o.time}</span>
                          </small>
                        </td>
                        <td>
                          <button
                            className="person payment-link"
                            onClick={() => showPayment(o.companion)}
                            aria-label={"查看 " + o.companion + " 的付款资料"}
                          >
                            <span className={"person-icon " + o.type}>
                              {o.companion.slice(0, 1)}
                            </span>
                            <b>{o.companion}</b>
                          </button>
                        </td>
                        <td>
                          <span>{o.service}</span>
                          <small>
                            {o.type === "L"
                              ? "独立礼物"
                              : `${o.quantity} ${o.service === "陪看" ? "份（2小时）" : "小时 / 局"}`}
                            {o.gift > 0 && o.type !== "L" ? " · 附带礼物" : ""}
                          </small>
                        </td>
                        <td>
                          <div className="tags">
                            {o.addons.length ? (
                              o.addons.map((k) => (
                                <span key={k}>{addons[k].label}</span>
                              ))
                            ) : (
                              <span className="no-tag">—</span>
                            )}
                          </div>
                          {o.notes && (
                            <small className="note" title={o.notes}>
                              {o.notes}
                            </small>
                          )}
                        </td>
                        <td className="number total">{rm(o.total)}</td>
                        <td className="number">{rm(o.wage)}</td>
                        <td className="number muted">{rm(o.remaining)}</td>
                        <td>
                          <span
                            className={
                              "status status-" + statuses.indexOf(o.status)
                            }
                          >
                            {o.status}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="icon-btn"
                              aria-label={"编辑 " + o.orderNo}
                              onClick={() => setEditor(o)}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="icon-btn delete"
                              aria-label={"删除 " + o.orderNo}
                              onClick={() => setDeleting(o)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data?.items.length && (
                  <div className="empty">
                    <Search size={28} />
                    <h3>{loading ? "正在加载订单…" : "没有符合条件的订单"}</h3>
                    <p>
                      {loading ? "请稍候" : "调整筛选条件，或新增一笔订单。"}
                    </p>
                  </div>
                )}
              </div>
              <footer className="pagination">
                <span>
                  共 {s?.count ?? 0} 条订单 · 金额单位 RM{" "}
                  {loading && " · 更新中…"}
                </span>
                <div>
                  <button
                    className="icon-btn"
                    disabled={page <= 1 || loading}
                    aria-label="上一页"
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <span>
                    {page} / {Math.max(1, Math.ceil((s?.count || 0) / 12))}
                  </span>
                  <button
                    className="icon-btn"
                    disabled={page * 12 >= (s?.count || 0) || loading}
                    aria-label="下一页"
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              </footer>
            </>
          )}
        </section>
        <div className="page-foot">
          棉花俱乐部<span>单号自动生成 · L 礼物 / P 陪玩 / T 语聊</span>
        </div>
      </div>
      {editor && (
        <Editor
          order={editor}
          onClose={() => setEditor(null)}
          onSaved={() =>
            saved(
              editor === "new"
                ? "订单已保存；若未显示，请检查筛选条件"
                : "订单已更新",
            )
          }
        />
      )}
      {deleting && (
        <Modal onClose={() => !busy && setDeleting(null)} title="删除订单">
          <div className="confirm">
            <p>
              确定删除 <strong>{deleting.orderNo}</strong>（{deleting.companion}
              ）？
            </p>
            <p className="muted">删除后无法恢复，单号不会再次使用。</p>
            <div className="dialog-actions">
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setDeleting(null)}
              >
                取消
              </button>
              <button className="danger" disabled={busy} onClick={remove}>
                {busy ? "删除中…" : "确认删除"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {paymentFor && (
        <Modal
          title={"付款资料 · " + paymentFor.name}
          onClose={() => setPaymentFor(null)}
        >
          <div className="payment-details">
            <div>
              <span>付款方式</span>
              <strong>{paymentFor.paymentMethod || "未填写"}</strong>
            </div>
            <div>
              <span>付款内容</span>
              <strong className="payment-text">
                {paymentFor.paymentContent || "未填写"}
              </strong>
            </div>
            {paymentFor.paymentImage && (
              <img src={paymentFor.paymentImage} alt={paymentFor.name + " 的付款图片"} />
            )}
            {!paymentFor.paymentContent && !paymentFor.paymentImage && (
              <p className="muted">这位陪陪暂未填写付款资料。</p>
            )}
            <div className="dialog-actions">
              <button className="primary" onClick={() => setPaymentFor(null)}>
                关闭
              </button>
            </div>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </Workspace>
  );
}
function Editor({
  order,
  onClose,
  onSaved,
}: {
  order: Order | "new";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [v, setV] = useState<Input>(order === "new" ? fresh() : order),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [members, setMembers] = useState<Companion[]>([]);
  const [rosterError, setRosterError] = useState("");
  const [rosterLoading, setRosterLoading] = useState(true);
  const [rosterRevision, setRosterRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setRosterLoading(true);
    setRosterError("");
    fetch("/api/companions", { signal: controller.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (!controller.signal.aborted) setMembers(d.items);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setRosterError(e.message || "名单加载失败");
      })
      .finally(() => {
        if (!controller.signal.aborted) setRosterLoading(false);
      });
    return () => controller.abort();
  }, [rosterRevision]);
  const set = <K extends keyof Input>(k: K, value: Input[K]) =>
    setV((prev) => ({ ...prev, [k]: value }));
  const sums = calculate(v);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        "/api/orders" + (order === "new" ? "" : "/" + order._id),
        {
          method: order === "new" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(v),
        },
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={order === "new" ? "新增订单" : "编辑订单 · " + order.orderNo}
      onClose={() => !busy && onClose()}
    >
      <form onSubmit={submit}>
        <div className="form-body">
          <div className="form-section-label">01 / 基本信息</div>
          <div className="type-picker">
            {Object.entries(types).map(([k, label]) => (
              <button
                key={k}
                type="button"
                disabled={order !== "new" || busy}
                className={v.type === k ? "chosen" : ""}
                onClick={() =>
                  setV({
                    ...v,
                    type: k as Input["type"],
                    service: k === "L" ? "礼物" : k === "P" ? "手游" : "文字",
                    unitPrice: k === "L" ? 0 : k === "P" ? 16 : 15,
                    quantity: k === "L" ? 0 : 1,
                    addons: [],
                  })
                }
              >
                {k === "P" ? (
                  <Gamepad2 size={19} />
                ) : k === "T" ? (
                  <MessageCircle size={19} />
                ) : (
                  <Gift size={19} />
                )}{" "}
                {label}
                <span>{k} 自动编号</span>
              </button>
            ))}
          </div>
          <div className="form-grid">
            <label>
              日期
              <input
                required
                type="date"
                value={v.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </label>
            <label>
              时间
              <input
                required
                type="time"
                value={v.time}
                onChange={(e) => set("time", e.target.value)}
              />
            </label>
            <div>
              <label htmlFor="order-companion">陪陪</label>
              <select
                id="order-companion"
                required
                disabled={rosterLoading}
                value={v.companionId || (order !== "new" ? "__original" : "")}
                onChange={(e) => {
                  if (
                    order !== "new" &&
                    e.target.value === (order.companionId || "__original")
                  ) {
                    setV((prev) => ({
                      ...prev,
                      companionId: order.companionId,
                      companion: order.companion,
                    }));
                    return;
                  }
                  const member = members.find((m) => m._id === e.target.value);
                  setV((prev) => ({
                    ...prev,
                    companionId: member?._id,
                    companion: member?.name || "",
                  }));
                }}
              >
                <option value="">
                  {rosterLoading ? "加载名单中…" : "请选择陪陪"}
                </option>
                {order !== "new" && (
                  <option value={order.companionId || "__original"}>
                    {order.companion}（原订单）
                  </option>
                )}
                {members
                  .filter((m) => order === "new" || m._id !== order.companionId)
                  .map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name}
                    </option>
                  ))}
              </select>
              <span className="roster-tools">
                <a href="/companions" target="_blank" rel="noopener noreferrer">
                  管理名单 ↗
                </a>
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => setRosterRevision((n) => n + 1)}
                >
                  刷新名单
                </button>
              </span>
              {rosterError && (
                <span className="field-error" role="alert">
                  {rosterError}
                </span>
              )}
              {!rosterLoading && !rosterError && !members.length && (
                <span className="field-help">
                  还没有陪陪，请先在陪陪管理中新增。
                </span>
              )}
            </div>
            <label>
              状态
              <select
                value={v.status}
                onChange={(e) =>
                  set("status", e.target.value as Input["status"])
                }
              >
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-section-label">02 / 服务与费用</div>
          {v.type !== "L" && (
            <div className="form-grid three">
              <label>
                服务
                <select
                  value={v.service}
                  onChange={(e) =>
                    setV({
                      ...v,
                      service: e.target.value,
                      unitPrice: services[e.target.value],
                    })
                  }
                >
                  {Object.keys(services)
                    .filter((s) => category(s) === v.type)
                    .map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                </select>
              </label>
              <label>
                单价（RM）
                <input
                  required
                  type="number"
                  min="0"
                  max="1000000"
                  step="0.01"
                  value={v.unitPrice}
                  onChange={(e) => set("unitPrice", Number(e.target.value))}
                />
              </label>
              <label>
                {v.service === "陪看" ? "份数（每份2小时）" : "小时 / 局"}
                <input
                  required
                  type="number"
                  min="0.01"
                  max="10000"
                  step="0.01"
                  value={v.quantity}
                  onChange={(e) => set("quantity", Number(e.target.value))}
                />
              </label>
            </div>
          )}
          <div className="check-label">
            {v.type === "L" ? "分成选项" : "附加项目（每小时 / 局）"}
          </div>
          <div className="addon-picker">
            {Object.entries(addons)
              .filter(
                ([k]) =>
                  v.type !== "L" ||
                  ["star", "exclusive", "popular"].includes(k),
              )
              .map(([k, a]) => (
                <label
                  key={k}
                  className={
                    v.addons.includes(k as keyof typeof addons) ? "checked" : ""
                  }
                >
                  <input
                    type="checkbox"
                    checked={v.addons.includes(k as keyof typeof addons)}
                    onChange={(e) =>
                      set(
                        "addons",
                        e.target.checked
                          ? [...v.addons, k as keyof typeof addons]
                          : v.addons.filter((a) => a !== k),
                      )
                    }
                  />
                  {a.label}
                  {v.type !== "L" && <small>+{a.price}</small>}
                </label>
              ))}
          </div>
          <div className="form-grid">
            <label>
              {v.type === "L" ? "礼物金额（RM）" : "附带礼物（RM）"}
              <input
                required
                type="number"
                min={v.type === "L" ? "0.01" : "0"}
                max="1000000"
                step="0.01"
                value={v.gift}
                onChange={(e) => set("gift", Number(e.target.value))}
              />
            </label>
            <div className="help">
              礼物与服务按各自分成规则计算。
              <br />
              头牌 / 人气优先于独家。
            </div>
          </div>
          <label className="notes-label">
            备注
            <textarea
              maxLength={2000}
              rows={2}
              placeholder="例如：存单 30MINS"
              value={v.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </label>
          <div className="preview">
            <div>
              总金额<strong>RM {rm(sums.total)}</strong>
            </div>
            <div>
              陪陪工资<strong>RM {rm(sums.wage)}</strong>
            </div>
            <div>
              剩下<strong>RM {rm(sums.remaining)}</strong>
            </div>
          </div>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="dialog-actions">
          <span>
            {order === "new" ? "保存后自动生成单号" : "单号与订单类型不可更改"}
          </span>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="primary"
            disabled={
              busy ||
              rosterLoading ||
              (order === "new" && (!v.companionId || !!rosterError))
            }
          >
            {busy ? "保存中…" : "保存订单"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
