// src/app/routes/index.tsx

import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

import AppLayout from "../layout/AppLayout";

import RootRedirect from "./RootRedirect";
import LoginPage from "../../pages/auth/LoginPage";

import { RequireAuth } from "../../shared/routes/RequireGuards";

import {
  AdministrativeWorkspaceGuard,
  DashboardWorkspaceGuard,
  OperationsWorkspaceGuard,
} from "../../shared/routes/WorkspaceGuards";

import SystemDashboard from "../../pages/dashboard/panels/SystemDashboard";

import { useAuthStore } from "../../shared/store/authStore";

import TenantDashboard from "../../pages/dashboard/panels/OrgDashboard";
import NecDashboard from "../../pages/dashboard/panels/NecDashboard";

import LocalResultsDashboard from "../../pages/dashboard/modes/LocalResultsDashboard";
import OfficialResultsDashboard from "../../pages/dashboard/modes/OfficialResultsDashboard";

// ============================================================================
// ELECTIONS
// ============================================================================

import ElectionsListPage from "../../pages/elections/ElectionsListPage";
import ElectionCreatePage from "../../pages/elections/ElectionCreatePage";
import ElectionDetailPage from "../../pages/elections/ElectionDetailPage";
import ElectionLifecyclePage from "../../pages/elections/ElectionLifecyclePage";

import ElectionWorkspaceLayout from "../../pages/elections/workspace/ElectionWorkspaceLayout";

import OverviewTab from "../../pages/elections/workspace/tabs/overview/OverviewTab";
import SetupTab from "../../pages/elections/workspace/tabs/setup/SetupTab";
import SubmissionsTab from "../../pages/elections/workspace/tabs/submissions/shared/SubmissionsTab";
import IntegrityTab from "../../pages/elections/workspace/tabs/integrity/IntegrityTab";

// ============================================================================
// ELECTION ALLOCATION
// ============================================================================

import AllocationTab from "../../pages/elections/workspace/tabs/allocation/AllocationTab";

import PollingCenterAllocationPage from "../../pages/elections/workspace/tabs/allocation/PollingCenterAllocationsPage";
import PollingCenterAllocationCreatePage from "../../pages/elections/workspace/tabs/allocation/PollingCenterAllocationCreatePage";
import PollingCenterAllocationDetailPage from "../../pages/elections/workspace/tabs/allocation/PollingCenterAllocationDetailPage";

import PollingPlaceAllocationsPage from "../../pages/elections/workspace/tabs/allocation/PollingPlaceAllocationsPage";
import PollingPlaceAllocationCreatePage from "../../pages/elections/workspace/tabs/allocation/PollingPlaceAllocationCreatePage";
import PollingPlaceAllocationDetailPage from "../../pages/elections/workspace/tabs/allocation/PollingPlaceAllocationDetailPage";

// ============================================================================
// NEC WORKFLOW
// ============================================================================

import NecWorkflowTab from "../../pages/elections/workspace/tabs/nec-workflow/shared/NecWorkflowTab";
import NecResultTab from "../../pages/elections/workspace/tabs/nec-workflow/NecResultTab";
import NecResultStagingPage from "../../pages/elections/workspace/tabs/nec-workflow/NecResultStagingPage";
import NecResultHistoryPage from "../../pages/elections/workspace/tabs/nec-workflow/NecResultHistoryPage";

// ============================================================================
// ELECTION RESULTS
// ============================================================================

import ResultsTab from "../../pages/elections/workspace/tabs/results/shared/ResultsTab";
import VoteTallyPage from "../../pages/elections/workspace/tabs/results/VoteTallyPage";
import VoteSubmissionContestPage from "../../pages/elections/workspace/tabs/results/VoteSubmissionContestPage";

// ============================================================================
// PARTY RESULTS
// ============================================================================

import PartyResultsLayout from "../../pages/elections/workspace/tabs/results/shared/PartyResultsLayout";

import PartyCandidateCentersPage from "../../pages/elections/workspace/tabs/results/party/PartyCandidateCentersPage";
import PartyCandidateDistrictsPage from "../../pages/elections/workspace/tabs/results/party/PartyCandidateDistrictsPage";
import PartyCandidateCountiesPage from "../../pages/elections/workspace/tabs/results/party/PartyCandidateCountiesPage";
import PartyCandidateElectionPage from "../../pages/elections/workspace/tabs/results/party/PartyCandidateElectionPage";

