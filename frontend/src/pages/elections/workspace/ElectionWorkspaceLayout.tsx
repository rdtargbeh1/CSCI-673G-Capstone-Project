// src/pages/elections/workspace/layout/ElectionWorkspaceLayout.tsx
/**
 * ELECTION WORKSPACE LAYOUT
 *
 * - Real election header from backend: GET /api/elections/{id}
 * - Switch Election popover: dropdown defaults to CURRENT election (no placeholder)
 * - Dropdown lists ACTIVE elections + ensures CURRENT election appears (even if inactive)
 * - Refresh button refetches header + active list
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
import { Badge, TabsBar, WorkspaceHeader } from "../shared/elections-ui";

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

  const tabs = [
    { to: "overview", label: "Overview" },
    { to: "setup", label: "Setup" },
    { to: "allocation", label: "Allocation" },
    { to: "submissions", label: "Submissions" },
    { to: "results", label: "Results" },
    { to: "integrity", label: "Integrity" },
    { to: "nec-workflow", label: "NEC Workflow", hidden: !isNecOrSystem },
  ];

  const refreshAll = async () => {
    await Promise.allSettled([electionQ.refetch(), activeElectionsQ.refetch()]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {/* Back */}
            <button
              type="button"
              onClick={() => nav("/elections")}
              title="Back to Elections list"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "#fff",
              }}
            >
              <ArrowLeft size={16} />
              Back
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={refreshAll}
              title="Refresh election header and active elections"
              disabled={electionQ.isFetching || activeElectionsQ.isFetching}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "#fff",
                opacity:
                  electionQ.isFetching || activeElectionsQ.isFetching ? 0.6 : 1,
                cursor:
                  electionQ.isFetching || activeElectionsQ.isFetching
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            {/* Status badge with dot */}
            {election ? (
              <span
                title={
                  election.isActive ? "Active election" : "Inactive election"
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid #e5e7eb",
                  borderRadius: 999,
                  padding: "2px 8px",
                  background: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                }}
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
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                }}
              >
                <Repeat2 size={16} />
                Switch Election
              </button>

              {switchOpen ? (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    width: 420,
                    maxWidth: "80vw",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    background: "#fff",
                    padding: 10,
                    boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
                    zIndex: 50,
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 13 }}>
                    Switch election
                  </div>

                  <div style={{ marginTop: 8 }}>
                    {activeElectionsQ.isLoading && !switchOptions.length ? (
                      <div style={{ fontSize: 13, opacity: 0.75 }}>
                        Loading elections…
                      </div>
                    ) : activeElectionsQ.isError && !switchOptions.length ? (
                      <div style={{ fontSize: 13, color: "#b91c1c" }}>
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
                        style={{
                          width: "100%",
                          padding: "10px 10px",
                          borderRadius: 10,
                          border: "1px solid #e5e7eb",
                          background: "#fff",
                          fontSize: 13,
                          fontWeight: 700,
                        }}
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

                  <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                    Active elections are available for quick switching. Current
                    election is shown even if inactive.
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        }
      />

      <TabsBar tabs={tabs} />

      <div style={{ marginTop: 4 }}>
        {electionQ.isError ? (
          <div style={{ color: "#b91c1c", fontSize: 13 }}>
            {(electionQ.error as any)?.message ??
              "Failed to load election header."}
          </div>
        ) : null}

        <Outlet />
      </div>
    </div>
  );
}
