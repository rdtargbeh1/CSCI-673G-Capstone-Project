// ✅ FILE: src/pages/elections/workspace/tabs/results/CandidateCountyStatsParty.tsx
//
// ✅ FIXES
// 1) ElectionId is now sourced reliably (same pattern as SubmissionsTab) by loading active elections,
//    and default-selecting the latest if none selected.
// 2) orgId is ALWAYS sent as a query param (because SecurityUtils.getOrgIdFromContext() is not deriving it).
// 3) sort params are sent as repeated "sort=" (NOT sort[]), matching your controller signature.
//
// NOTE: No backend logic changed.

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "../../../../../shared/store/authStore";
import { Panel, Badge, SimpleTable } from "../../../shared/elections-ui";
import { TrustSourceTag } from "../../../../dashboard/shared/dashboard-ui";

import {
  listActiveElections,
  type ElectionDto,
} from "../../../../../shared/services/electionService";

import {
  fetchOrganizations,
  type Organization,
} from "../../../../../shared/services/organizationService";

import {
  fetchCandidateCountyStatsParty,
  type CandidateCountyStatsPartyDto,
  type SpringPage,
} from "../../../../../shared/services/stats/candidateCountyStatsPartyService";

/** ---------------- helpers ---------------- */
function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function friendlyError(err: any): string {
  return (
    safeStr(err?.response?.data?.message) ||
    safeStr(err?.response?.data?.error) ||
    safeStr(err?.message) ||
    "Request failed."
  );
}
function fmtNum(v: any) {
  const n = Number(v);
  if (!isFinite(n)) return "—";
  return String(n);
}
function fmtPct(v: any) {
  const n = Number(v);
  if (!isFinite(n)) return "—";
  return `${n.toFixed(2)}%`;
}

/** SYSTEM dropdown type */
type OrgDto = { orgId: string; orgName: string };

