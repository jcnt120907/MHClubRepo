"use client";

import { useEffect, useState } from "react";
import { Clock3, Plus, Search, Trash2 } from "lucide-react";
import Workspace from "@/app/components/Workspace";
import Modal from "@/app/components/Modal";

type Stored = { _id: string; orderNo: string; companion: string; date: string; durationMinutes: number; status: "进行中" | "完成"; ownerSource?: "IG" | "Telegram"; ownerId?: string };
type Order = { _id: string; orderNo: string; companion: string; date: string };

export default function StoredOrdersPage() {
  const [items, setItems] = useState<Stored[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | Stored["status"]>("进行中");
  const [sort, setSort] = useState<keyof Stored>("orderNo");
  const [ascending, setAscending] = useState(true);
  const [adding, setAdding] = useState(false);
  const [confirmation, setConfirmation] = useState<{ item: Stored; action: "complete" | "delete" } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => fetch(`/api/stored-orders?q=${encodeURIComponent(query)}`).then(response => response.json()).then(data => setItems(data.items || []));
  useEffect(() => { load(); }, [query]);
  const toggleSort = (field: keyof Stored) => { setAscending(field === sort ? !ascending : true); setSort(field); };
  const rows = items.filter(item => !statusFilter || item.status === statusFilter).sort((a, b) => {
    const left = a[sort] ?? ""; const right = b[sort] ?? "";
    return (typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), "zh")) * (ascending ? 1 : -1);
  });
  const header = (label: string, field: keyof Stored) => <button className="sort-header" onClick={() => toggleSort(field)}>{label} {sort === field ? (ascending ? "↑" : "↓") : "↕"}</button>;
  const run = async () => {
    if (!confirmation) return;
    setBusy(true);
    await fetch(`/api/stored-orders/${confirmation.item._id}`, { method: confirmation.action === "delete" ? "DELETE" : "PATCH", headers: { "Content-Type": "application/json" }, body: confirmation.action === "complete" ? JSON.stringify({ action: "complete" }) : undefined });
    setBusy(false); setConfirmation(null); load();
  };

  return <Workspace section="storedOrders"><div className="content storage-page">
    <div className="heading"><div><div className="eyebrow">STORED ORDER MANAGEMENT</div><h1>存单管理</h1><p>完成存单后，原订单自动转为可发放。</p></div><button className="primary" onClick={() => setAdding(true)}><Plus size={18} />新增存单</button></div>
    <section className="storage-hero"><div className="storage-hero-mark"><Clock3 size={25} /></div><div><strong>存单工作台</strong><p>每笔订单只保留一笔存单，并记录老板点单资料。</p></div><div className="storage-metrics"><div><strong>{items.filter(item => item.status === "进行中").length}</strong><span>进行中</span></div><div><strong>{items.length}</strong><span>总记录</span></div></div></section>
    <section className="orders-panel storage-panel"><div className="storage-toolbar"><label className="search"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜寻单号、陪陪或老板 ID" /></label><div className="storage-filters" aria-label="存单状态筛选">{(["进行中", "完成", ""] as const).map(status => <button key={status || "all"} type="button" className={statusFilter === status ? "active" : ""} onClick={() => setStatusFilter(status)}>{status || "全部"}<span>{status ? items.filter(item => item.status === status).length : items.length}</span></button>)}</div></div><div className="storage-result"><span>{statusFilter || "全部"}</span><b>{rows.length} 笔存单</b></div><div className="table-wrap"><table><thead><tr><th>{header("订单", "orderNo")}</th><th>{header("陪陪", "companion")}</th><th>{header("存单日期", "date")}</th><th>{header("存单时间", "durationMinutes")}</th><th>{header("老板来源", "ownerSource")}</th><th>{header("老板 ID", "ownerId")}</th><th>{header("状态", "status")}</th><th>操作</th></tr></thead><tbody>{rows.length ? rows.map(item => <tr key={item._id}><td><a className="storage-order-link" href={`/?orderNo=${encodeURIComponent(item.orderNo)}`} title="查看订单资料">{item.orderNo}</a></td><td>{item.companion}</td><td>{item.date}</td><td><strong className="storage-duration">{item.durationMinutes} 分钟</strong></td><td>{item.ownerSource || "—"}</td><td>{item.ownerId || "—"}</td><td><span className={`storage-status ${item.status === "进行中" ? "active" : "done"}`}>{item.status}</span></td><td>{item.status === "进行中" && <button className="secondary storage-complete" onClick={() => setConfirmation({ item, action: "complete" })}>完成</button>} <button className="icon-btn delete" aria-label="删除存单" onClick={() => setConfirmation({ item, action: "delete" })}><Trash2 size={16} /></button></td></tr>) : <tr><td className="storage-empty" colSpan={8}>没有符合条件的存单</td></tr>}</tbody></table></div></section>
  </div>
  {confirmation && <Modal title={confirmation.action === "complete" ? "确认完成存单" : "确认删除存单"} onClose={() => !busy && setConfirmation(null)}><div className="confirm"><p>{confirmation.action === "complete" ? "确认完成后，原订单会转为可发放。" : "确定删除这笔存单？"}</p><div className="dialog-actions"><button className="secondary" onClick={() => setConfirmation(null)}>取消</button><button className={confirmation.action === "complete" ? "primary" : "danger"} disabled={busy} onClick={run}>{busy ? "处理中…" : confirmation.action === "complete" ? "确认完成" : "确认删除"}</button></div></div></Modal>}
  {adding && <AddStoredOrder close={() => setAdding(false)} done={() => { setAdding(false); load(); }} />}
  </Workspace>;
}

