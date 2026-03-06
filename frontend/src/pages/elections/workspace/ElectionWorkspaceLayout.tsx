// src/pages/elections/workspace/layout/ElectionWorkspaceLayout.tsx
/**
 * ELECTION WORKSPACE LAYOUT
 *
 * - Real election header from backend: GET /api/elections/{id}
 * - Switch Election popover: dropdown defaults to CURRENT election (no placeholder)
 * - Dropdown lists ACTIVE elections + ensures CURRENT election appears (even if inactive)
 * - Refresh button refetches header + active list
 *
 * ✅ UI UPDATES (like PartyResultsLayout):
 * - Tabs + Refresh on the same row
 * - Current tab indicator (dot + underline + active pill)
 * - Reduce nav container width (max-width) to avoid over-stretching
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Repeat2, RefreshCw } from "lucide-react";

import { useAuth } from "../../../auth/useAuth";
import { apiClient } from "../../../shared/lib/apiClient";
import {
  searchElections,
  type ElectionDto,
} from "../../../shared/services/electionService";
import { Badge, WorkspaceHeader } from "../shared/elections-ui";

/** ---------------- helpers ---------------- */
function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function swapElectionIdInPath(
  pathname: string,
  currentId: string,
  nextId: string
) {
  const from = `/elections/${currentId}`;
  const to = `/elections/${nextId}`;
  if (pathname.startsWith(from)) return pathname.replace(from, to);
  return `/elections/${nextId}/overview`;
}

function statusDot(active: boolean) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        display: "inline-block",
        background: active ? "#16a34a" : "#dc2626",
        boxShadow: "0 0 0 2px rgba(255,255,255,0.9)",
      }}
    />
  );
}

async function fetchElectionById(id: string): Promise<ElectionDto> {
  const { data } = await apiClient.get<ElectionDto>(`/elections/${id}`);
  return data;
}

/** ---------------- tab styles (active indicator) ---------------- */
function tabClass(active: boolean) {
  return [
    "relative inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-lg font-extrabold transition",
    active
      ? "border-indigo-200 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-100"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  ].join(" ");
}

function TabPill({ to, label }: { to: string; label: string }) {
  return (
    <NavItem to={to} label={label} />
  );
}

/**
 * NavLink wrapper that works without importing NavLink in many shared setups.
 * If you already use NavLink elsewhere, you can replace NavItem with NavLink directly.
 */
import { NavLink } from "react-router-dom";
function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => tabClass(isActive)}>
      {({ isActive }) => (
        <>
          <span
            className={[
              "h-2.5 w-2.5 rounded-full",
              isActive ? "bg-indigo-600" : "bg-slate-300",
            ].join(" ")}
          />
          <span>{label}</span>
          {isActive ? (
            <span className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-indigo-600" />
          ) : null}
        </>
      )}
    </NavLink>
  );
}

export default function ElectionWorkspaceLayout() {
  const { electionId } = useParams();
  const eid = safeStr(electionId);
  const nav = useNavigate();
  const loc = useLocation();

  
  const { dashboardMode } = useAuth();
  const isNecOrSystem = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  /** ---------------- Switch popover ---------------- */
  const [switchOpen, setSwitchOpen] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!switchOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!popRef.current) return;
      if (!popRef.current.contains(e.target as any)) setSwitchOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [switchOpen]);

  /** ---------------- Queries ---------------- */
  const electionQ = useQuery({
    queryKey: ["election", "by-id", eid],
    queryFn: () => fetchElectionById(eid),
    enabled: !!eid,
    staleTime: 15_000,
    retry: 1,
  });

  const activeElectionsQ = useQuery({
    queryKey: ["elections", "active-list"],
    queryFn: async () => {
      const res = await searchElections({
        page: 0,
        size: 200,
        q: undefined,
        year: undefined,
        type: undefined,
        active: true,
      });
      return res.items ?? [];
    },
    staleTime: 30_000,
    retry: 1,
  });

  const election = electionQ.data;

  /** Build switch options:
   * - ACTIVE elections from backend
   * - Ensure CURRENT election is included (even if inactive)
   * - Deduplicate by electionId
   */
  const switchOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();

    // current election first (if loaded)
    if (election?.electionId) {
      map.set(safeStr(election.electionId), {
        value: safeStr(election.electionId),
        label: `${safeStr(election.electionName)} • ${
          election.year
        } • ${safeStr(election.electionType)}${
          election.isActive ? "" : " • INACTIVE"
        }`,
      });
    }

    // active elections
    const items = (activeElectionsQ.data ?? []) as ElectionDto[];
    for (const e of items) {
      const id = safeStr(e.electionId);
      if (!id) continue;
      if (!map.has(id)) {
        map.set(id, {
          value: id,
          label: `${safeStr(e.electionName)} • ${e.year} • ${safeStr(
            e.electionType
          )}`,
        });
      }
    }

    return Array.from(map.values());
  }, [activeElectionsQ.data, election]);

  const tabs = useMemo(
    () =>
      [
        { to: "overview", label: "Overview", hidden: false },
        { to: "setup", label: "Setup", hidden: false },
        { to: "allocation", label: "Allocation", hidden: false },
        { to: "submissions", label: "Submissions", hidden: false },
        { to: "results", label: "Results", hidden: false },
        { to: "integrity", label: "Integrity", hidden: false },
        { to: "nec-workflow", label: "NEC Workflow", hidden: !isNecOrSystem },
      ].filter((t) => !t.hidden),
    [isNecOrSystem]
  );
