// src/pages/operations/OperationWorkspaceDashboard.tsx

import { useMemo } from "react";

import { Link } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import { Network } from "lucide-react";

import { useAuthStore } from "../../shared/store/authStore";

import { useOperationalContext } from "../../shared/hooks/useOperationalContext";

import {
  listActiveElections,
  type ElectionDto,
} from "../../shared/services/electionService";

// ============================================================================
// TYPES
// ============================================================================

type WorkspaceLink = {
  label: string;

  description: string;

  to: string;
};

type WorkspaceSection = {
  title: string;

  description: string;

  links: WorkspaceLink[];
};

// ============================================================================
// ELECTION STORE
// ============================================================================

function setCurrentElectionId(electionId: string) {
  const normalized = String(electionId ?? "").trim();

  if (!normalized) {
    return;
  }

  const state: any = useAuthStore.getState?.() ?? {};

  const setter =
    state.setCurrentElectionId ??
    state.setElectionId ??
    state.setCurrentElection ??
    state.setElection ??
    null;

  if (typeof setter === "function") {
    setter(normalized);

    return;
  }

  const store: any = useAuthStore as any;

  if (typeof store.setState === "function") {
    store.setState({
      currentElectionId: normalized,

      electionId: normalized,
    });
  }
}

// ============================================================================
// RESOURCE CARD
// ============================================================================

function ResourceCard({ item }: { item: WorkspaceLink }) {
  return (
    <Link
      to={item.to}
      className="
        block
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-4
        shadow-sm
        transition

        hover:border-indigo-300
        hover:bg-indigo-50/40
        hover:shadow-md
      "
    >
      <div className="text-base font-extrabold text-slate-900">
        {item.label}
      </div>

      <div className="mt-1 text-sm leading-5 text-slate-600">
        {item.description}
      </div>
    </Link>
  );
}

// ============================================================================
// WORKSPACE SECTION
// ============================================================================

