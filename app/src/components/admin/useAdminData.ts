import { useCallback, useEffect, useState } from "react";
import type { AdminOverview, InboxStatus } from "@/lib/admin/types";
import type { AdminSettings } from "@/lib/admin/settings";

export type AdminLoadState = "loading" | "ready" | "forbidden" | "error";

type OverviewResult = { kind: "ok"; data: AdminOverview } | { kind: "forbidden" } | { kind: "error"; message: string };

async function fetchOverview(): Promise<OverviewResult> {
  try {
    const res = await fetch("/api/admin/overview", { cache: "no-store" });
    if (res.status === 401 || res.status === 403) return { kind: "forbidden" };
    const body = await res.json();
    if (!res.ok) return { kind: "error", message: body.error || `HTTP ${res.status}` };
    return { kind: "ok", data: body };
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : String(err) };
  }
}

async function send(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Request failed (${res.status})`);
}

/**
 * The admin overview plus its mutations. Not cached (fetchWithCache) on purpose: the page should
 * always show live numbers. Inbox changes update local state immediately, then save.
 */
export function useAdminData() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [state, setState] = useState<AdminLoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const applyResult = useCallback((result: OverviewResult) => {
    if (result.kind === "forbidden") setState("forbidden");
    else if (result.kind === "ok") {
      setData(result.data);
      setState("ready");
      setError(null);
    } else {
      setError(result.message);
      setState((s) => (s === "ready" ? s : "error"));
    }
  }, []);

  const load = useCallback(() => fetchOverview().then(applyResult), [applyResult]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  useEffect(() => {
    let cancelled = false;
    fetchOverview().then((result) => {
      if (!cancelled) applyResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [applyResult]);

  /** Optimistic local edit; reverts by reloading if the save fails */
  const mutate = async (apply: (d: AdminOverview) => AdminOverview, save: () => Promise<void>) => {
    setData((d) => (d ? apply(d) : d));
    try {
      await save();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      load();
    }
  };

  const setReportStatus = (id: string, status: InboxStatus) =>
    mutate(
      (d) => ({ ...d, reports: d.reports.map((r) => (r.id === id ? { ...r, status } : r)) }),
      () => send(`/api/admin/reports/${id}`, "PATCH", { status })
    );

  /** Take the reported item out of quizzes/review (resolving its reports), or restore it */
  const setReportItemStatus = (id: string, itemStatus: "removed" | "active") => {
    const report = data?.reports.find((r) => r.id === id);
    return mutate(
      (d) => ({
        ...d,
        reports: d.reports.map((r) =>
          report && r.itemId === report.itemId && r.itemType === report.itemType
            ? { ...r, itemStatus, status: itemStatus === "removed" ? "resolved" : r.status }
            : r
        ),
      }),
      () => send(`/api/admin/reports/${id}`, "PATCH", { itemStatus })
    );
  };

  const setFeedbackStatus = (id: string, status: InboxStatus) =>
    mutate(
      (d) => ({ ...d, feedback: d.feedback.map((f) => (f.id === id ? { ...f, status } : f)) }),
      () => send(`/api/admin/feedback/${id}`, "PATCH", { status })
    );

  /** Save settings, then reload: costs are recomputed server-side with the new prices */
  const saveSettings = async (settings: Partial<AdminSettings>) => {
    await send("/api/admin/settings", "PATCH", settings);
    await load();
  };

  return {
    data,
    state,
    error,
    refreshing,
    refresh,
    dismissError: () => setError(null),
    setReportStatus,
    setReportItemStatus,
    setFeedbackStatus,
    saveSettings,
  };
}
