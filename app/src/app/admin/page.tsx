"use client";

import Link from "next/link";
import "@/styles/admin.css";
import { useAdminData } from "@/components/admin/useAdminData";
import {
  AiPanel,
  GenerationPanel,
  InfraPanel,
  KpiRow,
  LearningPanel,
  TopPlaylistsPanel,
  TrendCharts,
} from "@/components/admin/OverviewSections";
import { AdminTables } from "@/components/admin/AdminTables";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import { timeAgo } from "@/components/admin/format";

const MIGRATION_FILE = "app/supabase/migrations/20261022_admin_page.sql";

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="admin-section">
      <div className="admin-section-header">
        <div>
          <h2 className="admin-section-title">{title}</h2>
          <p className="admin-section-sub">{sub}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/** /admin: users, AI spend, costs, learning analytics, reports & feedback inboxes (ADMIN_EMAILS only) */
export default function AdminPage() {
  const admin = useAdminData();
  const { data, state } = admin;

  return (
    <div className="admin-page">
      <header className="admin-nav">
        <div className="admin-nav-brand">
          <span className="admin-nav-logo" aria-hidden="true">S</span>
          <span className="admin-nav-title">StudyDesk Admin</span>
        </div>
        <div className="admin-nav-controls">
          {data && <span className="admin-synced">Updated {timeAgo(data.generatedAt)}</span>}
          <button className="admin-btn" onClick={admin.refresh} disabled={admin.refreshing}>
            {admin.refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <Link className="admin-btn" href="/">Back to app</Link>
        </div>
      </header>

      {state === "forbidden" ? (
        <div className="admin-center">
          <h1 className="admin-section-title">Admins only</h1>
          <p>This account doesn&apos;t have access to the admin page.</p>
          <Link className="admin-btn" href="/">Back to app</Link>
        </div>
      ) : state === "error" && !data ? (
        <div className="admin-center">
          <h1 className="admin-section-title">Couldn&apos;t load the admin data</h1>
          <p>{admin.error}</p>
          <button className="admin-btn" onClick={admin.refresh}>Try again</button>
        </div>
      ) : !data ? (
        <main className="admin-main" aria-busy="true">
          <div className="admin-grid-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="admin-skeleton" />)}
          </div>
          <div className="admin-grid-2">
            {[0, 1].map((i) => <div key={i} className="admin-skeleton" style={{ minHeight: 220 }} />)}
          </div>
        </main>
      ) : (
        <main className="admin-main">
          {admin.error && (
            <div className="admin-banner error" role="alert">
              {admin.error}{" "}
              <button className="admin-btn small" onClick={admin.dismissError}>Dismiss</button>
            </div>
          )}
          {data.setupNeeded.length > 0 && (
            <div className="admin-banner">
              <strong>One-time setup needed:</strong> run <code>{MIGRATION_FILE}</code> in the Supabase SQL editor
              to enable: {data.setupNeeded.join(", ")}.
            </div>
          )}

          <Section title="Overview" sub="Users, activity and costs at a glance.">
            <KpiRow data={data} />
            <TrendCharts data={data} />
          </Section>

          <Section title="AI & content" sub="Gemini token spend and how much course content has been generated.">
            <div className="admin-grid-2">
              <AiPanel data={data} />
              <GenerationPanel data={data} />
            </div>
          </Section>

          <Section title="Learning & infrastructure" sub="What learners do, the most popular playlists, and what the database costs.">
            <div className="admin-grid-3">
              <LearningPanel data={data} />
              <TopPlaylistsPanel data={data} />
              <InfraPanel data={data} />
            </div>
          </Section>

          <Section title="Users & inbox" sub="Every account, reported questions and flashcards, feedback, and failed generations.">
            <AdminTables
              data={data}
              onReportStatus={admin.setReportStatus}
              onReportItemStatus={admin.setReportItemStatus}
              onFeedbackStatus={admin.setFeedbackStatus}
            />
          </Section>

          <Section title="Settings" sub="Prices and plan costs used for the cost numbers above.">
            <SettingsPanel
              key={JSON.stringify(data.settings)}
              settings={data.settings}
              editable={!data.setupNeeded.includes("Editable prices & plan costs")}
              onSave={admin.saveSettings}
            />
          </Section>
        </main>
      )}
    </div>
  );
}
