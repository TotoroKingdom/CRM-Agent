"use client";

import { X } from "lucide-react";
import { useState } from "react";
import type { FollowupTask, Lead } from "@/lib/types";
import { toDateInputValue, toIsoFromDateInput } from "@/lib/format";

export function TaskForm({ task, leads, defaultLeadId, onSaved, onClose }: { task?: FollowupTask | null; leads: Lead[]; defaultLeadId?: string; onSaved: (task: FollowupTask) => void; onClose: () => void }) {
  const [leadId, setLeadId] = useState(task?.leadId ?? defaultLeadId ?? leads[0]?.id ?? "");
  const [title, setTitle] = useState(task?.title ?? "");
  const [dueAt, setDueAt] = useState(toDateInputValue(task?.dueAt));
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch(task ? `/api/tasks/${task.id}` : "/api/tasks", { method: task ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(task ? { title, dueAt: toIsoFromDateInput(dueAt) } : { leadId, title, dueAt: toIsoFromDateInput(dueAt) }) });
      const payload = await response.json() as { data?: FollowupTask; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "任务保存失败"); onSaved(payload.data);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "任务保存失败"); }
    finally { setSaving(false); }
  }
  return <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="task-form-title"><div className="modal-header"><div><h2 id="task-form-title">{task ? "编辑任务" : "新建跟进任务"}</h2><p>截止时间按北京时间保存为 UTC。</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="关闭"><X size={18} /></button></div><form onSubmit={submit}><div className="form-grid">{!task && <label className="form-field form-field-full"><span className="form-label">关联客户 <span className="required">*</span></span><select className="select" required value={leadId} onChange={(event) => setLeadId(event.target.value)}>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name} · {lead.company}</option>)}</select></label>}<label className="form-field form-field-full"><span className="form-label">任务名称 <span className="required">*</span></span><input className="field" required value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></label><label className="form-field"><span className="form-label">截止日期 <span className="required">*</span></span><input className="field" required type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label></div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button className="button button-secondary" type="button" onClick={onClose}>取消</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? "保存中…" : "保存任务"}</button></div></form></div></div>;
}
