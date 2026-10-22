"use client";

import { useState } from "react";
import type { AdminOverview, InboxStatus } from "@/lib/admin/types";
import { formatDate, formatMinutes, timeAgo } from "./format";

type Tab = "users" | "reports" | "feedback" | "failures";

interface AdminTablesProps {
  data: AdminOverview;
  onReportStatus: (id: string, status: InboxStatus) => void;
  onReportItemStatus: (id: string, itemStatus: "removed" | "active") => void;
  onFeedbackStatus: (id: string, status: InboxStatus) => void;
}

const STATUS_CHIP: Record<InboxStatus, string> = { new: "red", seen: "amber", resolved: "green" };
const StatusChip = ({ status }: { status: InboxStatus }) => (
  <span className={`admin-chip ${STATUS_CHIP[status]}`}>{status}</span>
);

/** Status filter + text search shared by the inbox tabs */
function useInboxFilter() {
  const [status, setStatus] = useState<"open" | InboxStatus | "all">("open");
  const [query, setQuery] = useState("");
  const matches = (itemStatus: InboxStatus, text: string) =>
    (status === "all" || (status === "open" ? itemStatus !== "resolved" : itemStatus === status)) &&
    text.toLowerCase().includes(query.trim().toLowerCase());
  const controls = (
    <div className="admin-filters">
      <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status">
        <option value="open">Open (new + seen)</option>
        <option value="new">New</option>
        <option value="seen">Seen</option>
        <option value="resolved">Resolved</option>
        <option value="all">All</option>
      </select>
      <input className="admin-input" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
    </div>
  );
  return { matches, controls };
}

function UsersTab({ data }: { data: AdminOverview }) {
  const [query, setQuery] = useState("");
  const rows = data.users.list.filter((u) => u.email.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <>
      <div className="admin-filters">
        <input className="admin-input" placeholder="Search by email…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search users" />
        <span className="admin-muted">{rows.length} of {data.users.total} users</span>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Joined</th>
              <th>Last sign-in</th>
              <th>Last studied</th>
              <th className="num">Courses</th>
              <th className="num">Study (30d / total)</th>
              <th className="num">Chapters done</th>
              <th className="num">Quizzes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="cell-main">{u.email}</div>
                  <div className="cell-sub">
                    {u.providers.join(", ") || "email"}
                    {!u.confirmed && " · email not confirmed"}
                  </div>
                </td>
                <td>{formatDate(u.createdAt)}</td>
                <td>{timeAgo(u.lastSignInAt)}</td>
                <td>{u.lastActiveDate ? formatDate(u.lastActiveDate) : "never"}</td>
                <td className="num">{u.courses}</td>
                <td className="num">{formatMinutes(u.studyMinutes30d)} / {formatMinutes(u.studyMinutesTotal)}</td>
                <td className="num">{u.chaptersCompleted}</td>
                <td className="num">{u.quizAttempts}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="admin-empty">No users match.</div>}
      </div>
    </>
  );
}

