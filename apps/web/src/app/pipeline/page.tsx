"use client";

import { CalendarDays, Edit3, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { DealForm } from "@/components/DealForm";
import { StageBadge } from "@/components/StatusBadge";
import { formatDate, formatMoneyCents } from "@/lib/format";
import { dealStageLabels, DEAL_STAGES } from "@/lib/types";
import type { Deal, Lead, DealStage } from "@/lib/types";

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [toast, setToast] = useState("");

  async function load() {
    try {
      const [dealResponse, leadResponse] = await Promise.all([fetch("/api/deals", { cache: "no-store" }), fetch("/api/leads", { cache: "no-store" })]);
      const dealPayload = await dealResponse.json() as { data?: Deal[]; error?: string }; const leadPayload = await leadResponse.json() as { data?: Lead[]; error?: string };
      if (!dealResponse.ok || !dealPayload.data) throw new Error(dealPayload.error ?? "商机加载失败"); if (!leadResponse.ok || !leadPayload.data) throw new Error(leadPayload.error ?? "客户加载失败");
      setDeals(dealPayload.data); setLeads(leadPayload.data);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "商机加载失败"); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => { if (toast) { const timer = window.setTimeout(() => setToast(""), 2600); return () => window.clearTimeout(timer); } }, [toast]);
  function saved(message: string) { setModalOpen(false); setEditing(null); setToast(message); void load(); }

  return <div className="page-width"><div className="page-header"><div><div className="eyebrow">Revenue pipeline</div><h1 className="page-title">商机漏斗</h1><p className="page-description">清晰掌握每个客户机会的推进阶段与金额。</p></div><div className="header-actions"><button className="button button-primary" type="button" onClick={() => { setEditing(null); setModalOpen(true); }}><Plus size={16} />新建商机</button></div></div><div className="demo-banner">商机阶段和金额会实时写入 SQLite；阶段切换使用编辑操作，不依赖拖拽。</div>{error && <div className="alert">{error}</div>}{deals.length === 0 && !error ? <div className="panel"><div className="empty-state"><strong>还没有商机</strong>点击右上角创建第一个销售机会。</div></div> : <div className="pipeline-grid">{DEAL_STAGES.map((stage) => { const stageDeals = deals.filter((deal) => deal.stage === stage); return <section className="pipeline-column" key={stage}><div className="pipeline-column-header"><strong>{dealStageLabels[stage]}</strong><span className="column-count">{stageDeals.length}</span></div><div className="pipeline-cards">{stageDeals.map((deal) => <article className="deal-card" key={deal.id}><div className="deal-card-title">{deal.title}</div><div className="deal-card-company">{deal.company} · {deal.leadName}</div><div className="deal-card-amount">{formatMoneyCents(deal.amountCents)}</div><div className="deal-card-meta"><span><CalendarDays size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />{formatDate(deal.expectedCloseAt)}</span><StageBadge stage={deal.stage} /></div><button className="button button-secondary button-small" type="button" style={{ width: "100%", marginTop: 11 }} onClick={() => { setEditing(deal); setModalOpen(true); }}><Edit3 size={13} />编辑商机</button></article>)}</div></section>; })}</div>}{modalOpen && <DealForm deal={editing} leads={leads} onClose={() => { setModalOpen(false); setEditing(null); }} onSaved={(deal) => saved(editing ? `商机已更新为${dealStageLabels[deal.stage]}` : "商机已创建")} />}{toast && <div className="toast">{toast}</div>}</div>;
}
