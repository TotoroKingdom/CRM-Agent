"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { channelLabels, leadStatusLabels, priorityLabels } from "@/lib/types";
import type { Channel, Lead, LeadStatus, Priority } from "@/lib/types";
import { crmApi } from "@/lib/api/client";
import type { LeadCreate } from "@/lib/types";

type Props = { lead?: Lead | null; onSaved: (lead: Lead) => void; onClose: () => void };

export function LeadForm({ lead, onSaved, onClose }: Props) {
  const [form, setForm] = useState({
    name: lead?.name ?? "", company: lead?.company ?? "", email: lead?.email ?? "", phone: lead?.phone ?? "",
    channel: lead?.channel ?? "WEBSITE" as Channel, status: lead?.status ?? "NEW" as LeadStatus,
    priority: lead?.priority ?? "MEDIUM" as Priority, country: lead?.country ?? "", note: lead?.note ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function setField(field: keyof typeof form, value: string) { setForm((current) => ({ ...current, [field]: value })); }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const payload: LeadCreate = {
        ...form,
        channel: form.channel as Channel,
        status: form.status as LeadStatus,
        priority: form.priority as Priority,
        email: form.email || null,
        phone: form.phone || null,
        country: form.country || null,
        note: form.note || null,
      };
      onSaved(lead ? await crmApi.updateLead(lead.id, payload) : await crmApi.createLead(payload));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "保存失败，请稍后再试"); }
    finally { setSaving(false); }
  }

  return <div className="modal-backdrop" role="presentation"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="lead-form-title"><div className="modal-header"><div><h2 id="lead-form-title">{lead ? "编辑线索" : "新建线索"}</h2><p>保存后数据会写入本机数据库。</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="关闭"><X size={18} /></button></div><form onSubmit={submit}><div className="form-grid"><Field label="客户姓名" required><input className="field" required value={form.name} onChange={(event) => setField("name", event.target.value)} autoFocus /></Field><Field label="公司名称" required><input className="field" required value={form.company} onChange={(event) => setField("company", event.target.value)} /></Field><Field label="邮箱"><input className="field" type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} /></Field><Field label="电话"><input className="field" value={form.phone} onChange={(event) => setField("phone", event.target.value)} /></Field><Field label="渠道"><select className="select" value={form.channel} onChange={(event) => setField("channel", event.target.value)}>{Object.entries(channelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="状态"><select className="select" value={form.status} onChange={(event) => setField("status", event.target.value)}>{Object.entries(leadStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="优先级"><select className="select" value={form.priority} onChange={(event) => setField("priority", event.target.value)}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="国家/地区"><input className="field" value={form.country} onChange={(event) => setField("country", event.target.value)} /></Field><Field label="备注" full><textarea className="field" value={form.note} onChange={(event) => setField("note", event.target.value)} /></Field></div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button className="button button-secondary" type="button" onClick={onClose}>取消</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? "保存中…" : "保存线索"}</button></div></form></div></div>;
}

function Field({ label, required, full, children }: { label: string; required?: boolean; full?: boolean; children: React.ReactNode }) { return <label className={`form-field ${full ? "form-field-full" : ""}`}><span className="form-label">{label}{required && <span className="required"> *</span>}</span>{children}</label>; }
