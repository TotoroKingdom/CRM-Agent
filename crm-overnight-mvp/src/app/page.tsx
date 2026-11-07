"use client";

import Link from "next/link";
import { ArrowUpRight, BarChart3, CheckCircle2, Clock3, MessageSquareText, Plus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDateTime, formatMoneyCents, getInitials } from "@/lib/format";
import type { Activity, Deal, FollowupTask } from "@/lib/types";
import { StageBadge } from "@/components/StatusBadge";

type DashboardData = {
  stats: { leadCount: number; activeDealCount: number; expectedAmountCents: number; todayTaskCount: number; overdueTaskCount: number };
  tasks: FollowupTask[];
  activities: Activity[];
  deals: Deal[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard").then(async (response) => {
      const payload = await response.json() as { data?: DashboardData; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "工作台数据加载失败");
      setData(payload.data);
    }).catch((caught) => setError(caught instanceof Error ? caught.message : "工作台数据加载失败"));
  }, []);

  if (error) return <div className="page-width"><div className="alert">{error}</div></div>;
  if (!data) return <div className="page-width"><div className="loading-state">正在读取 SQLite 工作台数据…</div></div>;

  const { stats } = data;
  return <div className="page-width"><div className="page-header"><div><div className="eyebrow">Sales workspace / {new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date())}</div><h1 className="page-title">早上好，今天先推进重点客户</h1><p className="page-description">跟踪跨境客户从首次接触到成交的每一步。</p></div><div className="header-actions"><Link className="button button-primary" href="/leads?new=1"><Plus size={16} />新建线索</Link></div></div><div className="demo-banner">演示环境：数据库中的样例客户均为虚构数据，请勿录入真实客户信息。</div><div className="kpi-grid"><KpiCard label="全部线索" value={String(stats.leadCount)} meta="SQLite 实时统计" icon={<Users size={16} />} color="blue" /><KpiCard label="进行中商机" value={String(stats.activeDealCount)} meta="不含已赢单/丢单" icon={<BarChart3 size={16} />} color="purple" /><KpiCard label="预计商机金额" value={formatMoneyCents(stats.expectedAmountCents)} meta="进行中商机合计" icon={<ArrowUpRight size={16} />} color="green" /><KpiCard label="今日待跟进" value={String(stats.todayTaskCount)} meta={`${stats.overdueTaskCount} 条已逾期`} icon={<Clock3 size={16} />} color="orange" /></div><div className="content-grid"><section className="panel"><div className="panel-header"><div><h2 className="panel-title">今日待跟进</h2><p className="panel-subtitle">当天未完成与已逾期任务</p></div><Link className="panel-link" href="/tasks">查看全部</Link></div><div className="list">{data.tasks.length ? data.tasks.map((task) => <div className="list-row" key={task.id}><div className="task-icon"><Clock3 size={15} /></div><div className="list-main"><strong>{task.title}</strong><span>{task.company} · {task.leadName}</span></div><span className="list-time">{formatDateTime(task.dueAt)}</span></div>) : <div className="empty-state"><strong>今天没有待跟进任务</strong>可以在任务页创建下一步行动。</div>}</div></section><section className="panel"><div className="panel-header"><div><h2 className="panel-title">最近互动</h2><p className="panel-subtitle">团队最新的客户触点</p></div><Link className="panel-link" href="/leads">查看线索</Link></div><div className="list">{data.activities.length ? data.activities.map((activity) => <div className="list-row" key={activity.id}><div className="activity-icon"><MessageSquareText size={15} /></div><div className="list-main"><strong>{activity.content}</strong><span>{activity.company} · {activity.leadName}</span></div><span className="list-time">{formatDateTime(activity.occurredAt)}</span></div>) : <div className="empty-state"><strong>还没有互动记录</strong>打开线索详情后可以添加。</div>}</div></section></div><section className="panel" style={{ marginTop: 20 }}><div className="panel-header"><div><h2 className="panel-title">商机概览</h2><p className="panel-subtitle">当前销售机会分布</p></div><Link className="panel-link" href="/pipeline">打开漏斗</Link></div><div className="list">{data.deals.length ? data.deals.map((deal) => <div className="list-row" key={deal.id}><div className="lead-cell"><div className="avatar avatar-medium">{getInitials(deal.company ?? deal.title)}</div><div className="list-main"><strong>{deal.title}</strong><span>{deal.company} · {deal.leadName}</span></div></div><StageBadge stage={deal.stage} /><span className="money">{formatMoneyCents(deal.amountCents)}</span></div>) : <div className="empty-state"><strong>还没有商机</strong>从线索详情或商机漏斗开始创建。</div>}</div></section></div>;
}

function KpiCard({ label, value, meta, icon, color }: { label: string; value: string; meta: string; icon: React.ReactNode; color: string }) { return <div className="kpi-card"><span className={`kpi-icon ${color}`}>{icon}</span><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div><div className="kpi-meta"><CheckCircle2 size={13} color="#42a487" />{meta}</div></div>; }
