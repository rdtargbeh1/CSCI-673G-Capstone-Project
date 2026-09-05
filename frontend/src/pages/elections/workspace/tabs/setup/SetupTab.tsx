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

import ContestOptionsPage from "./election/ContestOptionsPage";

import ContestFormPage from "./election/ContestFormPage";

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
  | "MASTER_PARTIES"
  | "MASTER_PARTY_CREATE"
  | "MASTER_PARTY_EDIT"
  | "MASTER_CANDIDATES"
  | "MASTER_CANDIDATE_CREATE"
  | "MASTER_CANDIDATE_EDIT";

// ============================================================================
// MOBILE NAV ITEM
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
  // LOCAL TAB STATE
  // ==========================================================================

  const [tab, setTab] = useState<SetupSubTab>("ELECTION_PARTIES");

  const [selectedContestId, setSelectedContestId] = useState<string | null>(
    null,
  );

  // ==========================================================================
  // MOBILE SETUP NAVIGATION
  // ==========================================================================

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const mobileNavRef = useRef<HTMLDivElement | null>(null);

  // ==========================================================================
  // INTERNAL SETUP ROUTE
  //
  // Root router only needs:
  //
  // /elections/:electionId/setup/*
  //
  // SetupTab owns everything beneath /setup.
  // ==========================================================================

  const setupRoute = useMemo<SetupRoute>(() => {
    const pathname = location.pathname.replace(/\/+$/, "");

    // ====================================================================
    // ELECTION PARTY ASSIGN
    //
    // /setup/parties/assign
    // ====================================================================

    if (pathname.endsWith("/setup/parties/assign")) {
      return "PARTY_ASSIGN";
    }

    // ====================================================================
    // ELECTION PARTY LIST
    //
    // /setup/parties
    // ====================================================================

    if (pathname.endsWith("/setup/parties")) {
      return "PARTIES";
    }

    // ====================================================================
    // ELECTION CANDIDATE ASSIGN
    //
    // /setup/candidates/assign
    // ====================================================================

    if (pathname.endsWith("/setup/candidates/assign")) {
      return "CANDIDATE_ASSIGN";
    }

    // ====================================================================
    // ELECTION CANDIDATE LIST
    //
    // /setup/candidates
    // ====================================================================

    if (pathname.endsWith("/setup/candidates")) {
      return "CANDIDATES";
    }

    // ====================================================================
    // CONTEST CREATE
    //
    // /setup/contests/new
    // ====================================================================

    if (pathname.endsWith("/setup/contests/new")) {
      return "CONTEST_CREATE";
    }

    // ====================================================================
    // CONTEST EDIT
    //
    // /setup/contests/:contestId/edit
    // ====================================================================

    if (/\/setup\/contests\/[^/]+\/edit$/.test(pathname)) {
      return "CONTEST_EDIT";
    }

    // ====================================================================
    // CONTEST LIST
    //
    // /setup/contests
    // ====================================================================

    if (pathname.endsWith("/setup/contests")) {
      return "CONTESTS";
    }

    // ====================================================================
    // MASTER PARTY CREATE
    //
    // /setup/master-parties/new
    // ====================================================================

    if (pathname.endsWith("/setup/master-parties/new")) {
      return "MASTER_PARTY_CREATE";
    }

    // ====================================================================
    // MASTER PARTY EDIT
    //
    // /setup/master-parties/:partyId/edit
    // ====================================================================

    if (/\/setup\/master-parties\/[^/]+\/edit$/.test(pathname)) {
      return "MASTER_PARTY_EDIT";
    }

    // ====================================================================
    // MASTER PARTY LIST
    //
    // /setup/master-parties
    // ====================================================================

    if (pathname.endsWith("/setup/master-parties")) {
      return "MASTER_PARTIES";
    }

    // ====================================================================
    // MASTER CANDIDATE CREATE
    //
    // /setup/master-candidates/new
    // ====================================================================

    if (pathname.endsWith("/setup/master-candidates/new")) {
      return "MASTER_CANDIDATE_CREATE";
    }

    // ====================================================================
    // MASTER CANDIDATE EDIT
    //
    // /setup/master-candidates/:candidateId/edit
    // ====================================================================

    if (/\/setup\/master-candidates\/[^/]+\/edit$/.test(pathname)) {
      return "MASTER_CANDIDATE_EDIT";
    }

    // ====================================================================
    // MASTER CANDIDATE LIST
    //
    // /setup/master-candidates
    // ====================================================================

    if (pathname.endsWith("/setup/master-candidates")) {
      return "MASTER_CANDIDATES";
    }

    // ====================================================================
    // DEFAULT SETUP WORKSPACE
    // ====================================================================

    return "MAIN";
  }, [location.pathname]);

  // ==========================================================================
  // KEEP LOCAL TAB STATE ALIGNED WITH ROUTE
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
  // CLOSE MOBILE NAV ON ROUTE CHANGE
  // ==========================================================================

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  // ==========================================================================
  // CLOSE MOBILE NAV ON OUTSIDE CLICK
  // ==========================================================================

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!mobileNavRef.current) {
        return;
      }

      if (!mobileNavRef.current.contains(event.target as Node)) {
        setMobileNavOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);

    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [mobileNavOpen]);

  // ==========================================================================
  // ROOT SETUP
  // ==========================================================================

  const goToSetup = () => {
    if (!electionId) {
      return;
    }

    navigate(`/elections/${electionId}/setup`);
  };

  // ==========================================================================
  // ELECTION PARTIES
  // ==========================================================================

  const openElectionParties = () => {
    if (!electionId) {
      return;
    }

    setSelectedContestId(null);

    setTab("ELECTION_PARTIES");

    setMobileNavOpen(false);

    navigate(`/elections/${electionId}/setup/parties`);
  };

  // ==========================================================================
  // ELECTION CANDIDATES
  // ==========================================================================

  const openElectionCandidates = () => {
    if (!electionId) {
      return;
    }

    setSelectedContestId(null);

    setTab("ELECTION_CANDIDATES");

    setMobileNavOpen(false);

    navigate(`/elections/${electionId}/setup/candidates`);
  };

  // ==========================================================================
  // CONTESTS
  // ==========================================================================

  const openContests = () => {
    if (!electionId) {
      return;
    }

    setSelectedContestId(null);

    setTab("CONTESTS");

    setMobileNavOpen(false);

    navigate(`/elections/${electionId}/setup/contests`);
  };

  // ==========================================================================
  // MASTER PARTIES
  // ==========================================================================

  const openMasterParties = () => {
    if (!electionId) {
      return;
    }

    setSelectedContestId(null);

    setTab("MASTER_PARTIES");

    setMobileNavOpen(false);

    navigate(`/elections/${electionId}/setup/master-parties`);
  };

  // ==========================================================================
  // MASTER CANDIDATES
  // ==========================================================================

  const openMasterCandidates = () => {
    if (!electionId) {
      return;
    }

    setSelectedContestId(null);

    setTab("MASTER_CANDIDATES");

    setMobileNavOpen(false);

    navigate(`/elections/${electionId}/setup/master-candidates`);
  };

  // ==========================================================================
  // CONTEST OPTIONS
  // ==========================================================================

  const openContestOptions = (contestId: string) => {
    setSelectedContestId(contestId);

    setTab("CONTEST_OPTIONS");

    setMobileNavOpen(false);

    goToSetup();
  };

  const goBackToContests = () => {
    setSelectedContestId(null);

    setTab("CONTESTS");

    setMobileNavOpen(false);

    if (electionId) {
      navigate(`/elections/${electionId}/setup/contests`);
    }
  };

  // ==========================================================================
  // SETUP NAVIGATION OPTIONS
  // ==========================================================================

  const setupNavigation = useMemo<SetupNavigationItem[]>(
    () => [
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
    ],

    [electionId],
  );

  // ==========================================================================
  // CURRENT SETUP LABEL
  // ==========================================================================

  const currentSetupLabel = useMemo(() => {
    if (tab === "CONTEST_OPTIONS") {
      return "Contest Options";
    }

    return setupNavigation.find((item) => item.key === tab)?.label ?? "Setup";
  }, [tab, setupNavigation]);

  // ==========================================================================
  // CURRENT TAB IS MASTER
  // ==========================================================================

  const currentIsMaster =
    tab === "MASTER_PARTIES" || tab === "MASTER_CANDIDATES";

  // ==========================================================================
  // DEDICATED SETUP PAGES
  // ==========================================================================

  if (setupRoute === "PARTY_ASSIGN") {
    return <ElectionPartyAssignPage />;
  }

  if (setupRoute === "CANDIDATE_ASSIGN") {
    return <ElectionCandidateAssignPage />;
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
                MOBILE SETUP NAV
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
              {/* CURRENT TAB */}

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
                aria-expanded={mobileNavOpen}
                aria-label="Change setup section"
              >
                <span className="truncate">{currentSetupLabel}</span>

                {mobileNavOpen ? (
                  <ChevronUp size={13} className="shrink-0" />
                ) : (
                  <ChevronDown size={13} className="shrink-0" />
                )}
              </button>

              {/* ==========================================================
                  MOBILE DROPDOWN
              ========================================================== */}

              {mobileNavOpen && (
                <div
                  className="
                    absolute
                    right-0
                    top-[calc(100%+6px)]
                    z-50
                    w-[210px]
                    overflow-hidden
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    shadow-xl
                  "
                >
                  {/* ELECTION SETUP */}

                  <div className="px-3 pb-1 pt-2.5">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Election Setup
                    </div>
                  </div>

                  {setupNavigation
                    .filter((item) => item.group === "ELECTION")
                    .map((item) => {
                      const active = tab === item.key;

                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={item.action}
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
                                transition
                              `,

                            active
                              ? `
                                    bg-blue-50
                                    text-blue-700
                                  `
                              : `
                                    text-slate-700
                                    hover:bg-slate-50
                                  `,
                          ].join(" ")}
                        >
                          <span>{item.label}</span>

                          {active && (
                            <Check
                              size={13}
                              className="shrink-0 text-blue-600"
                            />
                          )}
                        </button>
                      );
                    })}

                  {/* MASTER DATA */}

                  <div className="mt-1 border-t border-slate-100 px-3 pb-1 pt-2.5">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-violet-500">
                      Master Data
                    </div>
                  </div>

                  {setupNavigation
                    .filter((item) => item.group === "MASTER")
                    .map((item) => {
                      const active = tab === item.key;

                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={item.action}
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
                                transition
                              `,

                            active
                              ? `
                                    bg-violet-50
                                    text-violet-700
                                  `
                              : `
                                    text-slate-700
                                    hover:bg-slate-50
                                  `,
                          ].join(" ")}
                        >
                          <span>{item.label}</span>

                          {active && (
                            <Check
                              size={13}
                              className="shrink-0 text-violet-600"
                            />
                          )}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>

            {/* ================================================================
                DESKTOP SETUP NAV
            ================================================================ */}

            <div className="hidden min-w-0 flex-wrap items-center gap-2 sm:flex">
              {/* ELECTION PARTIES */}

              <button
                type="button"
                onClick={openElectionParties}
                className={
                  tab === "ELECTION_PARTIES" ? ACTIVE_TAB_CLASS : TAB_CLASS
                }
              >
                E-Parties
              </button>

              {/* ELECTION CANDIDATES */}

              <button
                type="button"
                onClick={openElectionCandidates}
                className={
                  tab === "ELECTION_CANDIDATES" ? ACTIVE_TAB_CLASS : TAB_CLASS
                }
              >
                E-Candidates
              </button>

              {/* CONTESTS */}

              <button
                type="button"
                onClick={openContests}
                className={tab === "CONTESTS" ? ACTIVE_TAB_CLASS : TAB_CLASS}
              >
                Contests
              </button>

              {/* CONTEST OPTIONS */}

              {selectedContestId && (
                <button
                  type="button"
                  onClick={() => setTab("CONTEST_OPTIONS")}
                  className={
                    tab === "CONTEST_OPTIONS" ? ACTIVE_TAB_CLASS : TAB_CLASS
                  }
                >
                  Contest Options
                </button>
              )}

              {/* DIVIDER */}

              <span
                className="hidden h-7 w-px bg-slate-200 md:block"
                aria-hidden="true"
              />

              {/* MASTER PARTY */}

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

              {/* MASTER CANDIDATE */}

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

              {/* ACCESS */}

              <Badge
                text={canEdit ? "Editable (NEC/SYSTEM)" : "Read-only (Tenant)"}
              />
            </div>
          </>
        }
      >
        {/* ================================================================
            ELECTION PARTIES
        ================================================================ */}

        {tab === "ELECTION_PARTIES" && <ElectionPartiesTab />}

        {/* ================================================================
            ELECTION CANDIDATES
        ================================================================ */}

        {tab === "ELECTION_CANDIDATES" && <ElectionCandidatesTab />}

        {/* ================================================================
            CONTESTS
        ================================================================ */}

        {tab === "CONTESTS" && (
          <ContestsTab onOpenOptions={openContestOptions} />
        )}

        {/* ================================================================
            CONTEST OPTIONS
        ================================================================ */}

        {tab === "CONTEST_OPTIONS" && (
          <ContestOptionsPage
            contestId={selectedContestId}
            onBack={goBackToContests}
          />
        )}

        {/* ================================================================
            MASTER PARTY
        ================================================================ */}

        {tab === "MASTER_PARTIES" && <PartiesMasterTab />}

        {/* ================================================================
            MASTER CANDIDATE
        ================================================================ */}

        {tab === "MASTER_CANDIDATES" && <CandidatesMasterTab />}
      </Panel>
    </div>
  );
}

// ============================================================================
// STANDARD SETUP TAB
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

  "transition",

  "hover:bg-slate-50",
].join(" ");

// ============================================================================
// ACTIVE STANDARD SETUP TAB
// ============================================================================

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

// ============================================================================
// MASTER TAB
// ============================================================================

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

  "transition",

  "hover:bg-violet-100",
].join(" ");

// ============================================================================
// ACTIVE MASTER TAB
// ============================================================================

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
