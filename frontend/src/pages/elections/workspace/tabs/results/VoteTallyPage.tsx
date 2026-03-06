

// ✅ FILE: src/pages/elections/workspace/tabs/results/VoteTallyPage.tsx

import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../../../../../auth/useAuth";
import { useAuthStore } from "../../../../../shared/store/authStore";
import { Panel, Badge, SimpleTable, PlaceholderNote } from "../../../shared/elections-ui";

import {
  searchVoteTallies,
  type VoteTallyDto,
} from "../../../../../shared/services/voteTallyService";

import { listContestsByElection } from "../../../../../shared/services/contestService";
import type { ContestDto } from "../../../../../auth/contestTypes";

/** ✅ ResultsTab passes this when nested under Results workspace */
type ResultsOutletCtx = { orgId?: string };

function fmtTime(s?: string | null) {
  if (!s) return "—";
  return String(s).replace("T", " ");
}

function partyLabel(r: VoteTallyDto) {
  // ✅ Party null -> INDEPENDENT
  if (!r.partyName) return "INDEPENDENT";
  return r.abbreviation ? `${r.partyName} (${r.abbreviation})` : r.partyName;
}

export default function VoteTallyPage() {
  const { electionId } = useParams();

  // ✅ if this page is nested under ResultsTab, we receive orgId here
  const outlet = useOutletContext<ResultsOutletCtx>();
  const outletOrgId = String(outlet?.orgId ?? "").trim();

  const auth: any = useAuth();

  // ✅ match SubmissionsTab source of truth
  const dashboardModeStore = useAuthStore((s: any) => s.dashboardMode);
  const mode = String((dashboardModeStore ?? auth?.dashboardMode ?? "") as any).toUpperCase(); // NEC | TENANT | SYSTEM

  // ✅ store org scope (reactive)
  const storeOrgId = String(useAuthStore((s: any) => s.currentOrgId ?? "") ?? "").trim();

  // ✅ fallback org sources (non-reactive but safe)
  const fallbackOrgId = String(
    useAuthStore.getState().tenantMeta?.orgId ?? auth?.tenant?.orgId ?? ""
  ).trim();

  // ✅ effective org scope:
  const orgId = outletOrgId || storeOrgId || fallbackOrgId || "";

  const [page, setPage] = useState(0);
  const size = 25;

  /** ---------------- Contests (filter) ---------------- */
  const contestsQ = useQuery<ContestDto[]>({
    enabled: Boolean(electionId),
    queryKey: ["election-contests", electionId],
    queryFn: () => listContestsByElection(electionId as string),
    staleTime: 60_000,
    retry: 1,
  });

  const contests = contestsQ.data ?? [];
  const [contestId, setContestId] = useState<string>("");

  // ✅ reset paging when scope changes (org/election/contest)
  useEffect(() => {
    setPage(0);
  }, [orgId, electionId, contestId]);

  /** ---------------- Vote tallies ---------------- */
  const q = useQuery({
    queryKey: ["vote-tally", "search", orgId, electionId, contestId, page, size],
    enabled: Boolean(orgId) && Boolean(electionId),
    queryFn: () =>
      searchVoteTallies({
        orgId,
        electionId: electionId as string,
        contestId: contestId || undefined, // ✅ NEW
        page,
        size,
      } as any),
    staleTime: 10_000,
    retry: 1,
  });

  const rows = useMemo(() => {
    const items = (q.data?.items ?? []) as VoteTallyDto[];

    // ✅ Column order you requested:
    // electionName, orgName, contest, candidate, Party, votes, recomputedByUserId(user name), lastRecomputed, updated
    return items.map((r) => [
      r.electionName ?? "—",
      r.orgName ?? "—",
      r.contestName ?? "—",
      r.fullName ?? "—",
      partyLabel(r),
      r.voteCount ?? 0,
      r.recomputedByUserName ?? "—",
      fmtTime(r.lastRecomputedAt),
      fmtTime(r.lastUpdated),
    ]);
  }, [q.data]);

  if (!orgId) {
    return (
      <Panel title="Vote Tally" right={<Badge text={mode || "—"} />}>
        <PlaceholderNote
          title="Missing tenant scope (orgId)"
          bullets={[
            "vote_tally is tenant-scoped, so orgId is required to query results.",
            "TENANT/NEC should set currentOrgId at login (or tenantMeta).",
            "SYSTEM must select an organization from the dropdown.",
          ]}
        />
      </Panel>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel
        title="Vote Tally (Verified)"
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* ✅ Contest filter */}
            <select
              value={contestId}
              onChange={(e) => setContestId(e.target.value)}
              disabled={!electionId || contestsQ.isLoading}
              className="px-2.5 py-1.5 rounded-md border bg-white text-base disabled:bg-slate-50"
              title="Filter by contest"
            >
              <option value="">
                {contestsQ.isLoading ? "Loading contests…" : "All contests"}
              </option>
              {contests.map((c) => (
                <option key={(c as any).contestId} value={(c as any).contestId}>
                  {(c as any).contestName ?? "—"}
                </option>
              ))}
            </select>

            <Badge text={mode || "—"} />
            <Badge text={q.isFetching ? "Loading…" : `Rows: ${q.data?.items?.length ?? 0}`} />
            <Badge text={`Page: ${(q.data?.page ?? page) + 1} / ${q.data?.totalPages ?? "?"}`} />
          </div>
        }
      >
        {q.isError ? (
          <div style={{ color: "#b91c1c", fontSize: 13 }}>
            {(q.error as any)?.message ?? "Failed to load vote tallies."}
          </div>
        ) : null}

        <SimpleTable
          columns={[
            "Election",
            "Organization",
            "Contest",
            "Candidate",
            "Party",
            "Votes",
            "Recomputed By",
            "Last Recomputed",
            "Updated",
          ]}
          rows={rows as any}
        />

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page <= 0 || q.isFetching}
            style={btn()}
          >
            Prev
          </button>

          <button
            type="button"
            onClick={() => setPage((p) => (q.data && p + 1 < q.data.totalPages ? p + 1 : p))}
            disabled={!q.data || q.isFetching || page + 1 >= (q.data?.totalPages ?? 0)}
            style={btn()}
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