import PartyTotalsCentersPage from "../../pages/elections/workspace/tabs/results/party/PartyTotalsCentersPage";
import PartyTotalsDistrictsPage from "../../pages/elections/workspace/tabs/results/party/PartyTotalsDistrictsPage";
import PartyTotalsCountiesPage from "../../pages/elections/workspace/tabs/results/party/PartyTotalsCountiesPage";
import PartyTotalsElectionPage from "../../pages/elections/workspace/tabs/results/party/PartyTotalsElectionPage";

// ============================================================================
// OFFICIAL RESULTS
// ============================================================================

import OfficialResultsLayout from "../../pages/elections/workspace/tabs/results/shared/OfficialResultsLayout";

import OfficialCandidateCentersPage from "../../pages/elections/workspace/tabs/results/official/OfficialCandidateCentersPage";
import OfficialCandidateDistrictsPage from "../../pages/elections/workspace/tabs/results/official/OfficialCandidateDistrictsPage";
import OfficialCandidateCountiesPage from "../../pages/elections/workspace/tabs/results/official/OfficialCandidateCountiesPage";
import OfficialCandidateElectionPage from "../../pages/elections/workspace/tabs/results/official/OfficialCandidateElectionPage";

import OfficialTotalsCentersPage from "../../pages/elections/workspace/tabs/results/official/OfficialTotalsCentersPage";
import OfficialTotalsDistrictsPage from "../../pages/elections/workspace/tabs/results/official/OfficialTotalsDistrictsPage";
import OfficialTotalsCountiesPage from "../../pages/elections/workspace/tabs/results/official/OfficialTotalsCountiesPage";
import OfficialTotalsElectionPage from "../../pages/elections/workspace/tabs/results/official/OfficialTotalsElectionPage";

import NecResultGeoPage from "../../pages/elections/workspace/tabs/results/official/NecResultGeoPage";

// ============================================================================
// COMPARE
// ============================================================================

import CompareCountyCandidatesPage from "../../pages/elections/workspace/tabs/results/compare/CompareCountyCandidatesPage";

// ============================================================================
// OPERATIONS
// ============================================================================

import OperationsTab from "../../pages/operations/shared/OperationsTab";

// ============================================================================
// GEOGRAPHY / REGISTRY
// ============================================================================

import GeoRegistryLayout from "../../pages/geo-registry/GeoRegistryLayout";

import CountiesPage from "../../pages/geo-registry/CountiesPage";
import DistrictsPage from "../../pages/geo-registry/DistrictsPage";
import PollingCentersPage from "../../pages/geo-registry/PollingCentersPage";
import PollingPlacesPage from "../../pages/geo-registry/PollingPlacesPage";

import ImportBatchesPage from "../../pages/geo-registry/registry/ImportBatchesPage";
import VoterStagingPage from "../../pages/geo-registry/registry/VoterStagingPage";
import VoterRegistryPage from "../../pages/geo-registry/registry/VoterRegistryPage";
import PublicRollPage from "../../pages/geo-registry/registry/PublicRollPage";

// ============================================================================
// REPORTS
// ============================================================================

import ReportsLayout from "../../pages/reports/ReportsLayout";
import ReportRequestsPage from "../../pages/reports/ReportRequestsPage";
import ReportFilesPage from "../../pages/reports/ReportFilesPage";

// ============================================================================
// ADMIN & SECURITY
// ============================================================================

import AdminSecurityLayout from "../../pages/admin-security/AdminSecurityLayout";
import TenantTab from "../../pages/admin-security/tenant/shared/TenantTab";
import SecurityTab from "../../pages/admin-security/security/shared/SecurityTab";
import OversightTab from "../../pages/admin-security/oversight/shared/OversightTab";

// ============================================================================
// DASHBOARD ENTRY
// ============================================================================
//
// Portal access is already resolved before this component.
//
// This component only decides which ADMINISTRATIVE dashboard presentation
// belongs to the current environment:
//
// SYSTEM
// NEC
// TENANT
//
// ============================================================================

