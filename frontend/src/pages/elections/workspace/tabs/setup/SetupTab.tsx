// src/pages/elections/workspace/tabs/setup/SetupTab.tsx

import { useEffect, useMemo, useRef, useState } from "react";

import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { Badge, Panel } from "../../../shared/elections-ui";

import { useAuth } from "../../../../../auth/useAuth";

import type { SetupSubTab } from "./setup.types";

// ============================================================================
// ELECTION SETUP
// ============================================================================

import ElectionPartiesTab from "./election/ElectionPartiesTab";

import ElectionPartyAssignPage from "./election/ElectionPartyAssignPage";

import ElectionCandidatesTab from "./election/ElectionCandidatesTab";

import ElectionCandidateAssignPage from "./election/ElectionCandidateAssignPage";

import ContestsTab from "./election/ContestsTab";

import ContestFormPage from "./election/ContestFormPage";

import ContestOptionsPage from "./election/ContestOptionsPage";

import ContestOptionFormPage from "./election/ContestOptionFormPage";

// ============================================================================
// MASTER DATA
// ============================================================================

import PartiesMasterTab from "./masters/PartiesMasterTab";

import PartyMasterFormPage from "./masters/PartyMasterFormPage";

import CandidatesMasterTab from "./masters/CandidatesMasterTab";

import CandidateMasterFormPage from "./masters/CandidateMasterFormPage";

// ============================================================================
// SETUP INTERNAL ROUTES
// ============================================================================

type SetupRoute =
  | "MAIN"
  | "PARTIES"
  | "PARTY_ASSIGN"
  | "CANDIDATES"
  | "CANDIDATE_ASSIGN"
  | "CONTESTS"
  | "CONTEST_CREATE"
  | "CONTEST_EDIT"
  | "CONTEST_OPTIONS"
  | "CONTEST_OPTION_CREATE"
  | "CONTEST_OPTION_EDIT"
  | "MASTER_PARTIES"
  | "MASTER_PARTY_CREATE"
  | "MASTER_PARTY_EDIT"
  | "MASTER_CANDIDATES"
  | "MASTER_CANDIDATE_CREATE"
  | "MASTER_CANDIDATE_EDIT";

// ============================================================================
// NAV ITEM
// ============================================================================