export default function CandidateCountyStatsParty() {
  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const currentOrgId = useAuthStore((s) => s.currentOrgId);

  /** ---------------- Elections (reliable source of electionId) ---------------- */
  const electionsQ = useQuery<ElectionDto[]>({
    queryKey: ["elections", "active"],
    queryFn: () => listActiveElections(),
    staleTime: 60_000,
    retry: 1,
  });
  const elections = electionsQ.data ?? [];

  const [electionId, setElectionId] = useState<string>("");

  useEffect(() => {
    if (!electionId && elections.length) {
      const sorted = [...elections].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
      setElectionId(sorted[0].electionId);
    }
  }, [elections, electionId]);

  /** ---------------- SYSTEM: tenant selection ---------------- */
  const [systemSelectedOrgId, setSystemSelectedOrgId] = useState<string>("");

  const orgsQ = useQuery<OrgDto[]>({
    enabled: dashboardMode === "SYSTEM",
    queryKey: ["orgs", "tenant-list"],
    queryFn: async () => {
      const res = await fetchOrganizations({
        page: 0,
        size: 500,
        active: true,
        orgType: undefined,
        orgId: undefined,
        search: undefined,
      });

      return (res.items ?? []).map((o: Organization) => ({
        orgId: o.orgId,
        orgName: o.orgName,
      }));
    },
    staleTime: 60_000,
    retry: 1,
  });

  const orgs = orgsQ.data ?? [];

  /** ✅ effectiveOrgId MUST be present, because backend is not deriving it from header */
  const effectiveOrgId =
    dashboardMode === "SYSTEM"
      ? (systemSelectedOrgId || "")
      : (currentOrgId || "");

  /** ---------------- Filters + paging ---------------- */
  const [countyId, setCountyId] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [partyId, setPartyId] = useState("");

  const [page, setPage] = useState(0);
  const size = 50;

  useEffect(() => {
    setPage(0);
  }, [effectiveOrgId, electionId, countyId, candidateId, partyId]);

  /** ✅ enable only when both electionId and orgId exist */
  const enabled = Boolean(electionId) && Boolean(effectiveOrgId);

  const statsQ = useQuery<SpringPage<CandidateCountyStatsPartyDto>>({
    enabled,
    queryKey: [
      "candidateCountyStatsParty",
      effectiveOrgId,
      electionId,
      countyId,
      candidateId,
      partyId,
      page,
      size,
    ],
    queryFn: () =>
      fetchCandidateCountyStatsParty({
        orgId: effectiveOrgId, // ✅ ALWAYS send
        electionId,
        countyId: countyId || undefined,
        candidateId: candidateId || undefined,
        partyId: partyId || undefined,
        page,
        size,
        sort: ["candidateVotes,desc", "countyName,asc"],
      }),
    staleTime: 15_000,
    retry: 1,
  });

  const items = statsQ.data?.content ?? [];
  const totalPages = statsQ.data?.totalPages ?? 1;

  const rows = useMemo(() => {
    return items.map((r) => [
      r.countyName ?? "—",
      r.candidateName ?? "—",
      r.partyName
        ? `${r.partyName}${r.abbreviation ? ` (${r.abbreviation})` : ""}`
        : "—",
      fmtNum(r.candidateVotes),
      fmtPct(r.voteSharePct),
      "v_candidate_county_stats_party",
    ]);
  }, [items]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel
        title="Party Results • Candidate County Stats"
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Badge text={dashboardMode} />
            <Badge text={`Rows: ${items.length}`} />
            <Badge text={`Page: ${page + 1} / ${Math.max(1, totalPages)}`} />
          </div>
        }
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <TrustSourceTag source="ORG" />
          <span style={{ fontSize: 12, opacity: 0.7 }}>
            Aggregated from tenant submissions views (v_*_party).
          </span>
        </div>

        {/* ✅ Required selectors row */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          {/* SYSTEM must pick tenant */}
          {dashboardMode === "SYSTEM" ? (
            <select
              value={systemSelectedOrgId}
              onChange={(e) => setSystemSelectedOrgId(e.target.value)}
              style={select()}
              title="Select tenant (organization)"
            >
              <option value="">-- Select tenant --</option>
              {orgs.map((o) => (
                <option key={o.orgId} value={o.orgId}>
                  {o.orgName}
                </option>
              ))}
            </select>
          ) : null}

          {/* Elections */}
          <select
            value={electionId}
            onChange={(e) => setElectionId(e.target.value)}
            style={select()}
            disabled={!elections.length}
            title="Election"
          >
            {!elections.length ? <option value="">Loading elections...</option> : null}
            {elections.map((el) => (
              <option key={el.electionId} value={el.electionId}>
                {el.electionName} ({el.year})
              </option>
            ))}
          </select>

          <button
            type="button"
            style={btn()}
            onClick={() => statsQ.refetch()}
            disabled={!enabled || statsQ.isFetching}
          >
            {statsQ.isFetching ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            style={btn()}
            onClick={() => {
              setCountyId("");
              setCandidateId("");
              setPartyId("");
              setPage(0);
            }}
          >
            Clear
          </button>
        </div>

        {/* Required warnings */}
        {!electionId ? (
          <div className="text-xs font-bold text-red-700 mb-2">
            ElectionId is required (UUID).
          </div>
        ) : null}

        {dashboardMode === "SYSTEM" && !effectiveOrgId ? (
          <div className="text-xs font-bold text-red-700 mb-2">
            Select a tenant (organization) to view results.
          </div>
        ) : null}

        {!effectiveOrgId && dashboardMode !== "SYSTEM" ? (
          <div className="text-xs font-bold text-red-700 mb-2">
            Missing currentOrgId in store. This endpoint requires orgId.
          </div>
        ) : null}

        {/* Optional filters */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <input
            value={countyId}
            onChange={(e) => setCountyId(e.target.value)}
            placeholder="countyId (optional)"
            style={input(220)}
          />
          <input
            value={candidateId}
            onChange={(e) => setCandidateId(e.target.value)}
            placeholder="candidateId (optional)"
            style={input(220)}
          />
          <input
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            placeholder="partyId (optional)"
            style={input(220)}
          />
        </div>

        {/* Error */}
        {statsQ.isError ? (
          <div className="p-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm font-bold">
            {friendlyError(statsQ.error)}
          </div>
        ) : null}

        {/* Table */}
        <SimpleTable
          columns={["County", "Candidate/Option", "Party", "Votes", "Vote Share", "Source"]}
          rows={rows as any}
        />

        {/* Empty state */}
        {!statsQ.isLoading && enabled && !items.length && !statsQ.isError ? (
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            No rows returned. Confirm the view has data for this org+election:
            <div style={{ marginTop: 6, fontFamily: "monospace", fontSize: 12 }}>
              SELECT * FROM v_candidate_county_stats_party WHERE org_id = '{effectiveOrgId}' AND election_id = '{electionId}' LIMIT 10;
            </div>
          </div>
        ) : null}

        {/* Pagination */}
        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            style={btn()}
            disabled={!enabled || page <= 0 || statsQ.isFetching}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Prev
          </button>

          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Page {page + 1} / {Math.max(1, totalPages)}
          </div>

          <button
            type="button"
            style={btn()}
            disabled={!enabled || statsQ.isFetching || page + 1 >= totalPages}
            onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
          >
            Next
          </button>
        </div>
      </Panel>
    </div>
  );
}

function btn() {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  } as const;
}

function input(minWidth: number) {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontWeight: 600,
    minWidth,
  } as const;
}

function select() {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontWeight: 700,
    minWidth: 260,
  } as const;
}
