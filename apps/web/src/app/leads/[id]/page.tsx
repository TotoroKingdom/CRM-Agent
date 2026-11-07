"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, Mail, MessageSquareText, Phone, Plus, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { ActivityForm } from "@/components/ActivityForm";
import { DealForm } from "@/components/DealForm";
import { LeadForm } from "@/components/LeadForm";
import { TaskForm } from "@/components/TaskForm";
import { ChannelBadge, PriorityBadge, StageBadge, StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatDateTime, formatMoneyCents, getInitials } from "@/lib/format";
import { activityTypeLabels } from "@/lib/types";
import type { Activity, Deal, FollowupTask, LeadDetails } from "@/lib/types";

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [leadId, setLeadId] = useState("");
  const [lead, setLead] = useState<LeadDetails | null>(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"activity" | "lead" | "deal" | "task" | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => { void params.then(({ id }) => setLeadId(id)); }, [params]);
  useEffect(() => { if (leadId) void loadLead(); }, [leadId]);
  useEffect(() => { if (toast) { const timer = window.setTimeout(() => setToast(""), 2600); return () => window.clearTimeout(timer); } }, [toast]);

  async function loadLead() {
    const response = await fetch(`/api/leads/${leadId}`, { cache: "no-store" }); const payload = await response.json() as { data?: LeadDetails; error?: string };
    if (!response.ok || !payload.data) { setError(payload.error ?? "线索不存在"); return; } setLead(payload.data);
  }

  if (error) return <div className="page-width"><div className="alert">{error} <Link className="panel-link" href="/leads">返回线索列表</Link></div></div>;
  if (!lead) return <div className="page-width"><div className="loading-state">正在读取客户详情…</div></div>;

  return <div className="page-width"><div className="page-header"><div><Link className="panel-link" href="/leads"><ArrowLeft size={14} style={{ verticalAlign: "-2px", marginRight: 5 }} />返回线索列表</Link><h1 className="page-title" style={{ marginTop: 11 }}>{lead.name}</h1><p className="page-description">{lead.company} 的客户档案与销售记录</p></div><div className="header-actions"><button className="button button-secondary" type="button" onClick={() => setModal("lead")}>编辑资料</button><button className="button button-primary" type="button" onClick={() => setModal("activity")}><Plus size={16} />添加互动</button></div></div><div className="demo-banner">演示数据和新记录都保存在本机 SQLite；当前单用户模式没有登录隔离。</div><div className="detail-grid"><div className="panel profile-panel"><div className="profile-header"><div className="avatar avatar-large">{getInitials(lead.name)}</div><div><h2>{lead.name}</h2><p>{lead.company}</p><div className="profile-badges"><StatusBadge status={lead.status} /><PriorityBadge priority={lead.priority} /><ChannelBadge channel={lead.channel} /></div></div></div><div className="profile-meta"><Meta label="邮箱" value={lead.email ?? "未填写"} icon={<Mail size={14} />} /><Meta label="电话" value={lead.phone ?? "未填写"} icon={<Phone size={14} />} /><Meta label="国家/地区" value={lead.country ?? "未填写"} icon={<UserRound size={14} />} /><Meta label="加入时间" value={formatDate(lead.createdAt)} icon={<CalendarDays size={14} />} /></div>{lead.note && <div className="demo-banner" style={{ marginTop: 18, marginBottom: 0 }}>{lead.note}</div>}<div className="panel-header" style={{ padding: "21px 0 7px" }}><div><h2 className="panel-title">沟通记录</h2><p className="panel-subtitle">记录与客户的关键触点</p></div><button className="icon-button" type="button" aria-label="添加互动" onClick={() => setModal("activity")}><Plus size={17} /></button></div><div className="timeline">{lead.activities.length ? lead.activities.map((activity) => <ActivityItem activity={activity} key={activity.id} />) : <div className="empty-state"><strong>还没有互动记录</strong>点击右上角添加第一次沟通。</div>}</div></div><div className="side-stack"><section className="panel"><div className="panel-header"><div><h2 className="panel-title">关联商机</h2><p className="panel-subtitle">{lead.deals.length} 条销售机会</p></div><button className="icon-button" type="button" onClick={() => setModal("deal")} aria-label="新建商机"><Plus size={17} /></button></div><div className="side-panel-body">{lead.deals.length ? <div className="mini-list">{lead.deals.map((deal) => <div className="mini-item" key={deal.id}><strong>{deal.title}</strong><span>{formatMoneyCents(deal.amountCents)} · 更新于 {formatDate(deal.updatedAt)}</span><StageBadge stage={deal.stage} /></div>)}</div> : <div className="empty-state"><strong>还没有关联商机</strong><button className="button button-secondary button-small" type="button" onClick={() => setModal("deal")}>创建商机</button></div>}</div></section><section className="panel"><div className="panel-header"><div><h2 className="panel-title">跟进任务</h2><p className="panel-subtitle">{lead.tasks.length} 条任务</p></div><button className="icon-button" type="button" onClick={() => setModal("task")} aria-label="新建跟进任务"><Plus size={17} /></button></div><div className="side-panel-body">{lead.tasks.length ? <div className="mini-list">{lead.tasks.map((task) => <div className="mini-item" key={task.id}><strong>{task.title}</strong><span>{task.completedAt ? "已完成" : `截止：${formatDate(task.dueAt)}`}</span></div>)}</div> : <div className="empty-state"><strong>还没有跟进任务</strong><button className="button button-secondary button-small" type="button" onClick={() => setModal("task")}>创建任务</button></div>}</div></section></div></div>{modal === "activity" && <ActivityForm leadId={lead.id} onClose={() => setModal(null)} onSaved={(activity) => savedActivity(activity)} />}{modal === "lead" && <LeadForm lead={lead} onClose={() => setModal(null)} onSaved={() => { setModal(null); setToast("线索已更新"); void loadLead(); }} />}{modal === "deal" && <DealForm leads={[lead]} defaultLeadId={lead.id} onClose={() => setModal(null)} onSaved={() => { setModal(null); setToast("商机已创建"); void loadLead(); }} />}{modal === "task" && <TaskForm leads={[lead]} defaultLeadId={lead.id} onClose={() => setModal(null)} onSaved={() => { setModal(null); setToast("跟进任务已创建"); void loadLead(); }} />}{toast && <div className="toast">{toast}</div>}</div>;

  function savedActivity(activity: Activity) { setModal(null); setToast(`已记录${activityTypeLabels[activity.type]}`); void loadLead(); }
}

function Meta({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) { return <div><div className="meta-label">{icon} <span style={{ marginLeft: 5 }}>{label}</span></div><div className="meta-value">{value}</div></div>; }
function ActivityItem({ activity }: { activity: Activity }) { return <div className="timeline-item"><div className="timeline-icon"><MessageSquareText size={13} /></div><div className="timeline-content"><strong>{activityTypeLabels[activity.type]}</strong><p>{activity.content}</p><time>{formatDateTime(activity.occurredAt)}</time></div></div>; }
