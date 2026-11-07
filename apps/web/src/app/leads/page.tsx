"use client";

import Link from "next/link";
import { Filter, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { LeadForm } from "@/components/LeadForm";
import { ChannelBadge, PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { getInitials } from "@/lib/format";
import { crmApi } from "@/lib/api/client";
import { channelLabels, leadStatusLabels } from "@/lib/types";
import type { Channel, Lead, LeadStatus } from "@/lib/types";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "">("");
  const [channel, setChannel] = useState<Channel | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") setFormOpen(true);
  }, []);

  async function loadLeads() {
    setLoading(true); setError("");
    try {
      setLeads(await crmApi.listLeads({ search, status, channel }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "线索加载失败"); }
    finally { setLoading(false); }
  }

  useEffect(() => { const timer = window.setTimeout(() => void loadLeads(), 180); return () => window.clearTimeout(timer); }, [search, status, channel]);
  useEffect(() => { if (toast) { const timer = window.setTimeout(() => setToast(""), 2600); return () => window.clearTimeout(timer); } }, [toast]);

  async function deleteLead(lead: Lead) {
    if (!window.confirm(`确定删除“${lead.name} · ${lead.company}”吗？关联商机、互动和任务也会被删除。`)) return;
    try {
      await crmApi.deleteLead(lead.id);
      setToast("线索及其关联记录已删除");
      void loadLeads();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "删除失败");
    }
  }

  function saved(message: string) { setFormOpen(false); setEditing(null); setToast(message); void loadLeads(); }

  return <div className="page-width"><div className="page-header"><div><div className="eyebrow">Customer intelligence</div><h1 className="page-title">客户线索</h1><p className="page-description">集中管理来自不同渠道的潜在客户。</p></div><div className="header-actions"><button className="button button-primary" type="button" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={16} />新建线索</button></div></div><div className="demo-banner">演示数据仅用于本机测试；新建、编辑和删除都会直接写入本机数据库。</div><div className="toolbar"><div className="search-field"><Search size={16} /><input className="field" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索姓名、公司或邮箱" /></div><select className="select select-compact" value={status} onChange={(event) => setStatus(event.target.value as LeadStatus | "")}><option value="">全部状态</option>{Object.entries(leadStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select className="select select-compact" value={channel} onChange={(event) => setChannel(event.target.value as Channel | "")}><option value="">全部渠道</option>{Object.entries(channelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="button button-secondary" type="button" onClick={() => { setSearch(""); setStatus(""); setChannel(""); }}><Filter size={15} />重置</button></div>{error && <div className="alert">{error}</div>}<div className="panel table-panel"><div className="table-wrap">{loading ? <div className="loading-state">正在读取线索…</div> : leads.length === 0 ? <div className="empty-state"><strong>没有找到匹配的线索</strong>调整筛选条件，或新建一条客户线索。</div> : <table className="data-table"><thead><tr><th>客户</th><th>渠道</th><th>状态</th><th>优先级</th><th>关联商机</th><th>待办</th><th>操作</th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.id}><td><Link className="lead-cell lead-link" href={`/leads/${lead.id}`}><div className="avatar avatar-medium">{getInitials(lead.name)}</div><div><strong>{lead.name}</strong><span>{lead.company}</span></div></Link></td><td><ChannelBadge channel={lead.channel} /></td><td><StatusBadge status={lead.status} /></td><td><PriorityBadge priority={lead.priority} /></td><td>{lead.dealCount} 条</td><td>{lead.openTaskCount} 条</td><td><div className="row-actions"><button className="button button-secondary button-small" type="button" onClick={() => { setEditing(lead); setFormOpen(true); }}>编辑</button><button className="icon-button" type="button" onClick={() => void deleteLead(lead)} aria-label={`删除${lead.name}`} title="删除"><Trash2 size={15} /></button></div></td></tr>)}</tbody></table>}</div></div>{formOpen && <LeadForm lead={editing} onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={(lead) => saved(editing ? "线索已更新" : `已创建线索：${lead.name}`)} />}{toast && <div className="toast">{toast}</div>}</div>;
}