console.log("DEBUG - Final tabs:", tabs.map(t => t.label));

  const refreshAll = async () => {
    await Promise.allSettled([electionQ.refetch(), activeElectionsQ.refetch()]);
  };

  return (
    <div className="flex flex-col gap-3">
      <WorkspaceHeader
        electionName={election ? safeStr(election.electionName) : "Election"}
        meta={
          election
            ? `Year: ${election.year} • Type: ${safeStr(
                election.electionType
              )} • Status: ${
                election.isActive ? "ACTIVE" : "INACTIVE"
              } • ElectionId: ${safeStr(election.electionId)}`
            : eid
            ? `ElectionId: ${eid}`
            : "No election selected"
        }
        right={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Back */}
            <button
              type="button"
              onClick={() => nav("/elections")}
              title="Back to Elections list"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xl font-extrabold hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              Back
            </button>

            {/* Status badge with dot */}
            {election ? (
              <span
                title={election.isActive ? "Active election" : "Inactive election"}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-800"
              >
                {statusDot(!!election.isActive)}
                {election.isActive ? "ACTIVE" : "INACTIVE"}
              </span>
            ) : (
              <Badge text="Loading…" />
            )}

            {/* Switch election */}
            <div ref={popRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setSwitchOpen((s) => !s)}
                title="Switch to another active election"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-lg font-extrabold hover:bg-slate-50"
              >
                <Repeat2 size={16} />
                Switch Election
              </button>

              {switchOpen ? (
                <div
                  className="absolute right-0 top-[calc(100%+8px)] z-50 w-[420px] max-w-[80vw] rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
                >
                  <div className="text-lg font-extrabold text-slate-900">
                    Switch election
                  </div>

                  <div className="mt-2">
                    {activeElectionsQ.isLoading && !switchOptions.length ? (
                      <div className="text-sm text-slate-600">
                        Loading elections…
                      </div>
                    ) : activeElectionsQ.isError && !switchOptions.length ? (
                      <div className="text-sm text-red-700">
                        {(activeElectionsQ.error as any)?.message ??
                          "Failed to load active elections."}
                      </div>
                    ) : (
                      <select
                        value={eid} // ✅ default to CURRENT election (no placeholder)
                        onChange={(e) => {
                          const nextId = e.target.value;
                          if (!nextId || nextId === eid) return;

                          const nextPath = swapElectionIdInPath(
                            loc.pathname,
                            eid,
                            nextId
                          );
                          nav(nextPath);
                          setSwitchOpen(false);
                        }}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                        title="Select an election (active list + current)"
                      >
                        {switchOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="mt-2 text-xl text-slate-500">
                    Active elections are available for quick switching. Current
                    election is shown even if inactive.
                  </div>
                </div>
              ) : null}
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={refreshAll}
              title="Refresh election header and active elections"
              disabled={electionQ.isFetching || activeElectionsQ.isFetching}
              className={[
                "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold",
                electionQ.isFetching || activeElectionsQ.isFetching
                  ? "cursor-not-allowed opacity-60"
                  : "hover:bg-slate-50",
              ].join(" ")}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        }
      />

      {/* ✅ Tabs row with indicator + reduced max width */}
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* nav container: reduced width so it doesn't stretch too wide */}
          <div className="flex max-w-[980px] flex-wrap items-center gap-2">
            {tabs.map((t) => (
              <TabPill key={t.to} to={t.to} label={t.label} />
            ))}
          </div>

          {/* right side mini status */}
          <div className="flex items-center gap-2">
            <Badge text={safeStr(dashboardMode || "—")} />
          </div>
        </div>
      </div>

      <div>
        {electionQ.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
            {(electionQ.error as any)?.message ??
              "Failed to load election header."}
          </div>
        ) : null}

        <Outlet />
      </div>
    </div>
  );
}
