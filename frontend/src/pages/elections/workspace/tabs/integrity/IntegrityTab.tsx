
// src/pages/elections/workspace/tabs/IntegrityTab.tsx

import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { useAuthStore } from "../../../../../shared/store/authStore";

import {
  Panel,
  SimpleTable,
  PlaceholderNote,
  Badge,
} from "../../../shared/elections-ui";

import {
  searchDiscrepancies,
  reconcileDiscrepancies,
  searchAnomalies,
  type DiscrepancyDto,
  type DiscrepancyStatus,
  type AnomalyEventDto,
  type AnomalyKind,
} from "../../../../../shared/services/integrityService";

function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function unwrapPage<T>(data: any): { items: T[]; totalPages: number } {
  const items = (Array.isArray(data?.items) && data.items) ||
    (Array.isArray(data?.content) && data.content) ||
    [];
  const totalPages = Number(data?.totalPages ?? 1) || 1;
  return { items, totalPages };
}

function fmtDate(v: any): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return safeStr(v);
  return d.toLocaleString();
}

function kindLabel(k: string) {
  return safeStr(k)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

/**
 * WORKSPACE: INTEGRITY
 * - discrepancy (official vs party deltas)
 * - anomaly_event (policy-defined anomalies)
 */
export default function IntegrityTab() {
  const qc = useQueryClient();
  const { electionId = "" } = useParams<{ electionId: string }>();

  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const canEdit = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  // NOTE: adjust this selector if your auth store uses a different key.
  const orgId = useAuthStore((s: any) => s.orgId ?? s.user?.orgId ?? "");

  /** Discrepancy filters/paging */
  const [discPage, setDiscPage] = useState(0);
  const [discStatus, setDiscStatus] = useState<DiscrepancyStatus | "">("OPEN");

  /** Anomaly filters/paging */
  const [anomPage, setAnomPage] = useState(0);
  const [anomKind, setAnomKind] = useState<AnomalyKind | "">("");
  const [anomQ, setAnomQ] = useState("");

  const discQ = useQuery({
    queryKey: ["integrity", "discrepancies", electionId, orgId, discStatus, discPage],
    queryFn: () =>
      searchDiscrepancies({
        electionId: electionId || undefined,
        // If you want org-scoped discrepancies only, add orgId to backend search later.
        status: discStatus || undefined,
        page: discPage,
        size: 20,
      }),
    enabled: !!electionId,
    staleTime: 10_000,
    retry: 1,
  });

  const anomQy = useQuery({
    queryKey: ["integrity", "anomalies", electionId, orgId, anomKind, anomQ, anomPage],
    queryFn: () =>
      searchAnomalies({
        electionId: electionId || undefined,
        orgId: orgId || undefined,
        kind: anomKind || undefined,
        q: anomQ.trim() || undefined,
        page: anomPage,
        size: 20,
      }),
    enabled: !!electionId,
    staleTime: 10_000,
    retry: 1,
  });

  const reconcileM = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new Error("NEC/SYSTEM only.");
      if (!orgId) throw new Error("Missing orgId in session.");
      if (!electionId) throw new Error("Missing electionId.");
      return reconcileDiscrepancies({ orgId, electionId });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["integrity", "discrepancies"] });
      await discQ.refetch();
    },
  });

  const refreshAll = async () => {
    await qc.invalidateQueries({ queryKey: ["integrity"] });
    await Promise.all([discQ.refetch(), anomQy.refetch()]);
  };

  const discPageData = useMemo(() => unwrapPage<DiscrepancyDto>(discQ.data), [discQ.data]);
  const anomPageData = useMemo(() => unwrapPage<AnomalyEventDto>(anomQy.data), [anomQy.data]);

  const discrepancyRows = useMemo(() => {
    return discPageData.items.map((d) => [
      d.status,
      safeStr(d.countyName) || "—",
      safeStr(d.centerCode) || "—",
      [
        d.deltaValid == null ? "ΔV: —" : `ΔV: ${d.deltaValid}`,
        d.deltaInvalid == null ? "ΔI: —" : `ΔI: ${d.deltaInvalid}`,
      ].join("  •  "),
      fmtDate(d.notedAt),
      "discrepancy",
    ]);
  }, [discPageData.items]);

  const anomalyRows = useMemo(() => {
    return anomPageData.items.map((a) => [
      kindLabel(safeStr(a.kind)) || "—",
      // We don’t have county/center names in AnomalyEventDto yet; show centerId or placeholder.
      safeStr(a.centerId) ? safeStr(a.centerId).slice(0, 8) + "…" : "—",
      safeStr(a.details?.message) || safeStr(a.details?.reason) || "—",
      fmtDate(a.dateCreated),
      "anomaly_event",
    ]);
  }, [anomPageData.items]);

  return (
    <div className="flex flex-col gap-3">
      {/* Top actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {canEdit ? <Badge text="Editable (NEC/SYSTEM)" /> : <Badge text="Read-only" />}
          {!orgId ? <Badge text="Missing orgId in session" /> : null}
        </div>

        <div className="flex items-center gap-2">
          {canEdit ? (
            <button
              type="button"
              onClick={() => reconcileM.mutate()}
              disabled={reconcileM.isPending || !orgId}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold hover:bg-slate-50 disabled:opacity-50"
              title="Recompute discrepancies from views"
            >
              Reconcile
            </button>
          ) : null}

          <button
            type="button"
            onClick={refreshAll}
            disabled={discQ.isFetching || anomQy.isFetching}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-blue-100 px-3 py-2 text-sm font-bold hover:bg-slate-50 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      <Panel
        title="Discrepancies"
        right={
          <div className="flex items-center gap-2">
            <select
              value={discStatus}
              onChange={(e) => {
                setDiscStatus(e.target.value as any);
                setDiscPage(0);
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold outline-none"
              title="Filter by status"
            >
              <option value="">All</option>
              <option value="OPEN">OPEN</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          </div>
        }
      >
        {discQ.isError ? (
          <div className="mb-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {(discQ.error as any)?.message ?? "Failed to load discrepancies."}
          </div>
        ) : null}

        <SimpleTable
          columns={["Status", "County", "Center", "Deltas", "Noted At", "Source"]}
          rows={
            discrepancyRows.length
              ? discrepancyRows
              : [
                  [
                    <span key="empty" className="text-slate-500">
                      {discQ.isLoading ? "Loading…" : "No discrepancies found."}
                    </span>,
                    "",
                    "",
                    "",
                    "",
                    "",
                  ],
                ]
          }
        />

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="text-sm text-slate-500">
            Page <b>{discPage + 1}</b> of <b>{discPageData.totalPages}</b>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={discPage <= 0}
              onClick={() => setDiscPage((p) => Math.max(0, p - 1))}
              className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
                discPage <= 0 ? "opacity-50" : ""
              }`}
            >
              Prev
            </button>
            <button
              type="button"
              disabled={discPage >= discPageData.totalPages - 1}
              onClick={() => setDiscPage((p) => p + 1)}
              className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
                discPage >= discPageData.totalPages - 1 ? "opacity-50" : ""
              }`}
            >
              Next
            </button>
          </div>
        </div>

        <div className="mt-3">
          <PlaceholderNote
            title="Later behavior"
            bullets={[
              "Click row opens discrepancy detail drawer and linked compare lens.",
              "Resolution workflow: assign → investigate → resolve with audit trail.",
              "Reconcile button recomputes OPEN discrepancies for the selected election + org.",
            ]}
          />
        </div>
      </Panel>

      <Panel
        title="Anomaly Events"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={anomKind}
              onChange={(e) => {
                setAnomKind(e.target.value as any);
                setAnomPage(0);
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold outline-none"
              title="Filter by kind"
            >
              <option value="">All Kinds</option>
              <option value="VOTES_EXCEED_BALLOTS_ISSUED">Votes exceed ballots issued</option>
              <option value="VOTES_EXCEED_ALLOCATION">Votes exceed allocation</option>
              <option value="LATE_REPORTING_CENTER">Late reporting center</option>
              <option value="OTHER">Other</option>
            </select>

            <input
              value={anomQ}
              onChange={(e) => {
                setAnomQ(e.target.value);
                setAnomPage(0);
              }}
              placeholder="Search…"
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold outline-none"
            />
          </div>
        }
      >
        {anomQy.isError ? (
          <div className="mb-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {(anomQy.error as any)?.message ?? "Failed to load anomaly events."}
          </div>
        ) : null}

        <SimpleTable
          columns={["Kind", "Center", "Signal", "Date Created", "Source"]}
          rows={
            anomalyRows.length
              ? anomalyRows
              : [
                  [
                    <span key="empty" className="text-slate-500">
                      {anomQy.isLoading ? "Loading…" : "No anomaly events found."}
                    </span>,
                    "",
                    "",
                    "",
                    "",
                  ],
                ]
          }
        />

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="text-sm text-slate-500">
            Page <b>{anomPage + 1}</b> of <b>{anomPageData.totalPages}</b>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={anomPage <= 0}
              onClick={() => setAnomPage((p) => Math.max(0, p - 1))}
              className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
                anomPage <= 0 ? "opacity-50" : ""
              }`}
            >
              Prev
            </button>
            <button
              type="button"
              disabled={anomPage >= anomPageData.totalPages - 1}
              onClick={() => setAnomPage((p) => p + 1)}
              className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
                anomPage >= anomPageData.totalPages - 1 ? "opacity-50" : ""
              }`}
            >
              Next
            </button>
          </div>
        </div>

        <div className="mt-3">
          <PlaceholderNote
            title="Later behavior"
            bullets={[
              "Anomalies may be system-generated (rules) or manual flags.",
              "Links to submissions and allocation context for triage.",
              "Details JSON can be surfaced in a drawer (raw JSON viewer) and linked center drilldown.",
            ]}
          />
        </div>
      </Panel>
    </div>
  );
}