"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { activityTypeLabels } from "@/lib/types";
import type { Activity, ActivityType } from "@/lib/types";
import { toDateTimeInputValue, toIsoFromDateTimeInput } from "@/lib/format";

export function ActivityForm({ leadId, onSaved, onClose }: { leadId: string; onSaved: (activity: Activity) => void; onClose: () => void }) {
  const [type, setType] = useState<ActivityType>("NOTE");
  const [content, setContent] = useState("");
  const [occurredAt, setOccurredAt] = useState(toDateTimeInputValue(new Date().toISOString()));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch(`/api/leads/${leadId}/activities`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, content, occurredAt: toIsoFromDateTimeInput(occurredAt) }) });
      const payload = await response.json() as { data?: Activity; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "互动记录保存失败");
      onSaved(payload.data);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "互动记录保存失败"); }
    finally { setSaving(false); }
  }
  return <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="activity-form-title"><div className="modal-header"><div><h2 id="activity-form-title">添加互动记录</h2><p>只记录沟通，不会自动发送消息。</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="关闭"><X size={18} /></button></div><form onSubmit={submit}><div className="form-grid"><label className="form-field"><span className="form-label">类型</span><select className="select" value={type} onChange={(event) => setType(event.target.value as ActivityType)}>{Object.entries(activityTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="form-field"><span className="form-label">发生时间</span><input className="field" required type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} /></label><label className="form-field form-field-full"><span className="form-label">记录内容 <span className="required">*</span></span><textarea className="field" required value={content} onChange={(event) => setContent(event.target.value)} autoFocus placeholder="例如：客户确认了下一步会议时间" /></label></div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button className="button button-secondary" type="button" onClick={onClose}>取消</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? "保存中…" : "保存记录"}</button></div></form></div></div>;
}
