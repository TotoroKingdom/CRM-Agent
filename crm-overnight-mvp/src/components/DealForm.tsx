"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { dealStageLabels } from "@/lib/types";
import type { Deal, DealStage, Lead } from "@/lib/types";
import { toDateInputValue, toIsoFromDateInput } from "@/lib/format";

export function DealForm({ deal, leads, defaultLeadId, onSaved, onClose }: { deal?: Deal | null; leads: Lead[]; defaultLeadId?: string; onSaved: (deal: Deal) => void; onClose: () => void }) {
  const [leadId, setLeadId] = useState(deal?.leadId ?? defaultLeadId ?? leads[0]?.id ?? "");
  const [title, setTitle] = useState(deal?.title ?? "");
  const [amount, setAmount] = useState(deal ? String(deal.amountCents / 100) : "");
  const [stage, setStage] = useState<DealStage>(deal?.stage ?? "DISCOVERY");
  const [expectedCloseAt, setExpectedCloseAt] = useState(toDateInputValue(deal?.expectedCloseAt));
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch(deal ? `/api/deals/${deal.id}` : "/api/deals", { method: deal ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(deal ? {} : { leadId }), title, amountCents: Math.round(Number(amount) * 100), stage, expectedCloseAt: expectedCloseAt ? toIsoFromDateInput(expectedCloseAt) : null }) });
      const payload = await response.json() as { data?: Deal; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "商机保存失败"); onSaved(payload.data);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "商机保存失败"); }
    finally { setSaving(false); }
  }
  return <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="deal-form-title"><div className="modal-header"><div><h2 id="deal-form-title">{deal ? "编辑商机" : "新建商机"}</h2><p>金额以人民币元录入，数据库保存为整数分。</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="关闭"><X size={18} /></button></div><form onSubmit={submit}><div className="form-grid">{!deal && <label className="form-field form-field-full"><span className="form-label">关联客户 <span className="required">*</span></span><select className="select" required value={leadId} onChange={(event) => setLeadId(event.target.value)}>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name} · {lead.company}</option>)}</select></label>}<label className="form-field form-field-full"><span className="form-label">商机名称 <span className="required">*</span></span><input className="field" required value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></label><label className="form-field"><span className="form-label">金额（元） <span className="required">*</span></span><input className="field" required type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label className="form-field"><span className="form-label">阶段</span><select className="select" value={stage} onChange={(event) => setStage(event.target.value as DealStage)}>{Object.entries(dealStageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="form-field"><span className="form-label">预计成交日期</span><input className="field" type="date" value={expectedCloseAt} onChange={(event) => setExpectedCloseAt(event.target.value)} /></label></div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button className="button button-secondary" type="button" onClick={onClose}>取消</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? "保存中…" : "保存商机"}</button></div></form></div></div>;
}
