"use client";
import { useEffect, useState } from "react";
import { Check, ImagePlus, Pencil, Plus, RefreshCw, Search, Trash2, UserRound, UsersRound } from "lucide-react";
import Workspace from "../components/Workspace";
import Modal from "../components/Modal";
import type { Companion } from "@/lib/companion-domain";

export default function CompanionsPage() {
  const [items, setItems] = useState<Companion[]>([]), [q, setQ] = useState(""), [loading, setLoading] = useState(true), [error, setError] = useState(""), [revision, setRevision] = useState(0), [editor, setEditor] = useState<Companion | "new" | null>(null), [deleting, setDeleting] = useState<Companion | null>(null), [merging, setMerging] = useState<Companion | null>(null), [busy, setBusy] = useState(false), [deleteError, setDeleteError] = useState(""), [toast, setToast] = useState("");
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    const timer = setTimeout(() => fetch("/api/companions?q=" + encodeURIComponent(q), { signal: controller.signal }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); if (!controller.signal.aborted) setItems(d.items); }).catch(e => { if (!controller.signal.aborted) setError(e.message || "加载失败"); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }), 150);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [q, revision]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 4000); return () => clearTimeout(timer); }, [toast]);
  async function remove() {
    if (!deleting) return; setBusy(true); setDeleteError("");
    try { const r = await fetch("/api/companions/" + deleting._id, { method: "DELETE" }); const d = await r.json(); if (!r.ok) throw new Error(d.error); setDeleting(null); setRevision(n => n + 1); setToast("陪陪已删除，历史订单已保留"); } catch (e) { setDeleteError(e instanceof Error ? e.message : "删除失败"); } finally { setBusy(false); }
  }
  return <Workspace section="companions"><div className="content">
    <div className="heading"><div><div className="eyebrow">COMPANION MANAGEMENT</div><h1>陪陪管理</h1><p>管理陪陪资料、付款方式和收款内容。</p></div><button className="primary" onClick={() => setEditor("new")}><Plus size={18}/>新增陪陪</button></div>
    <section className="roster-banner"><span className="roster-banner-icon"><UsersRound size={28}/></span><div><strong>我的陪陪</strong><p>保存银行、TNG 等付款资料；订单中可点击陪陪名称查看。</p></div><div className="roster-count"><strong>{error ? "—" : items.length}</strong><span>{q ? "位符合搜索条件" : "位陪陪"}</span></div></section>
    <section className="orders-panel"><div className="panel-title"><h2>陪陪名单</h2><button className="icon-btn" aria-label="刷新陪陪名单" onClick={() => setRevision(n => n + 1)}><RefreshCw size={18}/></button></div>
      <div className="filter-row"><label className="search"><Search size={18}/><input aria-label="搜索陪陪" placeholder="搜索名称、付款方式或备注" value={q} onChange={e => setQ(e.target.value)}/></label>{q && <button className="text-btn" onClick={() => setQ("")}>清除搜索</button>}</div>
      {error ? <div className="empty error" role="alert"><h3>暂时无法加载名单</h3><p>{error}</p><button className="secondary" onClick={() => setRevision(n => n + 1)}>重试</button></div> : <>
        <div className={"table-wrap roster-table payment-table " + (loading ? "loading" : "")} aria-busy={loading}><table><thead><tr><th>陪陪名称</th><th>付款方式</th><th>付款内容</th><th>备注</th><th>操作</th></tr></thead><tbody>{items.map(member => <tr key={member._id}><td><div className="person"><span className="person-icon P">{member.name.slice(0, 1)}</span><b>{member.name}</b></div></td><td>{member.paymentMethod || <span className="muted">未填写</span>}</td><td className="payment-summary">{member.paymentContent || <span className="muted">未填写</span>}{member.paymentImage && <small><ImagePlus size={13}/>已上传付款图片</small>}</td><td className="roster-note">{member.notes || <span className="muted">暂无备注</span>}</td><td><div className="row-actions"><button className="secondary" onClick={() => setMerging(member)}>合并</button><button className="secondary" aria-label={"编辑陪陪 " + member.name} onClick={() => setEditor(member)}><Pencil size={14}/>编辑</button><button className="icon-btn delete" aria-label={"删除陪陪 " + member.name} onClick={() => { setDeleteError(""); setDeleting(member); }}><Trash2 size={17}/></button></div></td></tr>)}</tbody></table>
        {!items.length && <div className="empty"><UserRound size={30}/><h3>{loading ? "正在加载陪陪…" : q ? "没有找到这位陪陪" : "还没有陪陪"}</h3><p>{loading ? "请稍候" : q ? "试试其他名称、付款方式或备注。" : "点击“新增陪陪”，建立第一份资料。"}</p>{!loading && !q && <button className="primary" onClick={() => setEditor("new")}><Plus size={16}/>新增第一位陪陪</button>}</div>}</div>
        <footer className="pagination"><span>{loading ? "更新中…" : `共 ${items.length} 位陪陪`}</span><span>删除陪陪不会删除历史订单</span></footer></>}
    </section></div>
    {editor && <CompanionEditor member={editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setRevision(n => n + 1); setToast(editor === "new" ? "陪陪已新增，现在可以为这位陪陪开单" : "陪陪资料已更新"); }}/>}
    {deleting && <Modal title="删除陪陪" onClose={() => !busy && setDeleting(null)}><div className="confirm"><p>确定删除 <strong>{deleting.name}</strong>？</p><p className="muted">删除后不再出现在新订单的选择名单中，历史订单会保留。</p>{deleteError && <div className="form-error" role="alert">{deleteError}</div>}<div className="dialog-actions"><button className="secondary" disabled={busy} onClick={() => setDeleting(null)}>取消</button><button className="danger" disabled={busy} onClick={remove}>{busy ? "删除中…" : "确认删除陪陪"}</button></div></div></Modal>}
    {merging && <MergeCompanion source={merging} items={items} onClose={() => setMerging(null)} onDone={(message) => { setMerging(null); setRevision(n => n + 1); setToast(message); }}/>} 
    {toast && <div className="toast" role="status"><Check size={17}/>{toast}</div>}
  </Workspace>;
}