function AddStoredOrder({ close, done }: { close: () => void; done: () => void }) {
  const [query, setQuery] = useState(""); const [options, setOptions] = useState<Order[]>([]); const [order, setOrder] = useState<Order | null>(null);
  const [minutes, setMinutes] = useState(30); const [ownerSource, setOwnerSource] = useState<"" | "IG" | "Telegram">(""); const [ownerId, setOwnerId] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const search = (value: string) => fetch(`/api/orders?q=${encodeURIComponent(value)}`).then(response => response.json()).then(data => { const next = data.items || []; setOptions(next); setOrder(next.find((item: Order) => item.orderNo === value) || null); });
  const save = async () => {
    if (!order) { setError("请选择已有的订单单号"); return; }
    setSaving(true); setError("");
    const response = await fetch("/api/stored-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order._id, durationMinutes: minutes, ownerSource, ownerId }) });
    const data = await response.json(); setSaving(false); if (!response.ok) { setError(data.error || "存单保存失败"); return; } done();
  };
  return <Modal title="新增存单" onClose={() => !saving && close()}><div className="form-body storage-editor"><p className="field-help">输入单号或陪陪名字选择原订单，资料会自动带入。</p><label className="storage-field">订单单号<input list="stored-order-options" value={query} placeholder="例如 P0014" onChange={event => { setQuery(event.target.value); search(event.target.value); }} /><datalist id="stored-order-options">{options.map(item => <option key={item._id} value={item.orderNo}>{item.companion} · {item.date}</option>)}</datalist></label>{order && <div className="storage-order-found"><strong>{order.orderNo}</strong><span>{order.companion} · {order.date}</span></div>}<label className="storage-field">存单时间（分钟）<input type="number" min="1" max="1440" value={minutes} onChange={event => setMinutes(Number(event.target.value))} /></label><div className="form-grid"><label className="storage-field">老板来源<select value={ownerSource} onChange={event => setOwnerSource(event.target.value as "" | "IG" | "Telegram")}><option value="">未填写</option><option value="IG">IG</option><option value="Telegram">Telegram</option></select></label><label className="storage-field">老板 ID<input value={ownerId} placeholder="例如 @chinwai0811" onChange={event => setOwnerId(event.target.value)} /></label></div>{error && <p className="field-error">{error}</p>}</div><div className="dialog-actions"><button className="secondary" disabled={saving} onClick={close}>取消</button><button className="primary" disabled={saving} onClick={save}>{saving ? "保存中…" : "建立存单"}</button></div></Modal>;
}