type SetupNavigationItem = {
  key:
    | "ELECTION_PARTIES"
    | "ELECTION_CANDIDATES"
    | "CONTESTS"
    | "MASTER_PARTIES"
    | "MASTER_CANDIDATES";

  label: string;

  group: "ELECTION" | "MASTER";

  action: () => void;
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function SetupTab() {
  const { electionId } = useParams<{
    electionId: string;
  }>();

  const navigate = useNavigate();

  const location = useLocation();

  const { dashboardMode } = useAuth();

  const canEdit = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  // ==========================================================================
  // TAB STATE
  // ==========================================================================

  const [tab, setTab] = useState<SetupSubTab>("ELECTION_PARTIES");

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const mobileNavRef = useRef<HTMLDivElement | null>(null);

  // ==========================================================================
  // INTERNAL ROUTE
  // ==========================================================================

  const setupRoute = useMemo<SetupRoute>(() => {
    const pathname = location.pathname.replace(/\/+$/, "");

    // ====================================================================
    // PARTY ASSIGN
    // ====================================================================

    if (pathname.endsWith("/setup/parties/assign")) {
      return "PARTY_ASSIGN";
    }

    if (pathname.endsWith("/setup/parties")) {
      return "PARTIES";
    }

    // ====================================================================
    // CANDIDATE ASSIGN
    // ====================================================================

    if (pathname.endsWith("/setup/candidates/assign")) {
      return "CANDIDATE_ASSIGN";
    }

    if (pathname.endsWith("/setup/candidates")) {
      return "CANDIDATES";
    }

    // ====================================================================
    // CONTEST OPTION CREATE
    //
    // /setup/contests/{contestId}/options/new
    // ====================================================================

    if (/\/setup\/contests\/[^/]+\/options\/new$/.test(pathname)) {
      return "CONTEST_OPTION_CREATE";
    }

    // ====================================================================
    // CONTEST OPTION EDIT
    //
    // /setup/contests/{contestId}/options/{optionId}/edit
    // ====================================================================

    if (/\/setup\/contests\/[^/]+\/options\/[^/]+\/edit$/.test(pathname)) {
      return "CONTEST_OPTION_EDIT";
    }

    // ====================================================================
    // CONTEST OPTIONS LIST
    //
    // /setup/contests/{contestId}/options
    // ====================================================================

    if (/\/setup\/contests\/[^/]+\/options$/.test(pathname)) {
      return "CONTEST_OPTIONS";
    }

    // ====================================================================
    // CONTEST CREATE
    // ====================================================================

    if (pathname.endsWith("/setup/contests/new")) {
      return "CONTEST_CREATE";
    }

    // ====================================================================
    // CONTEST EDIT
    // ====================================================================

    if (/\/setup\/contests\/[^/]+\/edit$/.test(pathname)) {
      return "CONTEST_EDIT";
    }

    if (pathname.endsWith("/setup/contests")) {
      return "CONTESTS";
    }

    // ====================================================================
    // MASTER PARTY
    // ====================================================================

    if (pathname.endsWith("/setup/master-parties/new")) {
      return "MASTER_PARTY_CREATE";
    }

    if (/\/setup\/master-parties\/[^/]+\/edit$/.test(pathname)) {
      return "MASTER_PARTY_EDIT";
    }

    if (pathname.endsWith("/setup/master-parties")) {
      return "MASTER_PARTIES";
    }

    // ====================================================================
    // MASTER CANDIDATE
    // ====================================================================

    if (pathname.endsWith("/setup/master-candidates/new")) {
      return "MASTER_CANDIDATE_CREATE";
    }

    if (/\/setup\/master-candidates\/[^/]+\/edit$/.test(pathname)) {
      return "MASTER_CANDIDATE_EDIT";
    }

    if (pathname.endsWith("/setup/master-candidates")) {
      return "MASTER_CANDIDATES";
    }

    return "MAIN";
  }, [location.pathname]);

  // ==========================================================================
  // ROUTE -> TAB
  // ==========================================================================

  useEffect(() => {
    if (setupRoute === "PARTIES") {
      setTab("ELECTION_PARTIES");

      return;
    }

    if (setupRoute === "CANDIDATES") {
      setTab("ELECTION_CANDIDATES");

      return;
    }

    if (setupRoute === "CONTESTS") {
      setTab("CONTESTS");

      return;
    }

    if (setupRoute === "MASTER_PARTIES") {
      setTab("MASTER_PARTIES");

      return;
    }

    if (setupRoute === "MASTER_CANDIDATES") {
      setTab("MASTER_CANDIDATES");
    }
  }, [setupRoute]);

  // ==========================================================================
  // MOBILE NAV CLOSE
  // ==========================================================================

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }

    const handler = (event: MouseEvent) => {
      if (
        mobileNavRef.current &&
        !mobileNavRef.current.contains(event.target as Node)
      ) {
        setMobileNavOpen(false);
      }
    };

    window.addEventListener("mousedown", handler);

    return () => window.removeEventListener("mousedown", handler);
  }, [mobileNavOpen]);

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  const openElectionParties = () => {
    if (!electionId) {
      return;
    }

    setTab("ELECTION_PARTIES");

    navigate(`/elections/${electionId}/setup/parties`);
  };

  const openElectionCandidates = () => {
    if (!electionId) {
      return;
    }

    setTab("ELECTION_CANDIDATES");

    navigate(`/elections/${electionId}/setup/candidates`);
  };

  const openContests = () => {
    if (!electionId) {
      return;
    }

    setTab("CONTESTS");

    navigate(`/elections/${electionId}/setup/contests`);
  };

  const openMasterParties = () => {
    if (!electionId) {
      return;
    }

    setTab("MASTER_PARTIES");

    navigate(`/elections/${electionId}/setup/master-parties`);
  };

  const openMasterCandidates = () => {
    if (!electionId) {
      return;
    }

    setTab("MASTER_CANDIDATES");

    navigate(`/elections/${electionId}/setup/master-candidates`);
  };

  const openContestOptions = (contestId: string) => {
    if (!electionId) {
      return;
    }

    navigate(`/elections/${electionId}/setup/contests/${contestId}/options`);
  };

  // ==========================================================================
  // NAV OPTIONS
  // ==========================================================================

  const setupNavigation: SetupNavigationItem[] = [
    {
      key: "ELECTION_PARTIES",

      label: "E-Parties",

      group: "ELECTION",

      action: openElectionParties,
    },

    {
      key: "ELECTION_CANDIDATES",

      label: "E-Candidates",

      group: "ELECTION",

      action: openElectionCandidates,
    },

    {
      key: "CONTESTS",

      label: "Contests",

      group: "ELECTION",

      action: openContests,
    },

    {
      key: "MASTER_PARTIES",

      label: "Master Party",

      group: "MASTER",

      action: openMasterParties,
    },

    {
      key: "MASTER_CANDIDATES",

      label: "Master Candidate",

      group: "MASTER",

      action: openMasterCandidates,
    },
  ];

  const currentSetupLabel =
    setupNavigation.find((item) => item.key === tab)?.label ?? "Setup";

  const currentIsMaster =
    tab === "MASTER_PARTIES" || tab === "MASTER_CANDIDATES";

  // ==========================================================================
  // DEDICATED ROUTES
  // ==========================================================================

  if (setupRoute === "PARTY_ASSIGN") {
    return <ElectionPartyAssignPage />;
  }

  if (setupRoute === "CANDIDATE_ASSIGN") {
    return <ElectionCandidateAssignPage />;
  }

  // ==========================================================================
  // CONTEST OPTION CREATE / EDIT
  // ==========================================================================

  if (
    setupRoute === "CONTEST_OPTION_CREATE" ||
    setupRoute === "CONTEST_OPTION_EDIT"
  ) {
    return <ContestOptionFormPage />;
  }

  // ==========================================================================
  // CONTEST OPTIONS LIST
  // ==========================================================================

  if (setupRoute === "CONTEST_OPTIONS") {
    return <ContestOptionsPage />;
  }

  // ==========================================================================
  // CONTEST CREATE / EDIT
  // ==========================================================================

  if (setupRoute === "CONTEST_CREATE" || setupRoute === "CONTEST_EDIT") {
    return <ContestFormPage />;
  }

  // ==========================================================================
  // MASTER PARTY CREATE / EDIT
  // ==========================================================================

  if (
    setupRoute === "MASTER_PARTY_CREATE" ||
    setupRoute === "MASTER_PARTY_EDIT"
  ) {
    return <PartyMasterFormPage />;
  }

  // ==========================================================================
  // MASTER CANDIDATE CREATE / EDIT
  // ==========================================================================

  if (
    setupRoute === "MASTER_CANDIDATE_CREATE" ||
    setupRoute === "MASTER_CANDIDATE_EDIT"
  ) {
    return <CandidateMasterFormPage />;
  }

  // ==========================================================================
  // NORMAL SETUP WORKSPACE
  // ==========================================================================

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Panel
        title="Setup"
        right={
          <>
            {/* ================================================================
                MOBILE
            ================================================================ */}

            <div
              ref={mobileNavRef}
              className="
                relative
                -mt-[43px]
                ml-auto
                mb-1
                w-fit
                sm:hidden
              "
            >
              <button
                type="button"
                onClick={() => setMobileNavOpen((current) => !current)}
                className={[
                  `
                    inline-flex
                    min-h-8
                    max-w-[145px]
                    items-center
                    justify-between
                    gap-1.5
                    rounded-lg
                    border
                    px-2.5
                    py-1
                    text-[11px]
                    font-bold
                    shadow-sm
                  `,

                  currentIsMaster
                    ? `
                        border-violet-300
                        bg-violet-50
                        text-violet-700
                      `
                    : `
                        border-blue-300
                        bg-blue-50
                        text-blue-800
                      `,
                ].join(" ")}
              >
                <span className="truncate">{currentSetupLabel}</span>

                {mobileNavOpen ? (
                  <ChevronUp size={13} />
                ) : (
                  <ChevronDown size={13} />
                )}
              </button>

              {mobileNavOpen && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[210px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="px-3 pb-1 pt-2.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Election Setup
                  </div>

                  {setupNavigation
                    .filter((item) => item.group === "ELECTION")
                    .map((item) => (
                      <SetupMobileOption
                        key={item.key}
                        label={item.label}
                        active={tab === item.key}
                        master={false}
                        onClick={item.action}
                      />
                    ))}

                  <div className="mt-1 border-t border-slate-100 px-3 pb-1 pt-2.5 text-[9px] font-bold uppercase tracking-wider text-violet-500">
                    Master Data
                  </div>

                  {setupNavigation
                    .filter((item) => item.group === "MASTER")
                    .map((item) => (
                      <SetupMobileOption
                        key={item.key}
                        label={item.label}
                        active={tab === item.key}
                        master
                        onClick={item.action}
                      />
                    ))}
                </div>
              )}
            </div>

            {/* ================================================================
                DESKTOP
            ================================================================ */}

            <div className="hidden min-w-0 flex-wrap items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={openElectionParties}
                className={
                  tab === "ELECTION_PARTIES" ? ACTIVE_TAB_CLASS : TAB_CLASS
                }
              >
                E-Parties
              </button>

              <button
                type="button"
                onClick={openElectionCandidates}
                className={
                  tab === "ELECTION_CANDIDATES" ? ACTIVE_TAB_CLASS : TAB_CLASS
                }
              >
                E-Candidates
              </button>

              <button
                type="button"
                onClick={openContests}
                className={tab === "CONTESTS" ? ACTIVE_TAB_CLASS : TAB_CLASS}
              >
                Contests
              </button>

              <span className="hidden h-7 w-px bg-slate-200 md:block" />

              <button
                type="button"
                onClick={openMasterParties}
                className={
                  tab === "MASTER_PARTIES"
                    ? ACTIVE_MASTER_TAB_CLASS
                    : MASTER_TAB_CLASS
                }
              >
                Master Party
              </button>

              <button
                type="button"
                onClick={openMasterCandidates}
                className={
                  tab === "MASTER_CANDIDATES"
                    ? ACTIVE_MASTER_TAB_CLASS
                    : MASTER_TAB_CLASS
                }
              >
                Master Candidate
              </button>

              <Badge
                text={canEdit ? "Editable (NEC/SYSTEM)" : "Read-only (Tenant)"}
              />
            </div>
          </>
        }
      >
        {tab === "ELECTION_PARTIES" && <ElectionPartiesTab />}

        {tab === "ELECTION_CANDIDATES" && <ElectionCandidatesTab />}

        {tab === "CONTESTS" && (
          <ContestsTab onOpenOptions={openContestOptions} />
        )}

        {tab === "MASTER_PARTIES" && <PartiesMasterTab />}

        {tab === "MASTER_CANDIDATES" && <CandidatesMasterTab />}
      </Panel>
    </div>
  );
}

