"use client";

import { CalendarPlus, Check, Clock3, Edit3, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { TaskForm } from "@/components/TaskForm";
import { formatDate, formatDateTime } from "@/lib/format";
import { crmApi } from "@/lib/api/client";
import type { FollowupTask, Lead } from "@/lib/types";

type Filter = "open" | "done" | "overdue" | "all";

export default function TasksPage() {
  const [tasks, setTasks] = useState<FollowupTask[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<Filter>("open");
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FollowupTask | null>(null);
  const [toast, setToast] = useState("");

  async function load() {
    try {
      const [taskData, leadData] = await Promise.all([crmApi.listTasks(filter), crmApi.listLeads()]);
      setTasks(taskData); setLeads(leadData);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "任务加载失败"); }
  }
  useEffect(() => { void load(); }, [filter]);
  useEffect(() => { if (toast) { const timer = window.setTimeout(() => setToast(""), 2600); return () => window.clearTimeout(timer); } }, [toast]);

  async function toggle(task: FollowupTask) {
    try {
      const updated = await crmApi.updateTask(task.id, { completed: !task.completedAt });
      setToast(updated.completedAt ? "任务已完成" : "任务已恢复待办");
      void load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "更新任务失败");
    }
  }
  function saved(message: string) { setModalOpen(false); setEditing(null); setToast(message); void load(); }

  return <div className="page-width"><div className="page-header"><div><div className="eyebrow">Follow-up queue</div><h1 className="page-title">跟进任务</h1><p className="page-description">把每一次承诺变成可追踪的下一步。</p></div><div className="header-actions"><button className="button button-primary" type="button" onClick={() => { setEditing(null); setModalOpen(true); }}><Plus size={16} />新建任务</button></div></div><div className="demo-banner">任务日期按北京时间展示并以 UTC 保存；完成状态会同步影响工作台待跟进统计。</div><div className="toolbar"><select className="select select-compact" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}><option value="open">待完成</option><option value="done">已完成</option><option value="overdue">已逾期</option><option value="all">全部任务</option></select><button className="button button-secondary" type="button" onClick={() => setFilter("open")}><CalendarPlus size={15} />查看待办</button></div>{error && <div className="alert">{error}</div>}{tasks.length === 0 && !error ? <div className="panel"><div className="empty-state"><strong>没有符合条件的任务</strong>可以创建一条新的跟进任务。</div></div> : <div className="task-list">{tasks.map((task) => { const overdue = !task.completedAt && new Date(task.dueAt).getTime() < Date.now(); return <div className={`task-row ${overdue ? "task-row-overdue" : ""} ${task.completedAt ? "task-row-complete" : ""}`} key={task.id}><button className={`task-check ${task.completedAt ? "task-check-done" : ""}`} type="button" aria-label={`${task.completedAt ? "恢复" : "完成"}任务：${task.title}`} onClick={() => void toggle(task)}>{task.completedAt && <Check size={13} />}</button><div className="task-content"><strong>{task.title}</strong><span>{task.company} · {task.leadName}</span></div><div className={`task-due ${overdue ? "task-due-overdue" : ""}`}><Clock3 size={13} />{overdue ? `已逾期 · ${formatDate(task.dueAt)}` : task.completedAt ? `完成于 ${formatDateTime(task.completedAt)}` : `截止 ${formatDate(task.dueAt)}`}</div><button className="icon-button" type="button" aria-label={`编辑任务：${task.title}`} title="编辑" onClick={() => { setEditing(task); setModalOpen(true); }}><Edit3 size={15} /></button></div>; })}</div>}{modalOpen && <TaskForm task={editing} leads={leads} onClose={() => { setModalOpen(false); setEditing(null); }} onSaved={() => saved(editing ? "任务已更新" : "任务已创建")} />}{toast && <div className="toast">{toast}</div>}</div>;
}
