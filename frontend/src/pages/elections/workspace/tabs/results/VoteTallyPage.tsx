// src/pages/elections/workspace/tabs/results/VoteTallyPage.tsx

import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../../../../../auth/useAuth";
import { useAuthStore } from "../../../../../shared/store/authStore";
import {
  Panel,
  Badge,
  SimpleTable,
  PlaceholderNote,
} from "../../../shared/elections-ui";

import {
  searchVoteTallies,
  type VoteTallyDto,
} from "../../../../../shared/services/voteTallyService";

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
  const auth: any = useAuth();

  const mode = String(auth?.dashboardMode ?? "").toUpperCase(); // NEC | TENANT | SYSTEM

  // ✅ vote_tally is tenant scoped => orgId REQUIRED
  const orgId =
    useAuthStore((s) => s.currentOrgId) ||
    useAuthStore.getState().tenantMeta?.orgId ||
    auth?.tenant?.orgId ||
    "";

  const [page, setPage] = useState(0);
  const size = 25;

  const q = useQuery({
    queryKey: ["vote-tally", "search", orgId, electionId, page, size],
    enabled: !!orgId && !!electionId,
    queryFn: () =>
      searchVoteTallies({
        orgId,
        electionId: electionId as string,
        page,
        size,
      }),
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
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Badge text={mode || "—"} />
            <Badge
              text={q.isFetching ? "Loading…" : `Rows: ${q.data?.items?.length ?? 0}`}
            />
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
            onClick={() =>
              setPage((p) =>
                q.data && p + 1 < q.data.totalPages ? p + 1 : p
              )
            }
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