function ReportsTab({ data, onReportStatus, onReportItemStatus }: Omit<AdminTablesProps, "onFeedbackStatus">) {
  const { matches, controls } = useInboxFilter();
  const rows = data.reports.filter((r) =>
    matches(r.status, `${r.itemText} ${r.reason} ${r.category} ${r.videoTitle} ${r.reporterEmail}`)
  );
  return (
    <>
      {controls}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Reported</th>
              <th>Item</th>
              <th>Issue</th>
              <th>Status</th>
              <th className="num">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.status === "resolved" ? "is-resolved" : undefined}>
                <td>
                  <div className="cell-main">{timeAgo(r.createdAt)}</div>
                  <div className="cell-sub">{r.reporterEmail}</div>
                </td>
                <td>
                  <div className="cell-main cell-clamp" title={r.itemText}>
                    <span className="admin-chip" style={{ marginRight: 6 }}>{r.itemType}</span>
                    {r.itemText}
                  </div>
                  <div className="cell-sub cell-clamp" title={r.itemAnswer}>
                    {r.itemType === "question" ? "Answer: " : "Back: "}
                    {r.itemAnswer || "—"}
                  </div>
                  <div className="cell-sub">{r.videoTitle}</div>
                </td>
                <td>
                  <div className="cell-main">{r.category}</div>
                  {r.reason && <div className="cell-sub cell-clamp" title={r.reason}>&ldquo;{r.reason}&rdquo;</div>}
                  {r.reportsForItem > 1 && <div className="cell-sub">Reported {r.reportsForItem} times</div>}
                </td>
                <td>
                  <StatusChip status={r.status} />
                  {r.itemStatus === "removed" && <div className="cell-sub">Removed from quizzes</div>}
                </td>
                <td>
                  <div className="cell-actions">
                    {r.status === "new" && (
                      <button className="admin-btn small" onClick={() => onReportStatus(r.id, "seen")}>Mark seen</button>
                    )}
                    {r.status !== "resolved" ? (
                      <button className="admin-btn small" onClick={() => onReportStatus(r.id, "resolved")}>Resolve</button>
                    ) : (
                      <button className="admin-btn small" onClick={() => onReportStatus(r.id, "new")}>Reopen</button>
                    )}
                    {r.itemId &&
                      (r.itemStatus === "removed" ? (
                        <button className="admin-btn small" onClick={() => onReportItemStatus(r.id, "active")}>Restore {r.itemType}</button>
                      ) : (
                        <button
                          className="admin-btn small danger"
                          onClick={() => {
                            if (confirm(`Remove this ${r.itemType} from every quiz, review and recall? You can restore it later.`)) {
                              onReportItemStatus(r.id, "removed");
                            }
                          }}
                        >
                          Remove {r.itemType}
                        </button>
                      ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="admin-empty">No reports here.</div>}
      </div>
    </>
  );
}

function FeedbackTab({ data, onFeedbackStatus }: Pick<AdminTablesProps, "data" | "onFeedbackStatus">) {
  const { matches, controls } = useInboxFilter();
  const rows = data.feedback.filter((f) => matches(f.status, `${f.message} ${f.email} ${f.category}`));
  return (
    <>
      {controls}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Received</th>
              <th>Message</th>
              <th>Status</th>
              <th className="num">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id} className={f.status === "resolved" ? "is-resolved" : undefined}>
                <td>
                  <div className="cell-main">{timeAgo(f.createdAt)}</div>
                  <div className="cell-sub">{f.email}</div>
                </td>
                <td>
                  <div className="cell-main" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxWidth: 560 }}>
                    <span className="admin-chip" style={{ marginRight: 6 }}>{f.category}</span>
                    {f.message}
                  </div>
                  {f.page && <div className="cell-sub admin-mono">{f.page}</div>}
                </td>
                <td><StatusChip status={f.status} /></td>
                <td>
                  <div className="cell-actions">
                    {f.status === "new" && (
                      <button className="admin-btn small" onClick={() => onFeedbackStatus(f.id, "seen")}>Mark seen</button>
                    )}
                    {f.status !== "resolved" ? (
                      <button className="admin-btn small" onClick={() => onFeedbackStatus(f.id, "resolved")}>Resolve</button>
                    ) : (
                      <button className="admin-btn small" onClick={() => onFeedbackStatus(f.id, "new")}>Reopen</button>
                    )}
                    <a className="admin-btn small" href={`mailto:${f.email}?subject=${encodeURIComponent("Your StudyDesk feedback")}`}>Reply</a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="admin-empty">No feedback here.</div>}
      </div>
    </>
  );
}

function FailuresTab({ data }: { data: AdminOverview }) {
  const rows = data.ai.recentFailures;
  return (
    <div className="admin-table-wrap" style={{ marginTop: 14 }}>
      <table className="admin-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Chapter</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f, i) => (
            <tr key={`${f.at}-${i}`}>
              <td>{timeAgo(f.at)}</td>
              <td>
                <div className="cell-main">{f.videoTitle}</div>
                <div className="cell-sub">{f.playlistTitle}</div>
              </td>
              <td><div className="cell-clamp admin-mono" title={f.error}>{f.error}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="admin-empty">No failed generations recorded.</div>}
    </div>
  );
}

/** Users, reports inbox, feedback inbox and generation failures, as tabs */
export function AdminTables(props: AdminTablesProps) {
  const { data } = props;
  const openReports = data.reports.filter((r) => r.status === "new").length;
  const openFeedback = data.feedback.filter((f) => f.status === "new").length;
  const [tab, setTab] = useState<Tab>(openReports || openFeedback ? (openFeedback && !openReports ? "feedback" : "reports") : "users");

  const tabs: { id: Tab; label: string; count: number; alert?: boolean }[] = [
    { id: "users", label: "Users", count: data.users.total },
    { id: "reports", label: "Reported questions & cards", count: openReports, alert: openReports > 0 },
    { id: "feedback", label: "Feedback", count: openFeedback, alert: openFeedback > 0 },
    { id: "failures", label: "Failed generations", count: data.ai.recentFailures.length },
  ];

  return (
    <div className="panel-card">
      <div className="admin-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`admin-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            <span className={`admin-tab-count ${t.alert ? "alert" : ""}`}>{t.count}</span>
          </button>
        ))}
      </div>
      {tab === "users" && <UsersTab data={data} />}
      {tab === "reports" && <ReportsTab {...props} />}
      {tab === "feedback" && <FeedbackTab data={data} onFeedbackStatus={props.onFeedbackStatus} />}
      {tab === "failures" && <FailuresTab data={data} />}
    </div>
  );
}
