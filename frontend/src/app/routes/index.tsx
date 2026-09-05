// src/app/routes/index.tsx

import { createBrowserRouter, Navigate } from "react-router-dom";

import AppLayout from "../layout/AppLayout";

import RootRedirect from "./RootRedirect";
import LoginPage from "../../pages/auth/LoginPage";
import { RequireAuth } from "../../shared/routes/RequireGuards";

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

import ElectionWorkspaceLayout from "../../pages/elections/workspace/ElectionWorkspaceLayout";

import OverviewTab from "../../pages/elections/workspace/tabs/overview/OverviewTab";
import SetupTab from "../../pages/elections/workspace/tabs/setup/SetupTab";
import AllocationTab from "../../pages/elections/workspace/tabs/allocation/AllocationTab";
import SubmissionsTab from "../../pages/elections/workspace/tabs/submissions/SubmissionsTab";
import IntegrityTab from "../../pages/elections/workspace/tabs/integrity/IntegrityTab";

// ============================================================================
// ELECTION ALLOCATIONS
// ============================================================================

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

import OperationsLayout from "../../pages/operations/OperationsLayout";
import SubmissionQueuePage from "../../pages/operations/SubmissionQueuePage";
import ObserverReportsPage from "../../pages/operations/ObserverReportsPage";
import NotificationsPage from "../../pages/operations/NotificationsPage";
import TallySheetsPage from "../../pages/operations/TallySheetsPage";

// ============================================================================
// GEOGRAPHY
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

import OrganizationsPage from "../../pages/admin-security/tenant/OrganizationsPage";
import MembershipsPage from "../../pages/admin-security/tenant/MembershipsPage";
import OrgSettingsPage from "../../pages/admin-security/tenant/OrgSettingsPage";

import UsersPage from "../../pages/admin-security/security/UsersPage";
import RolesPage from "../../pages/admin-security/security/RolesPage";
import MfaPage from "../../pages/admin-security/security/MfaPage";
import SessionsPage from "../../pages/admin-security/security/SessionsPage";
import SigningKeysPage from "../../pages/admin-security/security/SigningKeysPage";

import AuditLogsPage from "../../pages/admin-security/oversight/AuditLogsPage";
import AuditLedgerPage from "../../pages/admin-security/oversight/AuditLedgerPage";
import FileUploadsPage from "../../pages/admin-security/oversight/FileUploadsPage";

// ============================================================================
// DASHBOARD ENTRY
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
// ROUTER
// ============================================================================