function DashboardEntry() {
  const mode = useAuthStore((state) => state.dashboardMode);

  if (mode === "SYSTEM") {
    return <Navigate to="/dashboard/system" replace />;
  }

  if (mode === "NEC") {
    return <Navigate to="/dashboard/nec" replace />;
  }

  return <TenantDashboard />;
}

// ============================================================================
// ADMIN SECURITY INDEX
// ============================================================================

function AdminSecurityIndexRedirect() {
  const mode = useAuthStore((state) => state.dashboardMode);

  if (mode === "SYSTEM") {
    return <Navigate to="/admin-security/organizations" replace />;
  }

  return <Navigate to="/admin-security/memberships" replace />;
}

// ============================================================================
// ADMINISTRATIVE ELECTION OUTLET
// ============================================================================
//
// This preserves the CURRENT elections/:electionId route structure:
//
// Election detail
// Lifecycle
// ElectionWorkspaceLayout
//
// while applying one administrative guard to the entire election-management
// branch.
//
// ============================================================================

function AdministrativeElectionOutlet() {
  return (
    <AdministrativeWorkspaceGuard>
      <Outlet />
    </AdministrativeWorkspaceGuard>
  );
}

// ============================================================================
// ROUTER
// ============================================================================

export const router = createBrowserRouter([
  // ==========================================================================
  // ROOT
  // ==========================================================================

  {
    path: "/",
    element: <RootRedirect />,
  },

  // ==========================================================================
  // LOGIN
  // ==========================================================================

  {
    path: "/login",
    element: <LoginPage />,
  },

  // ==========================================================================
  // AUTHENTICATED APPLICATION
  // ==========================================================================

  {
    path: "/",

    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),

    children: [
      // ======================================================================
      // ROOT
      // ======================================================================
      //
      // Keep this consistent with the public root redirect in case React
      // Router resolves this authenticated index branch.
      //
      // ======================================================================

      {
        index: true,
        element: <RootRedirect />,
      },

      // ======================================================================
      // ADMINISTRATIVE DASHBOARD
      // ======================================================================

      {
        path: "dashboard",

        element: (
          <DashboardWorkspaceGuard>
            <DashboardEntry />
          </DashboardWorkspaceGuard>
        ),
      },

      {
        path: "dashboard/local-results",

        element: (
          <DashboardWorkspaceGuard>
            <LocalResultsDashboard mode="TENANT" />
          </DashboardWorkspaceGuard>
        ),
      },

      {
        path: "dashboard/official-results",

        element: (
          <DashboardWorkspaceGuard>
            <OfficialResultsDashboard mode="TENANT" />
          </DashboardWorkspaceGuard>
        ),
      },

      {
        path: "dashboard/nec",

        element: (
          <DashboardWorkspaceGuard>
            <NecDashboard />
          </DashboardWorkspaceGuard>
        ),
      },

      {
        path: "dashboard/nec/local-results",

        element: (
          <DashboardWorkspaceGuard>
            <LocalResultsDashboard mode="NEC" />
          </DashboardWorkspaceGuard>
        ),
      },

      {
        path: "dashboard/nec/official-results",

        element: (
          <DashboardWorkspaceGuard>
            <OfficialResultsDashboard mode="NEC" />
          </DashboardWorkspaceGuard>
        ),
      },

      {
        path: "dashboard/system",

        element: (
          <DashboardWorkspaceGuard>
            <SystemDashboard />
          </DashboardWorkspaceGuard>
        ),
      },

      // ======================================================================
      // ADMINISTRATIVE ELECTIONS
      // ======================================================================

      {
        path: "elections",

        element: (
          <AdministrativeWorkspaceGuard>
            <ElectionsListPage />
          </AdministrativeWorkspaceGuard>
        ),
      },

      {
        path: "elections/new",

        element: (
          <AdministrativeWorkspaceGuard>
            <ElectionCreatePage />
          </AdministrativeWorkspaceGuard>
        ),
      },

      {
        path: "elections/:electionId",

        element: <AdministrativeElectionOutlet />,

        children: [
          // ==================================================================
          // ELECTION DETAIL
          // ==================================================================

          {
            index: true,
            element: <ElectionDetailPage />,
          },

          {
            path: "lifecycle",
            element: <ElectionLifecyclePage />,
          },

          // ==================================================================
          // ELECTION WORKSPACE
          // ==================================================================

          {
            element: <ElectionWorkspaceLayout />,

            children: [
              // ==============================================================
              // OVERVIEW
              // ==============================================================

              {
                path: "overview",
                element: <OverviewTab />,
              },

              // ==============================================================
              // SETUP
              // ==============================================================

              {
                path: "setup/*",
                element: <SetupTab />,
              },

              // ==============================================================
              // ALLOCATION
              // ==============================================================

              {
                path: "allocation",

                element: <AllocationTab />,

                children: [
                  {
                    index: true,

                    element: <Navigate to="centers" replace />,
                  },

                  {
                    path: "centers",

                    element: <PollingCenterAllocationPage />,
                  },

                  {
                    path: "centers/new",

                    element: <PollingCenterAllocationCreatePage />,
                  },

                  {
                    path: "centers/:allocationId",

                    element: <PollingCenterAllocationDetailPage />,
                  },

                  {
                    path: "places",

                    element: <PollingPlaceAllocationsPage />,
                  },

                  {
                    path: "places/new",

                    element: <PollingPlaceAllocationCreatePage />,
                  },

                  {
                    path: "places/:allocationId",

                    element: <PollingPlaceAllocationDetailPage />,
                  },
                ],
              },

              // ==============================================================
              // SUBMISSIONS
              // ==============================================================

              {
                path: "submissions",
                element: <SubmissionsTab />,
              },

              {
                path: "submissions/*",
                element: <SubmissionsTab />,
              },

              // ==============================================================
              // INTEGRITY
              // ==============================================================

              {
                path: "integrity",
                element: <IntegrityTab />,
              },

              // ==============================================================
              // NEC WORKFLOW
              // ==============================================================

              {
                path: "nec-workflow",

                element: <NecWorkflowTab />,

                children: [
                  {
                    index: true,

                    element: <Navigate to="nec-result" replace />,
                  },

                  {
                    path: "nec-result",
                    element: <NecResultTab />,
                  },

                  {
                    path: "staging",
                    element: <NecResultStagingPage />,
                  },

                  {
                    path: "history",
                    element: <NecResultHistoryPage />,
                  },

                  {
                    path: "geo",
                    element: <NecResultGeoPage />,
                  },
                ],
              },

              // ==============================================================
              // RESULTS
              // ==============================================================

              {
                path: "results",

                element: <ResultsTab />,

                children: [
                  {
                    index: true,

                    element: <Navigate to="submission-contest" replace />,
                  },

                  {
                    path: "submission-contest",
                    element: <VoteSubmissionContestPage />,
                  },

                  {
                    path: "tally",
                    element: <VoteTallyPage />,
                  },

                  // ==========================================================
                  // PARTY RESULTS
                  // ==========================================================

                  {
                    path: "party",

                    element: <PartyResultsLayout />,

                    children: [
                      {
                        index: true,

                        element: <Navigate to="candidates/counties" replace />,
                      },

                      {
                        path: "candidates/centers",
                        element: <PartyCandidateCentersPage />,
                      },

                      {
                        path: "candidates/districts",
                        element: <PartyCandidateDistrictsPage />,
                      },

                      {
                        path: "candidates/counties",
                        element: <PartyCandidateCountiesPage />,
                      },

                      {
                        path: "candidates/election",
                        element: <PartyCandidateElectionPage />,
                      },

                      {
                        path: "totals/centers",
                        element: <PartyTotalsCentersPage />,
                      },

                      {
                        path: "totals/districts",
                        element: <PartyTotalsDistrictsPage />,
                      },

                      {
                        path: "totals/counties",
                        element: <PartyTotalsCountiesPage />,
                      },

                      {
                        path: "totals/election",
                        element: <PartyTotalsElectionPage />,
                      },
                    ],
                  },

                  // ==========================================================
                  // OFFICIAL RESULTS
                  // ==========================================================

                  {
                    path: "official",

                    element: <OfficialResultsLayout />,

                    children: [
                      {
                        index: true,

                        element: <Navigate to="candidates/counties" replace />,
                      },

                      {
                        path: "candidates/centers",
                        element: <OfficialCandidateCentersPage />,
                      },

                      {
                        path: "candidates/districts",
                        element: <OfficialCandidateDistrictsPage />,
                      },

                      {
                        path: "candidates/counties",
                        element: <OfficialCandidateCountiesPage />,
                      },

                      {
                        path: "candidates/election",
                        element: <OfficialCandidateElectionPage />,
                      },

                      {
                        path: "totals/centers",
                        element: <OfficialTotalsCentersPage />,
                      },

                      {
                        path: "totals/districts",
                        element: <OfficialTotalsDistrictsPage />,
                      },

                      {
                        path: "totals/counties",
                        element: <OfficialTotalsCountiesPage />,
                      },

                      {
                        path: "totals/election",
                        element: <OfficialTotalsElectionPage />,
                      },

                      {
                        path: "geo",
                        element: <NecResultGeoPage />,
                      },
                    ],
                  },

                  // ==========================================================
                  // COMPARE
                  // ==========================================================

                  {
                    path: "compare",
                    element: <CompareCountyCandidatesPage />,
                  },
                ],
              },
            ],
          },
        ],
      },

      // ======================================================================
      // OPERATIONS
      // ======================================================================
      //
      // IMPORTANT:
      //
      // Stable portal routes remain:
      //
      // /operations
      // /operations/*
      //
      // Election ID is NOT part of the Operations portal route identity.
      //
      // Administrative and operational users may both enter Operations.
      //
      // ======================================================================

      {
        path: "operations/*",

        element: (
          <OperationsWorkspaceGuard>
            <OperationsTab />
          </OperationsWorkspaceGuard>
        ),
      },

      // ======================================================================
      // ADMINISTRATIVE GEOGRAPHY / REGISTRY
      // ======================================================================

      {
        path: "geography-registry",

        element: (
          <AdministrativeWorkspaceGuard>
            <GeoRegistryLayout />
          </AdministrativeWorkspaceGuard>
        ),

        children: [
          {
            index: true,
            element: <CountiesPage />,
          },

          {
            path: "counties",
            element: <CountiesPage />,
          },

          {
            path: "districts",
            element: <DistrictsPage />,
          },

          {
            path: "polling-centers",
            element: <PollingCentersPage />,
          },

          {
            path: "polling-places",
            element: <PollingPlacesPage />,
          },

          {
            path: "import-batches",
            element: <ImportBatchesPage />,
          },

          {
            path: "voter-staging",
            element: <VoterStagingPage />,
          },

          {
            path: "voter-registry",
            element: <VoterRegistryPage />,
          },

          {
            path: "public-roll",
            element: <PublicRollPage />,
          },
        ],
      },

      // ======================================================================
      // ADMINISTRATIVE REPORTS
      // ======================================================================

      {
        path: "reports",

        element: (
          <AdministrativeWorkspaceGuard>
            <ReportsLayout />
          </AdministrativeWorkspaceGuard>
        ),

        children: [
          {
            index: true,
            element: <ReportRequestsPage />,
          },

          {
            path: "requests",
            element: <ReportRequestsPage />,
          },

          {
            path: "files",
            element: <ReportFilesPage />,
          },
        ],
      },

      // ======================================================================
      // ADMIN & SECURITY
      // ======================================================================

      {
        path: "admin-security",

        element: (
          <AdministrativeWorkspaceGuard>
            <AdminSecurityLayout />
          </AdministrativeWorkspaceGuard>
        ),

        children: [
          {
            index: true,
            element: <AdminSecurityIndexRedirect />,
          },

          {
            path: "tenant",
            element: <TenantTab />,
          },

          {
            path: "tenant/*",
            element: <TenantTab />,
          },

          {
            path: "oversight",
            element: <OversightTab />,
          },

          {
            path: "oversight/*",
            element: <OversightTab />,
          },

          {
            path: "*",
            element: <SecurityTab />,
          },
        ],
      },
    ],
  },
]);
