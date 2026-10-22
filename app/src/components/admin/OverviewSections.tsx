"use client";

import type { AdminOverview } from "@/lib/admin/types";
import { ColumnChart } from "./ColumnChart";
import { formatBytes, formatCount, formatInr, formatMinutes, formatUsd, pct } from "./format";

type Props = { data: AdminOverview };

function Kpi({ label, value, unit, chip, desc, accent }: {
  label: string;
  value: string;
  unit?: string;
  chip?: React.ReactNode;
  desc: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="kpi-card" style={accent ? ({ "--kpi-accent": accent } as React.CSSProperties) : undefined}>
      <div className="kpi-top-row">
        <span className="kpi-label">{label}</span>
        {chip}
      </div>
      <div className="kpi-value">
        {value}
        {unit && <small>{unit}</small>}
      </div>
      <div className="kpi-desc">{desc}</div>
    </div>
  );
}

function Metric({ name, value, tone }: { name: React.ReactNode; value: React.ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="metric-row">
      <span className="metric-name">{name}</span>
      <span className={`metric-num ${tone ?? ""}`}>{value}</span>
    </div>
  );
}

function Meter({ percent }: { percent: number }) {
  const tone = percent >= 90 ? "danger" : percent >= 70 ? "warn" : "";
  return (
    <div className="admin-meter" role="meter" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className={`admin-meter-fill ${tone}`} style={{ width: `${Math.min(100, percent)}%` }} />
    </div>
  );
}

/** Top row: users, activity, AI spend vs budget, monthly cost */
export function KpiRow({ data }: Props) {
  const { users, ai, infra, settings } = data;
  const inr = settings.usd_to_inr;
  return (
    <div className="admin-grid-4">
      <Kpi
        label="Registered users"
        value={formatCount(users.total)}
        chip={users.new7d > 0 && <span className="admin-chip green">+{users.new7d} this week</span>}
        desc={`${users.new30d} new in the last 30 days`}
      />
      <Kpi
        label="Active learners"
        value={formatCount(users.activeToday)}
        unit="today"
        chip={
          <span className={`admin-chip ${users.studyingNow ? "green" : ""}`}>
            {users.studyingNow} studying now
          </span>
        }
        desc={`${users.active7d} in 7 days · ${users.active30d} in 30 days`}
        accent="var(--color-success)"
      />
      <Kpi
        label="Gemini spend this month"
        value={formatUsd(ai.spendMonthUsd)}
        unit={formatInr(ai.spendMonthUsd, inr)}
        chip={
          <span className={`admin-chip ${ai.budgetUsedPct >= 90 ? "red" : ai.budgetUsedPct >= 70 ? "amber" : "primary"}`}>
            {ai.budgetUsedPct}% of budget
          </span>
        }
        desc={
          <>
            Budget {formatUsd(ai.budgetUsd)} · {formatUsd(Math.max(0, ai.budgetUsd - ai.spendMonthUsd))} left
            <Meter percent={ai.budgetUsedPct} />
          </>
        }
        accent="var(--color-accent)"
      />
      <Kpi
        label="Est. monthly cost"
        value={formatUsd(infra.monthlyTotalUsd)}
        unit={formatInr(infra.monthlyTotalUsd, inr)}
        desc={`${settings.supabase_plan.name} Supabase ${formatUsd(settings.supabase_plan.monthly_usd)} + ${settings.hosting.name} ${formatUsd(settings.hosting.monthly_usd)} + AI so far`}
      />
    </div>
  );
}

/** 30-day trends */
export function TrendCharts({ data }: Props) {
  const series = (key: "activeUsers" | "signups" | "studyMinutes" | "aiCostUsd") =>
    data.daily.map((d) => ({ date: d.date, value: d[key] }));
  const charts = [
    { title: "Active learners per day", key: "activeUsers" as const, integer: true, fmt: (v: number) => `${v} learner${v === 1 ? "" : "s"}` },
    { title: "New sign-ups per day", key: "signups" as const, integer: true, fmt: (v: number) => `${v} sign-up${v === 1 ? "" : "s"}` },
    { title: "Study time per day", key: "studyMinutes" as const, fmt: (v: number) => formatMinutes(v), tick: (v: number) => formatMinutes(v) },
    { title: "Gemini spend per day", key: "aiCostUsd" as const, fmt: (v: number) => formatUsd(v), tick: (v: number) => `$${v < 1 ? v.toFixed(2) : Math.round(v)}` },
  ];
  return (
    <div className="admin-grid-2">
      {charts.map((c) => (
        <div className="panel-card" key={c.key}>
          <div className="panel-header">
            <h3 className="panel-title">{c.title}</h3>
            <span className="admin-muted">Last 30 days (UTC)</span>
          </div>
          <ColumnChart points={series(c.key)} formatValue={c.fmt} formatTick={c.tick} label={c.title} integer={c.integer} />
        </div>
      ))}
    </div>
  );
}