export const router = createBrowserRouter([
  {
    path: "/",

    element: <RootRedirect />,
  },

  {
    path: "/login",

    element: <LoginPage />,
  },

  {
    path: "/",

    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),

    children: [
      // ====================================================================
      // ROOT
      // ====================================================================

      {
        index: true,

        element: <DashboardEntry />,
      },

      // ====================================================================
      // DASHBOARD
      // ====================================================================

      {
        path: "dashboard",

        element: <DashboardEntry />,
      },

      {
        path: "dashboard/local-results",

        element: <LocalResultsDashboard mode="TENANT" />,
      },

      {
        path: "dashboard/official-results",

        element: <OfficialResultsDashboard mode="TENANT" />,
      },

      {
        path: "dashboard/nec",

        element: <NecDashboard />,
      },

      {
        path: "dashboard/nec/local-results",

        element: <LocalResultsDashboard mode="NEC" />,
      },

      {
        path: "dashboard/nec/official-results",

        element: <OfficialResultsDashboard mode="NEC" />,
      },

      {
        path: "dashboard/system",

        element: <SystemDashboard />,
      },

      // ====================================================================
      // ELECTIONS
      //
      // /elections
      // /elections/new
      // /elections/:electionId
      //
      // Existing Election Workspace URLs are preserved:
      //
      // /elections/:electionId/overview
      // /elections/:electionId/setup
      // /elections/:electionId/allocation
      // /elections/:electionId/submissions
      // /elections/:electionId/results
      // ...
      // ====================================================================

      {
        path: "elections",

        element: <ElectionsListPage />,
      },

      {
        path: "elections/new",

        element: <ElectionCreatePage />,
      },

      {
        path: "elections/:electionId",

        children: [
          // ================================================================
          // ELECTION DETAIL
          //
          // /elections/:electionId
          // ================================================================

          {
            index: true,

            element: <ElectionDetailPage />,
          },

          // ================================================================
          // EXISTING ELECTION WORKSPACE
          //
          // This is intentionally a PATHLESS layout route.
          //
          // It allows:
          //
          // /elections/:electionId         -> ElectionDetailPage
          //
          // while preserving:
          //
          // /elections/:electionId/overview
          // /elections/:electionId/setup
          // /elections/:electionId/allocation
          // etc.
          // ================================================================

          {
            element: <ElectionWorkspaceLayout />,

            children: [
              // ============================================================
              // OVERVIEW
              // ============================================================

              {
                path: "overview",

                element: <OverviewTab />,
              },

              // ============================================================
              // SETUP
              // ============================================================

              {
                path: "setup/*",
                element: <SetupTab />,
              },
              // {
              //   path: "setup",

              //   element: <SetupTab />,
              // },

              // ============================================================
              // ALLOCATION
              // ============================================================

              {
                path: "allocation*",

                element: <AllocationTab />,

                children: [
                  // ========================================================
                  // ALLOCATION INDEX
                  // ========================================================

                  {
                    index: true,

                    element: <Navigate to="centers" replace />,
                  },

                  // ========================================================
                  // POLLING CENTER ALLOCATION
                  // ========================================================

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

                  // ========================================================
                  // POLLING PLACE ALLOCATION
                  // ========================================================

                  {
                    path: "places",

                    element: <PollingPlaceAllocationsPage />,
                  },

                  {
                    path: "places/new",

                    element: <PollingPlaceAllocationCreatePage />,
                  },

                  {
                    path: "places/:placeAllocationId",

                    element: <PollingPlaceAllocationDetailPage />,
                  },
                ],
              },

              // ============================================================
              // SUBMISSIONS
              // ============================================================

              {
                path: "submissions",

                element: <SubmissionsTab />,
              },

              // ============================================================
              // INTEGRITY
              // ============================================================

              {
                path: "integrity",

                element: <IntegrityTab />,
              },

              // ============================================================
              // NEC WORKFLOW
              // ============================================================

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

              // ============================================================
              // RESULTS
              // ============================================================

              {
                path: "results",

                element: <ResultsTab />,

                children: [
                  // ========================================================
                  // RESULTS INDEX
                  // ========================================================

                  {
                    index: true,

                    element: <Navigate to="submission-contest" replace />,
                  },

                  // ========================================================
                  // SUBMISSION CONTEST
                  // ========================================================

                  {
                    path: "submission-contest",

                    element: <VoteSubmissionContestPage />,
                  },

                  // ========================================================
                  // TALLY
                  // ========================================================

                  {
                    path: "tally",

                    element: <VoteTallyPage />,
                  },

                  // ========================================================
                  // PARTY RESULTS
                  // ========================================================

                  {
                    path: "party",

                    element: <PartyResultsLayout />,

                    children: [
                      {
                        index: true,

                        element: <Navigate to="candidates/counties" replace />,
                      },

                      // ====================================================
                      // PARTY CANDIDATES
                      // ====================================================

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

                      // ====================================================
                      // PARTY TOTALS
                      // ====================================================

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

                  // ========================================================
                  // OFFICIAL RESULTS
                  // ========================================================

                  {
                    path: "official",

                    element: <OfficialResultsLayout />,

                    children: [
                      {
                        index: true,

                        element: <Navigate to="candidates/counties" replace />,
                      },

                      // ====================================================
                      // OFFICIAL CANDIDATES
                      // ====================================================

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

                      // ====================================================
                      // OFFICIAL TOTALS
                      // ====================================================

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

                  // ========================================================
                  // COMPARE
                  // ========================================================

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

      // ====================================================================
      // OPERATIONS
      // ====================================================================

      {
        path: "operations",

        element: <OperationsLayout />,

        children: [
          {
            index: true,

            element: <SubmissionQueuePage />,
          },

          {
            path: "submissions",

            element: <SubmissionQueuePage />,
          },

          {
            path: "observer-reports",

            element: <ObserverReportsPage />,
          },

          {
            path: "notifications",

            element: <NotificationsPage />,
          },

          {
            path: "tally-sheets",

            element: <TallySheetsPage />,
          },
        ],
      },

      // ====================================================================
      // GEOGRAPHY
      // ====================================================================

      {
        path: "geography-registry",

        element: <GeoRegistryLayout />,

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

      // ====================================================================
      // REPORTS
      // ====================================================================

      {
        path: "reports",

        element: <ReportsLayout />,

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

      // ====================================================================
      // ADMIN & SECURITY
      // ====================================================================

      {
        path: "admin-security",

        element: <AdminSecurityLayout />,

        children: [
          {
            index: true,

            element: <AdminSecurityIndexRedirect />,
          },

          {
            path: "organizations",

            element: <OrganizationsPage />,
          },

          {
            path: "memberships",

            element: <MembershipsPage />,
          },

          {
            path: "org-settings",

            element: <OrgSettingsPage />,
          },

          {
            path: "users",

            element: <UsersPage />,
          },

          {
            path: "roles",

            element: <RolesPage />,
          },

          {
            path: "mfa",

            element: <MfaPage />,
          },

          {
            path: "sessions",

            element: <SessionsPage />,
          },

          {
            path: "signing-keys",

            element: <SigningKeysPage />,
          },

          {
            path: "audit-logs",

            element: <AuditLogsPage />,
          },

          {
            path: "audit-ledger",

            element: <AuditLedgerPage />,
          },

          {
            path: "file-uploads",

            element: <FileUploadsPage />,
          },
        ],
      },
    ],
  },
]);