function MergeCompanion({source,items,onClose,onDone}:{source:Companion;items:Companion[];onClose:()=>void;onDone:(message:string)=>void}){const [targetId,setTargetId]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");const submit=async()=>{if(!targetId)return setError("请选择要保留的陪陪");setBusy(true);const r=await fetch("/api/companions/"+source._id+"/merge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({targetId})});const d=await r.json();setBusy(false);if(!r.ok)return setError(d.error);onDone("已合并「"+source.name+"」到「"+d.target+"」")};return <Modal title="合并陪陪资料" onClose={()=>!busy&&onClose()}><div className="confirm"><p>将 <strong>{source.name}</strong> 的订单和存单全部转移到：</p><select value={targetId} onChange={e=>setTargetId(e.target.value)}><option value="">请选择保留的陪陪</option>{items.filter(x=>x._id!==source._id).map(x=><option key={x._id} value={x._id}>{x.name}</option>)}</select><p className="muted">来源资料会删除；目标资料的付款内容会保留。</p>{error&&<div className="form-error">{error}</div>}<div className="dialog-actions"><button className="secondary" onClick={onClose}>取消</button><button className="danger" disabled={busy} onClick={submit}>{busy?"合并中…":"确认合并"}</button></div></div></Modal>}
function CompanionEditor({ member, onClose, onSaved }: { member: Companion | "new"; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(member === "new" ? "" : member.name), [notes, setNotes] = useState(member === "new" ? "" : member.notes), [paymentMethod, setPaymentMethod] = useState(member === "new" ? "" : member.paymentMethod || ""), [paymentContent, setPaymentContent] = useState(member === "new" ? "" : member.paymentContent || ""), [paymentImage, setPaymentImage] = useState(member === "new" ? "" : member.paymentImage || ""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  function imageSelected(file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 700 * 1024) { setError("请使用 PNG、JPG 或 WebP 格式的 700KB 以内付款图片。"); return; }
    const reader = new FileReader(); reader.onload = () => setPaymentImage(String(reader.result)); reader.readAsDataURL(file);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { const r = await fetch("/api/companions" + (member === "new" ? "" : "/" + member._id), { method: member === "new" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, notes, paymentMethod, paymentContent, paymentImage }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); onSaved(); } catch (e) { setError(e instanceof Error ? e.message : "保存失败"); } finally { setBusy(false); }
  }
  return <Modal title={member === "new" ? "新增陪陪" : "编辑陪陪 · " + member.name} onClose={() => !busy && onClose()}><form onSubmit={submit}><div className="form-body">
    <label className="notes-label">陪陪名称 <span className="required-mark">*</span><input className="roster-name-input" required maxLength={80} placeholder="例如：小雨" value={name} onChange={e => setName(e.target.value)}/></label><p className="field-help">使用唯一名称，录单时可直接选择。</p>
    <div className="form-grid"><label>付款方式<select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}><option value="">请选择（选填）</option><option>TNG eWallet</option><option>银行转账</option><option>DuitNow</option><option>现金</option><option>其他</option></select></label><label>付款内容<input maxLength={2000} placeholder="例如：电话号码、银行账号或收款名称" value={paymentContent} onChange={e => setPaymentContent(e.target.value)}/></label></div>
    <label className="notes-label">TNG／付款图片（选填）<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => imageSelected(e.target.files?.[0])}/></label><p className="field-help">可上传 TNG 二维码或付款截图，限 PNG、JPG、WebP 且 700KB 以内。</p>
    {paymentImage && <div className="payment-image-preview"><img src={paymentImage} alt="付款图片预览"/><button type="button" className="text-btn" onClick={() => setPaymentImage("")}>移除图片</button></div>}
    <label className="notes-label">备注（选填）<textarea rows={4} maxLength={2000} placeholder="例如：擅长的游戏、接单说明" value={notes} onChange={e => setNotes(e.target.value)}/></label>{member !== "new" && <p className="field-help">修改名称仅用于之后的新订单，历史订单保留当时的名称。</p>}{error && <div className="form-error" role="alert">{error}</div>}
  </div><div className="dialog-actions"><button type="button" className="secondary" disabled={busy} onClick={onClose}>取消</button><button className="primary" disabled={busy}>{busy ? "保存中…" : "保存陪陪"}</button></div></form></Modal>;
}
