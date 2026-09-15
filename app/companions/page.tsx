"use client";
import { useEffect, useState } from "react";
import {
  UsersRound,
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  Check,
  UserRound,
} from "lucide-react";
import Workspace from "../components/Workspace";
import Modal from "../components/Modal";
import Leaderboard, { type RankEntry } from "../components/Leaderboard";
import type { Companion } from "@/lib/companion-domain";
export default function CompanionsPage() {
  const [items, setItems] = useState<(Companion & {monthCount:number;monthEarnings:number;allCount:number;allEarnings:number})[]>([]),
    [q, setQ] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [editor, setEditor] = useState<Companion | "new" | null>(null),
    [deleting, setDeleting] = useState<Companion | null>(null),
    [busy, setBusy] = useState(false),
    [deleteError, setDeleteError] = useState(""),
    [toast, setToast] = useState("");
  const [month,setMonth]=useState(()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kuala_Lumpur",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()).slice(0,7));
  const [board,setBoard]=useState<{monthly:RankEntry[];allTime:RankEntry[]}>({monthly:[],allTime:[]});
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      fetch("/api/companions?q=" + encodeURIComponent(q)+"&month="+encodeURIComponent(month), {
        signal: controller.signal,
      })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error);
          if (!controller.signal.aborted) {setItems(d.items);setBoard(d.leaderboard);}
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message || "加载失败");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, revision, month]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setDeleteError("");
    try {
      const r = await fetch("/api/companions/" + deleting._id, {
        method: "DELETE",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setDeleting(null);
      setRevision((n) => n + 1);
      setToast("陪陪已删除，历史订单已保留");
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Workspace section="companions">
      <div className="content">
        <div className="heading">
          <div>
            <div className="eyebrow">COMPANION MANAGEMENT</div>
            <h1>陪陪管理</h1>
            <p>管理陪陪资料，查看每月业绩与累计收入。</p>
          </div>
          <button className="primary" onClick={() => setEditor("new")}>
            <Plus size={18} />
            新增陪陪
          </button>
        </div>
        <div className="month-toolbar"><label>统计月份 <input type="month" aria-label="统计月份" value={month} onChange={e=>{if(e.target.value)setMonth(e.target.value);}}/></label><span>单量按订单笔数计算，包含陪玩、语聊与礼物单。</span></div>
        {!error && !loading && <Leaderboard monthly={board.monthly} allTime={board.allTime} month={month}/>}
        <section className="roster-banner">
          <span className="roster-banner-icon">
            <UsersRound size={28} />
          </span>
          <div>
            <strong>我的陪陪</strong>
            <p>查看所选月份及全部月份的单量与收入</p>
          </div>
          <div className="roster-count">
            <strong>{error ? "—" : items.length}</strong>
            <span>{q ? "位符合搜索条件" : "位陪陪"}</span>
          </div>
        </section>
        <section className="orders-panel">
          <div className="panel-title">
            <h2>陪陪名单</h2>
            <button
              className="icon-btn"
              aria-label="刷新陪陪名单"
              onClick={() => setRevision((n) => n + 1)}
            >
              <RefreshCw size={18} />
            </button>
          </div>
          <div className="filter-row">
            <label className="search">
              <Search size={18} />
              <input
                aria-label="搜索陪陪"
                placeholder="搜索名称或备注"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            {q && (
              <button className="text-btn" onClick={() => setQ("")}>
                清除搜索
              </button>
            )}
          </div>
          {error ? (
            <div className="empty error" role="alert">
              <h3>暂时无法加载名单</h3>
              <p>{error}</p>
              <button
                className="secondary"
                onClick={() => setRevision((n) => n + 1)}
              >
                重试
              </button>
            </div>
          ) : (
            <>
              <div
                className={
                  "table-wrap roster-table performance-table " + (loading ? "loading" : "")
                }
                aria-busy={loading}
              >
                <table>
                  <thead>
                    <tr>
                      <th>陪陪名称</th>
                      <th>备注</th>
                      <th>当月单量 / 收入</th>
                      <th>累计单量 / 收入</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((member) => (
                      <tr key={member._id}>
                        <td>
                          <div className="person">
                            <span className="person-icon P">
                              {member.name.slice(0, 1)}
                            </span>
                            <b>{member.name}</b>
                          </div>
                        </td>
                        <td className="roster-note">
                          {member.notes || (
                            <span className="muted">暂无备注</span>
                          )}
                        </td>
                        <td className="performance-cell"><b>{member.monthCount} 单</b><small>RM {member.monthEarnings.toFixed(2)}</small></td>
                        <td className="performance-cell"><b>{member.allCount} 单</b><small>RM {member.allEarnings.toFixed(2)}</small></td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="secondary"
                              aria-label={"编辑陪陪 " + member.name}
                              onClick={() => setEditor(member)}
                            >
                              <Pencil size={14} />
                              编辑
                            </button>
                            <button
                              className="icon-btn delete"
                              aria-label={"删除陪陪 " + member.name}
                              onClick={() => {
                                setDeleteError("");
                                setDeleting(member);
                              }}
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!items.length && (
                  <div className="empty">
                    <UserRound size={30} />
                    <h3>
                      {loading
                        ? "正在加载陪陪…"
                        : q
                          ? "没有找到这位陪陪"
                          : "还没有陪陪"}
                    </h3>
                    <p>
                      {loading
                        ? "请稍候"
                        : q
                          ? "试试其他名称或备注。"
                          : "点击“新增陪陪”，建立第一份资料。"}
                    </p>
                    {!loading && !q && (
                      <button
                        className="primary"
                        onClick={() => setEditor("new")}
                      >
                        <Plus size={16} />
                        新增第一位陪陪
                      </button>
                    )}
                  </div>
                )}
              </div>
              <footer className="pagination">
                <span>{loading ? "更新中…" : `共 ${items.length} 位陪陪`}</span>
                <span>删除陪陪不会删除历史订单</span>
              </footer>
            </>
          )}
        </section>
      </div>
      {editor && (
        <CompanionEditor
          member={editor}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setRevision((n) => n + 1);
            setToast(
              editor === "new"
                ? "陪陪已新增，现在可以为这位陪陪开单"
                : "陪陪资料已更新",
            );
          }}
        />
      )}
      {deleting && (
        <Modal title="删除陪陪" onClose={() => !busy && setDeleting(null)}>
          <div className="confirm">
            <p>
              确定删除 <strong>{deleting.name}</strong>？
            </p>
            <p className="muted">
              删除后不再出现在新订单的选择名单中，历史订单会保留。
            </p>
            {deleteError && (
              <div className="form-error" role="alert">
                {deleteError}
              </div>
            )}
            <div className="dialog-actions">
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setDeleting(null)}
              >
                取消
              </button>
              <button className="danger" disabled={busy} onClick={remove}>
                {busy ? "删除中…" : "确认删除陪陪"}
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
function CompanionEditor({
  member,
  onClose,
  onSaved,
}: {
  member: Companion | "new";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(member === "new" ? "" : member.name),
    [notes, setNotes] = useState(member === "new" ? "" : member.notes),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        "/api/companions" + (member === "new" ? "" : "/" + member._id),
        {
          method: member === "new" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, notes }),
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
      title={member === "new" ? "新增陪陪" : "编辑陪陪 · " + member.name}
      onClose={() => !busy && onClose()}
    >
      <form onSubmit={submit}>
        <div className="form-body">
          <label className="notes-label">
            陪陪名称 <span className="required-mark">*</span>
            <input
              className="roster-name-input"
              required
              maxLength={80}
              placeholder="例如：小雨"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <p className="field-help">使用唯一名称，录单时可直接选择。</p>
          <label className="notes-label">
            备注（选填）
            <textarea
              rows={5}
              maxLength={2000}
              placeholder="例如：擅长的游戏、接单说明"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          {member !== "new" && (
            <p className="field-help">
              修改名称仅用于之后的新订单，历史订单保留当时的名称。
            </p>
          )}
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="dialog-actions">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onClose}
          >
            取消
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "保存中…" : "保存陪陪"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