/** Gemini tokens, cost per model, quota errors */
export function AiPanel({ data }: Props) {
  const { ai, settings } = data;
  return (
    <div className="panel-card">
      <div className="panel-header">
        <h3 className="panel-title">Gemini AI credits & usage</h3>
        <span className="admin-chip">This month</span>
      </div>
      <Metric name="Spend" value={`${formatUsd(ai.spendMonthUsd)} · ${formatInr(ai.spendMonthUsd, settings.usd_to_inr)}`} />
      <Metric name="Budget left" value={formatUsd(Math.max(0, ai.budgetUsd - ai.spendMonthUsd))} tone={ai.budgetUsedPct >= 90 ? "bad" : undefined} />
      <Metric name="Input tokens (transcripts + prompt)" value={formatCount(ai.tokensInMonth)} />
      <Metric name="Output tokens (questions, flashcards, thinking)" value={formatCount(ai.tokensOutMonth)} />
      <Metric name="Gemini calls" value={formatCount(ai.callsMonth)} />
      <Metric name="Average cost per generated chapter" value={ai.avgCostPerVideoUsd != null ? formatUsd(ai.avgCostPerVideoUsd) : "—"} />
      <Metric
        name="Quota / rate-limit errors"
        value={ai.quotaErrorsMonth ? `${ai.quotaErrorsMonth} — check Gemini quota` : "None"}
        tone={ai.quotaErrorsMonth ? "bad" : "good"}
      />
      <Metric name="All-time tracked spend" value={formatUsd(ai.spendAllTimeUsd)} />

      {ai.perModel.length > 0 && (
        <>
          <div className="panel-subtitle">By model</div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th className="num">Calls</th>
                  <th className="num">In / out tokens</th>
                  <th className="num">Cost</th>
                </tr>
              </thead>
              <tbody>
                {ai.perModel.map((m) => (
                  <tr key={m.model}>
                    <td className="admin-mono">{m.model}</td>
                    <td className="num">{m.calls}</td>
                    <td className="num">{formatCount(m.inputTokens)} / {formatCount(m.outputTokens)}</td>
                    <td className="num">{formatUsd(m.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="admin-muted" style={{ marginTop: 10 }}>
        Google has no API for remaining credit: spend is tokens × the prices in Settings below.
        {ai.untrackedJobs > 0 && ` ${ai.untrackedJobs} older generation attempt(s) ran before token tracking and aren't counted.`}
      </p>
    </div>
  );
}

/** Content generation health */
export function GenerationPanel({ data }: Props) {
  const { content, jobs } = data.ai;
  const segments = [
    { cls: "status-ready", label: "Ready", n: content.ready },
    { cls: "status-pending", label: "Generating", n: content.pending },
    { cls: "status-failed", label: "Failed", n: content.failed },
    { cls: "status-none", label: "Not started", n: content.notStarted },
  ];
  return (
    <div className="panel-card">
      <div className="panel-header">
        <h3 className="panel-title">Quiz & flashcard generation</h3>
        <span className="admin-chip">{formatCount(content.total)} chapters</span>
      </div>
      <div className="status-bar" aria-hidden="true">
        {segments.filter((s) => s.n > 0).map((s) => (
          <span key={s.cls} className={s.cls} style={{ flexGrow: s.n }} title={`${s.label}: ${s.n}`} />
        ))}
      </div>
      <div className="status-legend">
        {segments.map((s) => (
          <span key={s.cls}>
            <i className={s.cls} /> {s.label} {formatCount(s.n)} ({pct(s.n, content.total)}%)
          </span>
        ))}
      </div>
      <div className="panel-subtitle">Generation attempts (all time)</div>
      <Metric name="Completed" value={formatCount(jobs.completed)} tone="good" />
      <Metric name="Failed" value={formatCount(jobs.failed)} tone={jobs.failed ? "bad" : undefined} />
      <Metric name="Running now" value={formatCount(jobs.processing)} />
      <p className="admin-muted" style={{ marginTop: 6 }}>
        Failures are retried automatically (up to 3 times in the background); see the Failed generations tab for reasons.
      </p>
    </div>
  );
}

/** What learners do */
export function LearningPanel({ data }: Props) {
  const l = data.learning;
  const chapters = l.chaptersCompleted + l.chaptersCompletedWithoutQuiz;
  return (
    <div className="panel-card">
      <div className="panel-header">
        <h3 className="panel-title">Learning activity</h3>
        <span className="admin-chip">All time</span>
      </div>
      <Metric name="Total study time" value={`${l.totalStudyHours} h`} />
      <Metric name="Average per active day" value={formatMinutes(l.avgMinutesPerActiveDay)} />
      <Metric name="Courses (enrolments)" value={formatCount(l.courses)} />
      <Metric name="Unique playlists · chapters" value={`${formatCount(l.playlists)} · ${formatCount(l.videos)}`} />
      <Metric name="Chapters completed" value={`${formatCount(chapters)} (${pct(l.chaptersCompleted, chapters)}% with quiz)`} />
      <Metric name="Quizzes taken · skipped" value={`${formatCount(l.quizAttempts - l.quizzesSkipped)} · ${formatCount(l.quizzesSkipped)}`} />
      <Metric name="Answer accuracy" value={l.accuracyPct != null ? `${l.accuracyPct}% of ${formatCount(l.answers)}` : "—"} />
      <Metric name="Average correct per quiz" value={l.avgQuizScore ?? "—"} />
      <Metric name="Questions · flashcards (active)" value={`${formatCount(l.questions)} · ${formatCount(l.flashcards)}`} />
      <Metric name="Notes pages · bookmarks" value={`${formatCount(l.notes)} · ${formatCount(l.bookmarks)}`} />
    </div>
  );
}

/** Most-enrolled playlists */
export function TopPlaylistsPanel({ data }: Props) {
  const top = data.learning.topPlaylists;
  return (
    <div className="panel-card">
      <div className="panel-header">
        <h3 className="panel-title">Top playlists</h3>
        <span className="admin-chip">By enrolments</span>
      </div>
      {top.length === 0 ? (
        <div className="admin-empty">No courses yet.</div>
      ) : (
        top.map((p, i) => (
          <Metric
            key={`${p.title}-${i}`}
            name={<span className="clamp-text" style={{ "--clamp-lines": 1 } as React.CSSProperties} title={p.title}>{i + 1}. {p.title}</span>}
            value={`${p.enrolled} learner${p.enrolled === 1 ? "" : "s"} · ${p.videos} ch`}
          />
        ))
      )}
    </div>
  );
}

/** Database size vs plan, biggest tables, fixed costs */
export function InfraPanel({ data }: Props) {
  const { infra, settings } = data;
  const used = infra.databaseBytes != null ? pct(infra.databaseBytes, infra.databaseLimitBytes) : null;
  return (
    <div className="panel-card">
      <div className="panel-header">
        <h3 className="panel-title">Database & server costs</h3>
        <span className="admin-chip">{settings.supabase_plan.name} plan</span>
      </div>
      <Metric
        name="Database size"
        value={
          infra.databaseBytes != null
            ? `${formatBytes(infra.databaseBytes)} of ${formatBytes(infra.databaseLimitBytes)} (${used}%)`
            : "Run the migration to see this"
        }
        tone={used != null && used >= 80 ? "bad" : undefined}
      />
      {used != null && <Meter percent={used} />}
      <Metric name="Supabase plan" value={`${formatUsd(settings.supabase_plan.monthly_usd)} / month`} />
      <Metric name={`Hosting (${settings.hosting.name})`} value={`${formatUsd(settings.hosting.monthly_usd)} / month`} />
      <Metric name="Fixed monthly total" value={`${formatUsd(infra.monthlyFixedUsd)} · ${formatInr(infra.monthlyFixedUsd, settings.usd_to_inr)}`} />
      {infra.tables.length > 0 && (
        <>
          <div className="panel-subtitle">Largest tables</div>
          {infra.tables.slice(0, 6).map((t) => (
            <Metric key={t.name} name={<span className="admin-mono">{t.name}</span>} value={`${formatBytes(t.bytes)} · ~${formatCount(t.rows)} rows`} />
          ))}
        </>
      )}
      <p className="admin-muted" style={{ marginTop: 8 }}>
        Plan prices are entered in Settings; exact Supabase and hosting bills are in their dashboards.
      </p>
    </div>
  );
}
