"use client";

import { useState } from "react";
import type { AdminSettings } from "@/lib/admin/settings";

interface SettingsPanelProps {
  settings: AdminSettings;
  /** False until the admin-page migration has created admin_settings */
  editable: boolean;
  onSave: (settings: AdminSettings) => Promise<void>;
}

/**
 * Numbers no API provides: Gemini prices, AI budget, plan costs, exchange rate. Remounted (via
 * `key`) after a save so the fields show what was stored.
 */
export function SettingsPanel({ settings, editable, onSave }: SettingsPanelProps) {
  const [draft, setDraft] = useState<AdminSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const num = (value: string) => (value === "" ? 0 : Number(value));
  const field = (label: string, value: string | number, onChange: (v: string) => void, opts: { type?: string; step?: string; hint?: string } = {}) => (
    <div className="admin-field">
      <label>
        {label}
        <input
          className="admin-input"
          type={opts.type ?? "number"}
          step={opts.step ?? "any"}
          min={opts.type === "text" ? undefined : 0}
          value={value}
          disabled={!editable}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      {opts.hint && <span className="admin-muted">{opts.hint}</span>}
    </div>
  );

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await onSave(draft);
      setMessage({ kind: "ok", text: "Saved. Costs above are recalculated." });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel-card">
      <div className="panel-header">
        <h3 className="panel-title">Settings: prices, budget & plans</h3>
        {!editable && <span className="admin-chip amber">Needs migration</span>}
      </div>

      <div className="panel-subtitle">Gemini prices (USD per 1M tokens)</div>
      <div className="admin-settings-grid">
        {Object.entries(draft.gemini_prices).map(([model, price]) => (
          <div key={model} className="admin-field">
            <span className="admin-mono">{model}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="admin-input"
                type="number"
                step="any"
                min={0}
                aria-label={`${model} input price`}
                title="Input"
                value={price.input}
                disabled={!editable}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, gemini_prices: { ...d.gemini_prices, [model]: { ...price, input: num(e.target.value) } } }))
                }
              />
              <input
                className="admin-input"
                type="number"
                step="any"
                min={0}
                aria-label={`${model} output price`}
                title="Output"
                value={price.output}
                disabled={!editable}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, gemini_prices: { ...d.gemini_prices, [model]: { ...price, output: num(e.target.value) } } }))
                }
              />
            </div>
            <span className="admin-muted">Input · output</span>
          </div>
        ))}
      </div>
      <p className="admin-muted" style={{ marginTop: 6 }}>
        Check current rates at{" "}
        <a className="admin-link" href="https://ai.google.dev/gemini-api/docs/pricing" target="_blank" rel="noreferrer">
          ai.google.dev/gemini-api/docs/pricing
        </a>
        . Only gemini-3-flash-preview&apos;s default is confirmed; the other two are estimates.
      </p>

      <div className="panel-subtitle">Budget & plans</div>
      <div className="admin-settings-grid">
        {field("Monthly Gemini budget (USD)", draft.gemini_monthly_budget_usd, (v) => setDraft((d) => ({ ...d, gemini_monthly_budget_usd: num(v) })), { hint: "Set this to the credit / spend cap you have" })}
        {field("Supabase plan name", draft.supabase_plan.name, (v) => setDraft((d) => ({ ...d, supabase_plan: { ...d.supabase_plan, name: v } })), { type: "text" })}
        {field("Supabase cost (USD / month)", draft.supabase_plan.monthly_usd, (v) => setDraft((d) => ({ ...d, supabase_plan: { ...d.supabase_plan, monthly_usd: num(v) } })), { hint: "Free $0 · Pro $25" })}
        {field("Supabase database limit (MB)", draft.supabase_plan.db_limit_mb, (v) => setDraft((d) => ({ ...d, supabase_plan: { ...d.supabase_plan, db_limit_mb: Math.max(1, num(v)) } })), { hint: "Free 500 MB · Pro 8,192 MB" })}
        {field("Hosting name", draft.hosting.name, (v) => setDraft((d) => ({ ...d, hosting: { ...d.hosting, name: v } })), { type: "text" })}
        {field("Hosting cost (USD / month)", draft.hosting.monthly_usd, (v) => setDraft((d) => ({ ...d, hosting: { ...d.hosting, monthly_usd: num(v) } })), { hint: "e.g. Vercel Pro $20" })}
        {field("USD → INR rate", draft.usd_to_inr, (v) => setDraft((d) => ({ ...d, usd_to_inr: num(v) })))}
      </div>

      <div className="admin-settings-actions">
        <button className="admin-btn primary" onClick={save} disabled={!editable || saving}>
          {saving ? "Saving…" : "Save settings"}
        </button>
        {message && (
          <span className={message.kind === "ok" ? "metric-num good" : "metric-num bad"} role="status" style={{ fontSize: 13 }}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