// ============================================================================
// MOBILE OPTION
// ============================================================================

function SetupMobileOption({
  label,
  active,
  master,
  onClick,
}: {
  label: string;

  active: boolean;

  master: boolean;

  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        `
          flex
          min-h-9
          w-full
          items-center
          justify-between
          gap-3
          px-3
          py-2
          text-left
          text-xs
          font-bold
        `,

        active
          ? master
            ? "bg-violet-50 text-violet-700"
            : "bg-blue-50 text-blue-700"
          : "text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      <span>{label}</span>

      {active && (
        <Check
          size={13}
          className={master ? "text-violet-600" : "text-blue-600"}
        />
      )}
    </button>
  );
}

// ============================================================================
// CLASSES
// ============================================================================

const TAB_CLASS = [
  "inline-flex",
  "min-h-10",
  "items-center",
  "justify-center",
  "rounded-lg",
  "border",
  "border-slate-300",
  "bg-white",
  "px-3",
  "py-2",
  "text-sm",
  "font-bold",
  "text-slate-700",
  "hover:bg-slate-50",
].join(" ");

const ACTIVE_TAB_CLASS = [
  "inline-flex",
  "min-h-10",
  "items-center",
  "justify-center",
  "rounded-lg",
  "border",
  "border-blue-600",
  "bg-blue-600",
  "px-3",
  "py-2",
  "text-sm",
  "font-bold",
  "text-white",
  "shadow-sm",
].join(" ");

const MASTER_TAB_CLASS = [
  "inline-flex",
  "min-h-10",
  "items-center",
  "justify-center",
  "rounded-lg",
  "border",
  "border-violet-200",
  "bg-violet-50",
  "px-3",
  "py-2",
  "text-sm",
  "font-bold",
  "text-violet-700",
  "hover:bg-violet-100",
].join(" ");

const ACTIVE_MASTER_TAB_CLASS = [
  "inline-flex",
  "min-h-10",
  "items-center",
  "justify-center",
  "rounded-lg",
  "border",
  "border-violet-600",
  "bg-violet-600",
  "px-3",
  "py-2",
  "text-sm",
  "font-bold",
  "text-white",
  "shadow-sm",
].join(" ");