function WorkspaceSectionCard({ section }: { section: WorkspaceSection }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900">
          {section.title}
        </h2>

        <p className="mt-1 text-sm text-slate-600">{section.description}</p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {section.links.map((item) => (
          <ResourceCard key={item.to} item={item} />
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================
//
// IMPORTANT:
//
// This component receives NO authorization/access prop.
//
// Operations context comes from:
//
// useOperationalContext()
//
// That hook is the single frontend source for:
//
// - current election
// - operational access
// - effective scope
//
// Individual backend resource endpoints remain authoritative for actual
// record/action authorization.
//
// ============================================================================

export default function OperationWorkspaceDashboard() {
  // ==========================================================================
  // STORE
  // ==========================================================================

  const currentElectionId = useAuthStore(
    (state: any) => state.currentElectionId,
  );

  const dashboardMode = useAuthStore((state: any) => state.dashboardMode);

  // ==========================================================================
  // OPERATIONAL CONTEXT
  // ==========================================================================

  const {
    scopeType,
    operationalAccess,
    loading: operationalAccessLoading,
    error: operationalAccessError,
  } = useOperationalContext(true);

  // ==========================================================================
  // ACTIVE ELECTIONS
  // ==========================================================================

  const electionsQuery = useQuery<ElectionDto[]>({
    queryKey: ["operations", "workspace", "active-elections"],

    queryFn: listActiveElections,

    staleTime: 30_000,

    refetchOnWindowFocus: false,

    retry: 1,
  });

  const elections = electionsQuery.data ?? [];

  const currentElection =
    elections.find(
      (election) =>
        String(election.electionId) === String(currentElectionId ?? ""),
    ) ?? null;

  // ==========================================================================
  // RESULT ROUTES
  // ==========================================================================
  //
  // Keep result navigation inside /operations.
  //
  // No electionId is added to the Operations URL.
  //
  // ==========================================================================

  const normalizedMode = String(dashboardMode ?? "")
    .trim()
    .toUpperCase();

  const candidateResultRoute =
    normalizedMode === "NEC"
      ? "/operations/results/official/candidates/counties"
      : "/operations/results/local/candidates/counties";

  const geographicResultRoute =
    normalizedMode === "NEC"
      ? "/operations/results/official/geo"
      : "/operations/results/local/totals/counties";

  // ==========================================================================
  // WORKSPACE SECTIONS
  // ==========================================================================
  //
  // Do NOT recreate frontend resource-permission matrices here.
  //
  // These cards describe the Operations workspace.
  //
  // Actual backend APIs determine whether data/actions are available for the
  // current user's role, assignment, scope, ownership and workflow state.
  //
  // ==========================================================================

  const sections = useMemo<WorkspaceSection[]>(
    () => [
      // ====================================================================
      // GEOGRAPHY
      // ====================================================================

      {
        title: "Geography",

        description:
          "Read-only geography within the current operational election context.",

        links: [
          {
            label: "Districts",

            description:
              "View districts available through your authorized operational scope.",

            to: "/operations/geography/districts",
          },

          {
            label: "Polling Centers",

            description:
              "View polling centers available through your authorized operational scope.",

            to: "/operations/geography/polling-centers",
          },

          {
            label: "Polling Places",

            description:
              "View polling places available through your authorized operational scope.",

            to: "/operations/geography/polling-places",
          },
        ],
      },

      // ====================================================================
      // PERSONNEL
      // ====================================================================

      {
        title: "Personnel",

        description:
          "Read-only operational personnel associated with the current election context.",

        links: [
          {
            label: "Operational Team",

            description: "View authorized operational users and team members.",

            to: "/operations/personnel",
          },
        ],
      },

      // ====================================================================
      // ELECTION REFERENCE
      // ====================================================================

      {
        title: "Election Reference",

        description:
          "Read-only election reference information required for Operations.",

        links: [
          {
            label: "Center Allocations",

            description: "View polling-center allocation information.",

            to: "/operations/reference/allocation/centers",
          },

          {
            label: "Place Allocations",

            description: "View polling-place allocation information.",

            to: "/operations/reference/allocation/places",
          },

          {
            label: "Contests",

            description: "View contests configured for the selected election.",

            to: "/operations/reference/contests",
          },

          {
            label: "Candidates",

            description:
              "View candidates participating in the selected election.",

            to: "/operations/reference/candidates",
          },

          {
            label: "Parties",

            description: "View parties participating in the selected election.",

            to: "/operations/reference/parties",
          },
        ],
      },

      // ====================================================================
      // ELECTION OPERATIONS
      // ====================================================================

      {
        title: "Election Operations",

        description:
          "Operational workflows and supporting election-day records.",

        links: [
          {
            label: "Submissions",

            description:
              "View and perform submission actions authorized by the backend.",

            to: "/operations/submissions",
          },

          {
            label: "Observer Reports",

            description:
              "Create, view, review or manage incidents where authorized.",

            to: "/operations/observer-reports",
          },

          {
            label: "Notifications",

            description:
              "View notifications belonging to the authenticated user.",

            to: "/operations/notifications",
          },

          {
            label: "Tally Sheets",

            description:
              "View tally-sheet evidence available through authorized records.",

            to: "/operations/tally-sheets",
          },

          {
            label: "Submission Actions",

            description: "View authorized submission action history.",

            to: "/operations/submission-actions",
          },

          {
            label: "Discrepancies",

            description:
              "View discrepancies available within the authorized election scope.",

            to: "/operations/discrepancies",
          },
        ],
      },

      // ====================================================================
      // RESULTS
      // ====================================================================

      {
        title: "Results",

        description:
          "Read-only result views subject to backend scope and aggregate-safety rules.",

        links: [
          {
            label: "Vote Tallies",

            description: "View authorized vote-tally information.",

            to: "/operations/results/tally",
          },

          {
            label: "Candidate Results",

            description:
              "View candidate result aggregates available through the current context.",

            to: candidateResultRoute,
          },

          {
            label: "Geographic Results",

            description: "View authorized geographic result aggregates.",

            to: geographicResultRoute,
          },
        ],
      },

      // ====================================================================
      // REPORTS
      // ====================================================================

      {
        title: "Reports",

        description:
          "View or create reports according to backend report authorization.",

        links: [
          {
            label: "Report Snapshots",

            description:
              "View report snapshots and create scoped reports where authorized.",

            to: "/operations/reports/requests",
          },

          {
            label: "Report Files",

            description:
              "View generated files belonging to authorized report snapshots.",

            to: "/operations/reports/files",
          },
        ],
      },
    ],
    [candidateResultRoute, geographicResultRoute],
  );

  // ==========================================================================
  // ELECTION CHANGE
  // ==========================================================================

  function handleElectionChange(value: string) {
    const electionId = String(value ?? "").trim();

    if (!electionId) {
      return;
    }

    setCurrentElectionId(electionId);
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* ==================================================================
          HEADER
      ================================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Network className="text-indigo-700" size={24} />

              <h1 className="text-2xl font-extrabold text-slate-900">
                Operations Workspace
              </h1>
            </div>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Role determines what you may do. Election assignment and effective
              scope determine where operational authority applies.
            </p>
          </div>

          {/* ================================================================
              ELECTION SELECTOR
          ================================================================ */}

          <div className="min-w-[280px]">
            <label className="block text-sm font-bold text-slate-700">
              Election
            </label>

            <select
              value={String(currentElectionId ?? "")}
              onChange={(event) => handleElectionChange(event.target.value)}
              disabled={electionsQuery.isLoading}
              className="
                mt-1
                h-11
                w-full
                rounded-xl
                border
                border-slate-200
                bg-white
                px-3
                text-sm
                font-semibold
                text-slate-900

                disabled:bg-slate-100
                disabled:text-slate-500
              "
            >
              <option value="">
                {electionsQuery.isLoading
                  ? "Loading elections..."
                  : "Select election"}
              </option>

              {elections.map((election) => (
                <option key={election.electionId} value={election.electionId}>
                  {election.electionName} ({election.year})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ================================================================
            CONTEXT BADGES
        ================================================================ */}

        {currentElection ? (
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-bold text-slate-800">
              {currentElection.electionName}
            </span>

            {scopeType ? (
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 font-bold text-indigo-800">
                Scope: {scopeType.replaceAll("_", " ")}
              </span>
            ) : null}

            {operationalAccess ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-bold text-emerald-800">
                Operations Active
              </span>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* ==================================================================
          ELECTION QUERY ERROR
      ================================================================== */}

      {electionsQuery.error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="font-extrabold text-red-900">
            Unable to load elections
          </div>

          <p className="mt-1 text-sm text-red-800">
            {electionsQuery.error instanceof Error
              ? electionsQuery.error.message
              : "The active election list could not be loaded."}
          </p>
        </section>
      ) : null}

      {/* ==================================================================
          NO ELECTION
      ================================================================== */}

      {!currentElectionId ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="font-extrabold text-amber-900">
            Select an election
          </div>

          <p className="mt-1 text-sm text-amber-800">
            Select an election to establish the Operations data context.
          </p>
        </section>
      ) : null}

      {/* ==================================================================
          ACCESS LOADING
      ================================================================== */}

      {currentElectionId && operationalAccessLoading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="font-semibold text-slate-600">
            Resolving Operations access...
          </div>
        </section>
      ) : null}

      {/* ==================================================================
          ACCESS ERROR
      ================================================================== */}

      {currentElectionId &&
      !operationalAccessLoading &&
      operationalAccessError ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="font-extrabold text-red-900">
            Unable to resolve Operations access
          </div>

          <p className="mt-1 text-sm text-red-800">
            {operationalAccessError instanceof Error
              ? operationalAccessError.message
              : "The Operations context could not be loaded."}
          </p>
        </section>
      ) : null}

      {/* ==================================================================
          NO OPERATIONAL ACCESS
      ================================================================== */}

      {currentElectionId &&
      !operationalAccessLoading &&
      !operationalAccessError &&
      !operationalAccess ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="font-extrabold text-red-900">
            Operations unavailable
          </div>

          <p className="mt-1 text-sm text-red-800">
            You do not have Operations access for the selected election.
          </p>
        </section>
      ) : null}

      {/* ==================================================================
          WORKSPACE
      ================================================================== */}

      {currentElectionId &&
      !operationalAccessLoading &&
      !operationalAccessError &&
      operationalAccess
        ? sections.map((section) => (
            <WorkspaceSectionCard key={section.title} section={section} />
          ))
        : null}
    </div>
  );
}
