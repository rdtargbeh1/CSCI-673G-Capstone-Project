

// src/app/routes/index.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "../layout/AppLayout";

// ✅ ADD
import RootRedirect from "./RootRedirect";
import LoginPage from "../../pages/auth/LoginPage";
import { RequireAuth } from "../../shared/routes/RequireGuards";
import SystemDashboard from "../../pages/dashboard/panels/SystemDashboard";

// ✅ Main dashboard modes
import { useAuthStore } from "../../shared/store/authStore";
import TenantDashboard from "../../pages/dashboard/panels/OrgDashboard";
import NecDashboard from "../../pages/dashboard/panels/NecDashboard";

// ✅ Shared Local & Official Results Dashboards (for all 3 modes)
import LocalResultsDashboard from "../../pages/dashboard/modes/LocalResultsDashboard";
import OfficialResultsDashboard from "../../pages/dashboard/modes/OfficialResultsDashboard";

// Elections
import ElectionsListPage from "../../pages/elections/ElectionsListPage";
import ElectionWorkspaceLayout from "../../pages/elections/workspace/ElectionWorkspaceLayout";

import OverviewTab from "../../pages/elections/workspace/tabs/overview/OverviewTab";
import SetupTab from "../../pages/elections/workspace/tabs/setup/SetupTab";
import AllocationTab from "../../pages/elections/workspace/tabs/allocation/AllocationTab";
import SubmissionsTab from "../../pages/elections/workspace/tabs/submissions/SubmissionsTab";
import IntegrityTab from "../../pages/elections/workspace/tabs/integrity/IntegrityTab";
import NecWorkflowTab from "../../pages/elections/workspace/tabs/nec-workflow/shared/NecWorkflowTab";
import NecResultTab from "../../pages/elections/workspace/tabs/nec-workflow/NecResultTab";
import NecResultStagingPage from "../../pages/elections/workspace/tabs/nec-workflow/NecResultStagingPage";
import NecResultHistoryPage from "../../pages/elections/workspace/tabs/nec-workflow/NecResultHistoryPage";

// For Election Results
import ResultsTab from "../../pages/elections/workspace/tabs/results/shared/ResultsTab";
import VoteTallyPage from "../../pages/elections/workspace/tabs/results/VoteTallyPage";
import VoteSubmissionContestPage from "../../pages/elections/workspace/tabs//results/VoteSubmissionContestPage";

// Party layout pages (from the template zip)
import PartyResultsLayout from "../../pages/elections/workspace/tabs/results/shared/PartyResultsLayout";
import PartyCandidateCentersPage from "../../pages/elections/workspace/tabs/results/party/PartyCandidateCentersPage";
import PartyCandidateDistrictsPage from "../../pages/elections/workspace/tabs/results/party/PartyCandidateDistrictsPage";
import PartyCandidateCountiesPage from "../../pages/elections/workspace/tabs/results/party/PartyCandidateCountiesPage";
import PartyCandidateElectionPage from "../../pages/elections/workspace/tabs/results/party/PartyCandidateElectionPage";

import PartyTotalsCentersPage from "../../pages/elections/workspace/tabs/results/party/PartyTotalsCentersPage";
import PartyTotalsDistrictsPage from "../../pages/elections/workspace/tabs/results/party/PartyTotalsDistrictsPage";
import PartyTotalsCountiesPage from "../../pages/elections/workspace/tabs/results/party/PartyTotalsCountiesPage";
import PartyTotalsElectionPage from "../../pages/elections/workspace/tabs/results/party/PartyTotalsElectionPage";

// Official layout pages
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

// Compare layout
import CompareCountyCandidatesPage from "../../pages/elections/workspace/tabs/results/compare/CompareCountyCandidatesPage";

// Operations
import OperationsLayout from "../../pages/operations/OperationsLayout";
import SubmissionQueuePage from "../../pages/operations/SubmissionQueuePage";
import ObserverReportsPage from "../../pages/operations/ObserverReportsPage";
import NotificationsPage from "../../pages/operations/NotificationsPage";
import TallySheetsPage from "../../pages/operations/TallySheetsPage";

// Geography
import GeoRegistryLayout from "../../pages/geo-registry/GeoRegistryLayout";
import CountiesPage from "../../pages/geo-registry/CountiesPage";
import DistrictsPage from "../../pages/geo-registry/DistrictsPage";
import PollingCentersPage from "../../pages/geo-registry/PollingCentersPage";
import PollingPlacesPage from "../../pages/geo-registry/PollingPlacesPage";

import ImportBatchesPage from "../../pages/geo-registry/registry/ImportBatchesPage";
import VoterStagingPage from "../../pages/geo-registry/registry/VoterStagingPage";
import VoterRegistryPage from "../../pages/geo-registry/registry/VoterRegistryPage";
import PublicRollPage from "../../pages/geo-registry/registry/PublicRollPage";

// Reports
import ReportsLayout from "../../pages/reports/ReportsLayout";
import ReportRequestsPage from "../../pages/reports/ReportRequestsPage";
import ReportFilesPage from "../../pages/reports/ReportFilesPage";

// Admin & Security
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

// ✅ SMART: Dashboard entry (routes based on user role)
function DashboardEntry() {
  const mode = useAuthStore((s) => s.dashboardMode);

  if (mode === "SYSTEM") return <Navigate to="/dashboard/system" replace />;
  if (mode === "NEC") return <Navigate to="/dashboard/nec" replace />;

  return <TenantDashboard />; // ✅ TENANT default (Home tab)
}

// ✅ Admin-security default route redirect
function AdminSecurityIndexRedirect() {
  const mode = useAuthStore((s) => s.dashboardMode);

  // SYSTEM: organizations is allowed + visible
  if (mode === "SYSTEM") {
    return <Navigate to="/admin-security/organizations" replace />;
  }

  // NEC/TENANT: organizations hidden; default to memberships
  return <Navigate to="/admin-security/memberships" replace />;
}

export const router = createBrowserRouter([
  // ✅ root redirect (loads login first when not authenticated)
  { path: "/", element: <RootRedirect /> },

  // ✅ public login route
  { path: "/login", element: <LoginPage /> },

  // ✅ protected app
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      // ✅ Default: smart-route based on user mode
      { index: true, element: <DashboardEntry /> },

      // ============================================================
      // TENANT DASHBOARD (3 modes: Home, Local Results, Official)
      // ============================================================
      { path: "dashboard", element: <DashboardEntry /> },
      { path: "dashboard/local-results", element: <LocalResultsDashboard mode="TENANT" /> },
      { path: "dashboard/official-results", element: <OfficialResultsDashboard mode="TENANT" /> },

      // ============================================================
      // NEC DASHBOARD (3 modes: Home, Local Results, Official)
      // ============================================================
      { path: "dashboard/nec", element: <NecDashboard /> },
      { path: "dashboard/nec/local-results", element: <LocalResultsDashboard mode="NEC" /> },
      { path: "dashboard/nec/official-results", element: <OfficialResultsDashboard mode="NEC" /> },

      // ============================================================
      // SYSTEM DASHBOARD (single view)
      // ============================================================
      { path: "dashboard/system", element: <SystemDashboard /> },

      // Elections Hub + Workspace
      { path: "elections", element: <ElectionsListPage /> },

      {
        path: "elections/:electionId",
        element: <ElectionWorkspaceLayout />,
        children: [
          { index: true, element: <OverviewTab /> },
          { path: "overview", element: <OverviewTab /> },
          { path: "setup", element: <SetupTab /> },
          { path: "allocation", element: <AllocationTab /> },
          { path: "submissions", element: <SubmissionsTab /> },
          { path: "integrity", element: <IntegrityTab /> },

          {
            path: "nec-workflow",
            element: <NecWorkflowTab />,
            children: [
              { index: true, element: <Navigate to="nec-result" replace /> },
              { path: "nec-result", element: <NecResultTab /> },
              { path: "staging", element: <NecResultStagingPage /> },
              { path: "history", element: <NecResultHistoryPage /> },
              { path: "geo", element: <NecResultGeoPage /> },
            ],
          },

          {
            path: "results",
            element: <ResultsTab />,
            children: [
              { index: true, element: <Navigate to="submission-contest" replace /> },
              { path: "submission-contest", element: <VoteSubmissionContestPage /> },
              { path: "tally", element: <VoteTallyPage /> },

              {
                path: "party",
                element: <PartyResultsLayout />,
                children: [
                  { index: true, element: <Navigate to="candidates/counties" replace /> },
                  { path: "candidates/centers", element: <PartyCandidateCentersPage /> },
                  { path: "candidates/districts", element: <PartyCandidateDistrictsPage /> },
                  { path: "candidates/counties", element: <PartyCandidateCountiesPage /> },
                  { path: "candidates/election", element: <PartyCandidateElectionPage /> },
                  { path: "totals/centers", element: <PartyTotalsCentersPage /> },
                  { path: "totals/districts", element: <PartyTotalsDistrictsPage /> },
                  { path: "totals/counties", element: <PartyTotalsCountiesPage /> },
                  { path: "totals/election", element: <PartyTotalsElectionPage /> },
                ],
              },

              {
                path: "official",
                element: <OfficialResultsLayout />,
                children: [
                  { index: true, element: <Navigate to="candidates/counties" replace /> },
                  { path: "candidates/centers", element: <OfficialCandidateCentersPage /> },
                  { path: "candidates/districts", element: <OfficialCandidateDistrictsPage /> },
                  { path: "candidates/counties", element: <OfficialCandidateCountiesPage /> },
                  { path: "candidates/election", element: <OfficialCandidateElectionPage /> },
                  { path: "totals/centers", element: <OfficialTotalsCentersPage /> },
                  { path: "totals/districts", element: <OfficialTotalsDistrictsPage /> },
                  { path: "totals/counties", element: <OfficialTotalsCountiesPage /> },
                  { path: "totals/election", element: <OfficialTotalsElectionPage /> },
                  { path: "geo", element: <NecResultGeoPage /> },
                ],
              },

              { path: "compare", element: <CompareCountyCandidatesPage /> },
            ],
          },
        ],
      },

      // Operations
      {
        path: "operations",
        element: <OperationsLayout />,
        children: [
          { index: true, element: <SubmissionQueuePage /> },
          { path: "submissions", element: <SubmissionQueuePage /> },
          { path: "observer-reports", element: <ObserverReportsPage /> },
          { path: "notifications", element: <NotificationsPage /> },
          { path: "tally-sheets", element: <TallySheetsPage /> },
        ],
      },

      // Geography
      {
        path: "geography-registry",
        element: <GeoRegistryLayout />,
        children: [
          { index: true, element: <CountiesPage /> },
          { path: "counties", element: <CountiesPage /> },
          { path: "districts", element: <DistrictsPage /> },
          { path: "polling-centers", element: <PollingCentersPage /> },
          { path: "polling-places", element: <PollingPlacesPage /> },
          { path: "import-batches", element: <ImportBatchesPage /> },
          { path: "voter-staging", element: <VoterStagingPage /> },
          { path: "voter-registry", element: <VoterRegistryPage /> },
          { path: "public-roll", element: <PublicRollPage /> },
        ],
      },

      // Reports
      {
        path: "reports",
        element: <ReportsLayout />,
        children: [
          { index: true, element: <ReportRequestsPage /> },
          { path: "requests", element: <ReportRequestsPage /> },
          { path: "files", element: <ReportFilesPage /> },
        ],
      },

      // Admin & Security
      {
        path: "admin-security",
        element: <AdminSecurityLayout />,
        children: [
          { index: true, element: <AdminSecurityIndexRedirect /> },
          { path: "organizations", element: <OrganizationsPage /> },
          { path: "memberships", element: <MembershipsPage /> },
          { path: "org-settings", element: <OrgSettingsPage /> },
          { path: "users", element: <UsersPage /> },
          { path: "roles", element: <RolesPage /> },
          { path: "mfa", element: <MfaPage /> },
          { path: "sessions", element: <SessionsPage /> },
          { path: "signing-keys", element: <SigningKeysPage /> },
          { path: "audit-logs", element: <AuditLogsPage /> },
          { path: "audit-ledger", element: <AuditLedgerPage /> },
          { path: "file-uploads", element: <FileUploadsPage /> },
        ],
      },
    ],
  },
]);



// import { createBrowserRouter, Navigate } from "react-router-dom";
// import AppLayout from "../layout/AppLayout";

// // ✅ ADD
// import RootRedirect from "./RootRedirect";
// import LoginPage from "../../pages/auth/LoginPage";
// import { RequireAuth } from "../../shared/routes/RequireGuards";
// import SystemDashboard from "../../pages/dashboard/panels/SystemDashboard";
// import NecDashboard from "../../pages/dashboard/panels/NecDashboard";

// // ✅ ADD: store + tenant dashboard
// import { useAuthStore } from "../../shared/store/authStore";
// import OrgDashboard from "../../pages/dashboard/panels/OrgDashboard"; // your tenant dashboard component

// // Elections
// import ElectionsListPage from "../../pages/elections/ElectionsListPage";
// import ElectionWorkspaceLayout from "../../pages/elections/workspace/ElectionWorkspaceLayout";

// import OverviewTab from "../../pages/elections/workspace/tabs/overview/OverviewTab";
// import SetupTab from "../../pages/elections/workspace/tabs/setup/SetupTab";
// import AllocationTab from "../../pages/elections/workspace/tabs/allocation/AllocationTab";
// import SubmissionsTab from "../../pages/elections/workspace/tabs/submissions/SubmissionsTab";
// import IntegrityTab from "../../pages/elections/workspace/tabs/integrity/IntegrityTab";
// import NecWorkflowTab from "../../pages/elections/workspace/tabs/nec-workflow/shared/NecWorkflowTab";
// import NecResultTab from "../../pages/elections/workspace/tabs/nec-workflow/NecResultTab";
// import NecResultStagingPage from "../../pages/elections/workspace/tabs/nec-workflow/NecResultStagingPage";
// import NecResultHistoryPage from "../../pages/elections/workspace/tabs/nec-workflow/NecResultHistoryPage";


// // For Election Results
// import ResultsTab from "../../pages/elections/workspace/tabs/results/shared/ResultsTab";
// import VoteTallyPage from "../../pages/elections/workspace/tabs/results/VoteTallyPage";
// import VoteSubmissionContestPage from "../../pages/elections/workspace/tabs//results/VoteSubmissionContestPage";


// // import VoteTallyPage from "../../pages/elections/workspace/tabs/results/VoteTallyPage";
// // import CandidateCountyStatsParty from "../../pages/elections/workspace/tabs/results/CandidateCountyStatsParty";
// // import CandidateCountyStatsOfficial from "../../pages/elections/workspace/tabs/results/CandidateCountyStatsOfficial";
// // import CandidateCountyCompare from "../../pages/elections/workspace/tabs/results/CandidateCountyCompare";


// // Party layout pages (from the template zip)
// import PartyResultsLayout from "../../pages/elections/workspace/tabs/results/shared/PartyResultsLayout";
// import PartyCandidateCentersPage from "../../pages/elections/workspace/tabs/results/party/PartyCandidateCentersPage";
// import PartyCandidateDistrictsPage from "../../pages/elections/workspace/tabs/results/party/PartyCandidateDistrictsPage";
// import PartyCandidateCountiesPage from "../../pages/elections/workspace/tabs/results/party/PartyCandidateCountiesPage";
// import PartyCandidateElectionPage from "../../pages/elections/workspace/tabs/results/party/PartyCandidateElectionPage";

// import PartyTotalsCentersPage from "../../pages/elections/workspace/tabs/results/party/PartyTotalsCentersPage";
// import PartyTotalsDistrictsPage from "../../pages/elections/workspace/tabs/results/party/PartyTotalsDistrictsPage";
// import PartyTotalsCountiesPage from "../../pages/elections/workspace/tabs/results/party/PartyTotalsCountiesPage";
// import PartyTotalsElectionPage from "../../pages/elections/workspace/tabs/results/party/PartyTotalsElectionPage";

// // Official layout pages
// import OfficialResultsLayout from "../../pages/elections/workspace/tabs/results/shared/OfficialResultsLayout";
// import OfficialCandidateCentersPage from "../../pages/elections/workspace/tabs/results/official/OfficialCandidateCentersPage";
// import OfficialCandidateDistrictsPage from "../../pages/elections/workspace/tabs/results/official/OfficialCandidateDistrictsPage";
// import OfficialCandidateCountiesPage from "../../pages/elections/workspace/tabs/results/official/OfficialCandidateCountiesPage";
// import OfficialCandidateElectionPage from "../../pages/elections/workspace/tabs/results/official/OfficialCandidateElectionPage";

// import OfficialTotalsCentersPage from "../../pages/elections/workspace/tabs/results/official/OfficialTotalsCentersPage";
// import OfficialTotalsDistrictsPage from "../../pages/elections/workspace/tabs/results/official/OfficialTotalsDistrictsPage";
// import OfficialTotalsCountiesPage from "../../pages/elections/workspace/tabs/results/official/OfficialTotalsCountiesPage";
// import OfficialTotalsElectionPage from "../../pages/elections/workspace/tabs/results/official/OfficialTotalsElectionPage";
// import NecResultGeoPage from "../../pages/elections/workspace/tabs/results/official/NecResultGeoPage";

// // Compare layout
// import CompareCountyCandidatesPage from "../../pages/elections/workspace/tabs/results/compare/CompareCountyCandidatesPage";



// // Operations
// import OperationsLayout from "../../pages/operations/OperationsLayout";
// import SubmissionQueuePage from "../../pages/operations/SubmissionQueuePage";
// import ObserverReportsPage from "../../pages/operations/ObserverReportsPage";
// import NotificationsPage from "../../pages/operations/NotificationsPage";
// import TallySheetsPage from "../../pages/operations/TallySheetsPage";


// // Geography
// import GeoRegistryLayout from "../../pages/geo-registry/GeoRegistryLayout";
// import CountiesPage from "../../pages/geo-registry/CountiesPage";
// import DistrictsPage from "../../pages/geo-registry/DistrictsPage";
// import PollingCentersPage from "../../pages/geo-registry/PollingCentersPage";
// import PollingPlacesPage from "../../pages/geo-registry/PollingPlacesPage";

// import ImportBatchesPage from "../../pages/geo-registry/registry/ImportBatchesPage";
// import VoterStagingPage from "../../pages/geo-registry/registry/VoterStagingPage";
// import VoterRegistryPage from "../../pages/geo-registry/registry/VoterRegistryPage";
// import PublicRollPage from "../../pages/geo-registry/registry/PublicRollPage";

// // Reports
// import ReportsLayout from "../../pages/reports/ReportsLayout";
// import ReportRequestsPage from "../../pages/reports/ReportRequestsPage";
// import ReportFilesPage from "../../pages/reports/ReportFilesPage";

// // Admin & Security
// import AdminSecurityLayout from "../../pages/admin-security/AdminSecurityLayout";

// import OrganizationsPage from "../../pages/admin-security/tenant/OrganizationsPage";
// import MembershipsPage from "../../pages/admin-security/tenant/MembershipsPage";
// import OrgSettingsPage from "../../pages/admin-security/tenant/OrgSettingsPage";

// import UsersPage from "../../pages/admin-security/security/UsersPage";
// import RolesPage from "../../pages/admin-security/security/RolesPage";
// import MfaPage from "../../pages/admin-security/security/MfaPage";
// import SessionsPage from "../../pages/admin-security/security/SessionsPage";
// import SigningKeysPage from "../../pages/admin-security/security/SigningKeysPage";

// import AuditLogsPage from "../../pages/admin-security/oversight/AuditLogsPage";
// import AuditLedgerPage from "../../pages/admin-security/oversight/AuditLedgerPage";
// import FileUploadsPage from "../../pages/admin-security/oversight/FileUploadsPage";


// // ✅ ADD: Smart dashboard entry
// function DashboardEntry() {
//   const mode = useAuthStore((s) => s.dashboardMode);

//   if (mode === "SYSTEM") return <Navigate to="/dashboard/system" replace />;
//   if (mode === "NEC") return <Navigate to="/dashboard/nec" replace />;

//   return <OrgDashboard />; // TENANT
// }

// // ✅ NEW: Admin-security default route redirect
// function AdminSecurityIndexRedirect() {
//   const mode = useAuthStore((s) => s.dashboardMode);

//   // SYSTEM: organizations is allowed + visible
//   if (mode === "SYSTEM") {
//     return <Navigate to="/admin-security/organizations" replace />;
//   }

//   // NEC/TENANT: organizations hidden; default to memberships
//   return <Navigate to="/admin-security/memberships" replace />;
// }

// export const router = createBrowserRouter([
//   // ✅ root redirect (loads login first when not authenticated)
//   { path: "/", element: <RootRedirect /> },

//   // ✅ public login route
//   { path: "/login", element: <LoginPage /> },

//   // ✅ protected app
//   {
//     path: "/",
//     element: (
//       <RequireAuth>
//         <AppLayout />
//       </RequireAuth>
//     ),
//     children: [
//       // ✅ Default: also smart-route
//       { index: true, element: <DashboardEntry /> },

//       // ✅ Dashboard: smart entry (prevents system admin landing on tenant dashboard)
//       { path: "dashboard", element: <DashboardEntry /> },
//       // ✅ System dashboard route
//       { path: "dashboard/system", element: <SystemDashboard /> },
//       // ✅ NEC dashboard route
//       { path: "dashboard/nec", element: <NecDashboard /> }, // ✅ NEW

//       // Elections Hub + Workspace
//       { path: "elections", element: <ElectionsListPage /> },

      
//       // New election route / path
//       {
//         path: "elections/:electionId",
//         element: <ElectionWorkspaceLayout />,
//         children: [
//           { index: true, element: <OverviewTab /> },
//           { path: "overview", element: <OverviewTab /> },
//           { path: "setup", element: <SetupTab /> },
//           { path: "allocation", element: <AllocationTab /> },
//           { path: "submissions", element: <SubmissionsTab /> },
//           { path: "integrity", element: <IntegrityTab /> },
//           // { path: "nec-workflow", element: <NecWorkflowTab /> },

//           //  New Workflow
//           {
//             path: "nec-workflow",
//             element: <NecWorkflowTab />,
//             children: [
//               { index: true, element: <Navigate to="nec-result" replace /> },

//               { path: "nec-result", element: <NecResultTab /> },
//               { path: "staging", element: <NecResultStagingPage /> },
//               { path: "history", element: <NecResultHistoryPage /> },

//               // ✅ reuse existing Geo page (no duplicate)
//               { path: "geo", element: <NecResultGeoPage /> },
//             ],
//           },

//           // results
//           {
//             path: "results",
//             element: <ResultsTab />,
//             children: [
              
//               // ✅ when clicking Results, go to submission contest (default first tab)
//               { index: true, element: <Navigate to="submission-contest" replace /> },

//               // ✅ when clicking Results, go to tally
//               // { index: true, element: <Navigate to="tally" replace /> },

//               { path: "submission-contest", element: <VoteSubmissionContestPage /> },

//               { path: "tally", element: <VoteTallyPage /> },

//               // ✅ PARTY (tenant submissions rollup views)
//               {
//                 path: "party",
//                 element: <PartyResultsLayout />,
//                 children: [
//                   { index: true, element: <Navigate to="candidates/counties" replace /> },

//                   // candidate stats party
//                   { path: "candidates/centers", element: <PartyCandidateCentersPage /> },
//                   { path: "candidates/districts", element: <PartyCandidateDistrictsPage /> },
//                   { path: "candidates/counties", element: <PartyCandidateCountiesPage /> },
//                   { path: "candidates/election", element: <PartyCandidateElectionPage /> },

//                   // global totals party
//                   { path: "totals/centers", element: <PartyTotalsCentersPage /> },
//                   { path: "totals/districts", element: <PartyTotalsDistrictsPage /> },
//                   { path: "totals/counties", element: <PartyTotalsCountiesPage /> },
//                   { path: "totals/election", element: <PartyTotalsElectionPage /> },
//                 ],
//               },

//               // ✅ OFFICIAL (NEC published views)
//               {
//                 path: "official",
//                 element: <OfficialResultsLayout />,
//                 children: [
//                   { index: true, element: <Navigate to="candidates/counties" replace /> },

//                   // candidate stats official
//                   { path: "candidates/centers", element: <OfficialCandidateCentersPage /> },
//                   { path: "candidates/districts", element: <OfficialCandidateDistrictsPage /> },
//                   { path: "candidates/counties", element: <OfficialCandidateCountiesPage /> },
//                   { path: "candidates/election", element: <OfficialCandidateElectionPage /> },

//                   // global totals official
//                   { path: "totals/centers", element: <OfficialTotalsCentersPage /> },
//                   { path: "totals/districts", element: <OfficialTotalsDistrictsPage /> },
//                   { path: "totals/counties", element: <OfficialTotalsCountiesPage /> },
//                   { path: "totals/election", element: <OfficialTotalsElectionPage /> },
//                   { path: "geo", element: <NecResultGeoPage /> },
//                 ],
//               },

//               // ✅ COMPARE (party vs official)
//               {
//                 path: "compare",
//                 element: <CompareCountyCandidatesPage />,
//               },

            
//             ],
//           },
//         ],
//       },


//       // Operations
//       {
//         path: "operations",
//         element: <OperationsLayout />,
//         children: [
//           { index: true, element: <SubmissionQueuePage /> },
//           { path: "submissions", element: <SubmissionQueuePage /> },
//           { path: "observer-reports", element: <ObserverReportsPage /> },
//           { path: "notifications", element: <NotificationsPage /> },
//           { path: "tally-sheets", element: <TallySheetsPage /> },
//         ],
//       },

//       // Geography
//       {
//         path: "geography-registry",
//         element: <GeoRegistryLayout />,
//         children: [
//           { index: true, element: <CountiesPage /> },
//           { path: "counties", element: <CountiesPage /> },
//           { path: "districts", element: <DistrictsPage /> },
//           { path: "polling-centers", element: <PollingCentersPage /> },
//           { path: "polling-places", element: <PollingPlacesPage /> },

//           { path: "import-batches", element: <ImportBatchesPage /> },
//           { path: "voter-staging", element: <VoterStagingPage /> },
//           { path: "voter-registry", element: <VoterRegistryPage /> },
//           { path: "public-roll", element: <PublicRollPage /> },
//         ],
//       },

//       // Reports
//       {
//         path: "reports",
//         element: <ReportsLayout />,
//         children: [
//           { index: true, element: <ReportRequestsPage /> },
//           { path: "requests", element: <ReportRequestsPage /> },
//           { path: "files", element: <ReportFilesPage /> },
//         ],
//       },

//       // Admin & Security
//       {
//         path: "admin-security",
//         element: <AdminSecurityLayout />,
//         children: [
//           { index: true, element: <AdminSecurityIndexRedirect /> },

//           { path: "organizations", element: <OrganizationsPage /> },
//           { path: "memberships", element: <MembershipsPage /> },
//           { path: "org-settings", element: <OrgSettingsPage /> },

//           { path: "users", element: <UsersPage /> },
//           { path: "roles", element: <RolesPage /> },
//           { path: "mfa", element: <MfaPage /> },
//           { path: "sessions", element: <SessionsPage /> },
//           { path: "signing-keys", element: <SigningKeysPage /> },

//           { path: "audit-logs", element: <AuditLogsPage /> },
//           { path: "audit-ledger", element: <AuditLedgerPage /> },
//           { path: "file-uploads", element: <FileUploadsPage /> },
//         ],
//       },
//     ],
//   },
// ]);





// // src/app/routes/index.tsx

// import { createBrowserRouter, Navigate } from "react-router-dom";
// import AppLayout from "../layout/AppLayout";

// // ✅ ADD
// import RootRedirect from "./RootRedirect";
// import LoginPage from "../../pages/auth/LoginPage";
// import { RequireAuth } from "../../shared/routes/RequireGuards";
// import SystemDashboard from "../../pages/dashboard/panels/SystemDashboard";
// import NecDashboard from "../../pages/dashboard/panels/NecDashboard";

// // ✅ ADD: store + tenant dashboard
// import { useAuthStore } from "../../shared/store/authStore";
// import OrgDashboard from "../../pages/dashboard/panels/OrgDashboard";

// // ✅ Shared graphical result dashboards (used by TENANT + NEC)
// import OrgLocalDashboard from "../../pages/dashboard/results/OrgLocalDashboard";
// import OrgOfficialDashboard from "../../pages/dashboard/results/OrgOfficialDashboard";

// // Elections
// import ElectionsListPage from "../../pages/elections/ElectionsListPage";
// import ElectionWorkspaceLayout from "../../pages/elections/workspace/ElectionWorkspaceLayout";

// import OverviewTab from "../../pages/elections/workspace/tabs/overview/OverviewTab";
// import SetupTab from "../../pages/elections/workspace/tabs/setup/SetupTab";
// import AllocationTab from "../../pages/elections/workspace/tabs/allocation/AllocationTab";
// import SubmissionsTab from "../../pages/elections/workspace/tabs/submissions/SubmissionsTab";
// import IntegrityTab from "../../pages/elections/workspace/tabs/integrity/IntegrityTab";
// import NecWorkflowTab from "../../pages/elections/workspace/tabs/nec-workflow/shared/NecWorkflowTab";
// import NecResultTab from "../../pages/elections/workspace/tabs/nec-workflow/NecResultTab";
// import NecResultStagingPage from "../../pages/elections/workspace/tabs/nec-workflow/NecResultStagingPage";
// import NecResultHistoryPage from "../../pages/elections/workspace/tabs/nec-workflow/NecResultHistoryPage";

// // For Election Results
// import ResultsTab from "../../pages/elections/workspace/tabs/results/shared/ResultsTab";
// import VoteTallyPage from "../../pages/elections/workspace/tabs/results/VoteTallyPage";
// import VoteSubmissionContestPage from "../../pages/elections/workspace/tabs//results/VoteSubmissionContestPage";

// // Party layout pages
// import PartyResultsLayout from "../../pages/elections/workspace/tabs/results/shared/PartyResultsLayout";
// import PartyCandidateCentersPage from "../../pages/elections/workspace/tabs/results/party/PartyCandidateCentersPage";
// import PartyCandidateDistrictsPage from "../../pages/elections/workspace/tabs/results/party/PartyCandidateDistrictsPage";
// import PartyCandidateCountiesPage from "../../pages/elections/workspace/tabs/results/party/PartyCandidateCountiesPage";
// import PartyCandidateElectionPage from "../../pages/elections/workspace/tabs/results/party/PartyCandidateElectionPage";

// import PartyTotalsCentersPage from "../../pages/elections/workspace/tabs/results/party/PartyTotalsCentersPage";
// import PartyTotalsDistrictsPage from "../../pages/elections/workspace/tabs/results/party/PartyTotalsDistrictsPage";
// import PartyTotalsCountiesPage from "../../pages/elections/workspace/tabs/results/party/PartyTotalsCountiesPage";
// import PartyTotalsElectionPage from "../../pages/elections/workspace/tabs/results/party/PartyTotalsElectionPage";

// // Official layout pages
// import OfficialResultsLayout from "../../pages/elections/workspace/tabs/results/shared/OfficialResultsLayout";
// import OfficialCandidateCentersPage from "../../pages/elections/workspace/tabs/results/official/OfficialCandidateCentersPage";
// import OfficialCandidateDistrictsPage from "../../pages/elections/workspace/tabs/results/official/OfficialCandidateDistrictsPage";
// import OfficialCandidateCountiesPage from "../../pages/elections/workspace/tabs/results/official/OfficialCandidateCountiesPage";
// import OfficialCandidateElectionPage from "../../pages/elections/workspace/tabs/results/official/OfficialCandidateElectionPage";

// import OfficialTotalsCentersPage from "../../pages/elections/workspace/tabs/results/official/OfficialTotalsCentersPage";
// import OfficialTotalsDistrictsPage from "../../pages/elections/workspace/tabs/results/official/OfficialTotalsDistrictsPage";
// import OfficialTotalsCountiesPage from "../../pages/elections/workspace/tabs/results/official/OfficialTotalsCountiesPage";
// import OfficialTotalsElectionPage from "../../pages/elections/workspace/tabs/results/official/OfficialTotalsElectionPage";
// import NecResultGeoPage from "../../pages/elections/workspace/tabs/results/official/NecResultGeoPage";

// // Compare layout
// import CompareCountyCandidatesPage from "../../pages/elections/workspace/tabs/results/compare/CompareCountyCandidatesPage";

// // Operations
// import OperationsLayout from "../../pages/operations/OperationsLayout";
// import SubmissionQueuePage from "../../pages/operations/SubmissionQueuePage";
// import ObserverReportsPage from "../../pages/operations/ObserverReportsPage";
// import NotificationsPage from "../../pages/operations/NotificationsPage";
// import TallySheetsPage from "../../pages/operations/TallySheetsPage";

// // Geography
// import GeoRegistryLayout from "../../pages/geo-registry/GeoRegistryLayout";
// import CountiesPage from "../../pages/geo-registry/CountiesPage";
// import DistrictsPage from "../../pages/geo-registry/DistrictsPage";
// import PollingCentersPage from "../../pages/geo-registry/PollingCentersPage";
// import PollingPlacesPage from "../../pages/geo-registry/PollingPlacesPage";

// import ImportBatchesPage from "../../pages/geo-registry/registry/ImportBatchesPage";
// import VoterStagingPage from "../../pages/geo-registry/registry/VoterStagingPage";
// import VoterRegistryPage from "../../pages/geo-registry/registry/VoterRegistryPage";
// import PublicRollPage from "../../pages/geo-registry/registry/PublicRollPage";

// // Reports
// import ReportsLayout from "../../pages/reports/ReportsLayout";
// import ReportRequestsPage from "../../pages/reports/ReportRequestsPage";
// import ReportFilesPage from "../../pages/reports/ReportFilesPage";

// // Admin & Security
// import AdminSecurityLayout from "../../pages/admin-security/AdminSecurityLayout";

// import OrganizationsPage from "../../pages/admin-security/tenant/OrganizationsPage";
// import MembershipsPage from "../../pages/admin-security/tenant/MembershipsPage";
// import OrgSettingsPage from "../../pages/admin-security/tenant/OrgSettingsPage";

// import UsersPage from "../../pages/admin-security/security/UsersPage";
// import RolesPage from "../../pages/admin-security/security/RolesPage";
// import MfaPage from "../../pages/admin-security/security/MfaPage";
// import SessionsPage from "../../pages/admin-security/security/SessionsPage";
// import SigningKeysPage from "../../pages/admin-security/security/SigningKeysPage";

// import AuditLogsPage from "../../pages/admin-security/oversight/AuditLogsPage";
// import AuditLedgerPage from "../../pages/admin-security/oversight/AuditLedgerPage";
// import FileUploadsPage from "../../pages/admin-security/oversight/FileUploadsPage";

// // ✅ ADD: Smart dashboard entry
// function DashboardEntry() {
//   const mode = useAuthStore((s: any) => s.dashboardMode);

//   if (mode === "SYSTEM") return <Navigate to="/dashboard/system" replace />;
//   if (mode === "NEC") return <Navigate to="/dashboard/nec" replace />;

//   return <OrgDashboard />; // TENANT
// }

// // ✅ NEW: Admin-security default route redirect
// function AdminSecurityIndexRedirect() {
//   const mode = useAuthStore((s: any) => s.dashboardMode);

//   // SYSTEM: organizations is allowed + visible
//   if (mode === "SYSTEM") {
//     return <Navigate to="/admin-security/organizations" replace />;
//   }

//   // NEC/TENANT: organizations hidden; default to memberships
//   return <Navigate to="/admin-security/memberships" replace />;
// }

// export const router = createBrowserRouter([
//   // ✅ root redirect (loads login first when not authenticated)
//   { path: "/", element: <RootRedirect /> },

//   // ✅ public login route
//   { path: "/login", element: <LoginPage /> },

//   // ✅ protected app
//   {
//     path: "/",
//     element: (
//       <RequireAuth>
//         <AppLayout />
//       </RequireAuth>
//     ),
//     children: [
//       // ✅ Default: also smart-route
//       { index: true, element: <DashboardEntry /> },

//       // ✅ Dashboard: smart entry (prevents system admin landing on tenant dashboard)
//       { path: "dashboard", element: <DashboardEntry /> },

//       /* ------------------------ DASHBOARD MODES ------------------------ */

//       // ✅ Shared graphical result dashboards (TENANT + NEC)
//       { path: "dashboard/local", element: <OrgLocalDashboard /> },
//       { path: "dashboard/official", element: <OrgOfficialDashboard /> },

//       // ✅ System dashboard route (SYSTEM has Home only)
//       { path: "dashboard/system", element: <SystemDashboard /> },

//       // ✅ If someone manually navigates to system/local|official, send them back home
//       { path: "dashboard/system/local", element: <Navigate to="/dashboard/system" replace /> },
//       { path: "dashboard/system/official", element: <Navigate to="/dashboard/system" replace /> },

//       // ✅ NEC dashboard route (special tenant Home)
//       { path: "dashboard/nec", element: <NecDashboard /> },

//       // ✅ NEC local/official should NOT render NecDashboard (it looks like “no navigation”)
//       // ✅ redirect to the shared dashboards
//       { path: "dashboard/nec/local", element: <Navigate to="/dashboard/local" replace /> },
//       { path: "dashboard/nec/official", element: <Navigate to="/dashboard/official" replace /> },

//       /* ------------------------ ELECTIONS ------------------------ */

//       // Elections Hub + Workspace
//       { path: "elections", element: <ElectionsListPage /> },

//       // Election workspace
//       {
//         path: "elections/:electionId",
//         element: <ElectionWorkspaceLayout />,
//         children: [
//           { index: true, element: <OverviewTab /> },
//           { path: "overview", element: <OverviewTab /> },
//           { path: "setup", element: <SetupTab /> },
//           { path: "allocation", element: <AllocationTab /> },
//           { path: "submissions", element: <SubmissionsTab /> },
//           { path: "integrity", element: <IntegrityTab /> },

//           // Workflow
//           {
//             path: "nec-workflow",
//             element: <NecWorkflowTab />,
//             children: [
//               { index: true, element: <Navigate to="nec-result" replace /> },

//               { path: "nec-result", element: <NecResultTab /> },
//               { path: "staging", element: <NecResultStagingPage /> },
//               { path: "history", element: <NecResultHistoryPage /> },

//               // ✅ reuse existing Geo page (no duplicate)
//               { path: "geo", element: <NecResultGeoPage /> },
//             ],
//           },

//           // Results
//           {
//             path: "results",
//             element: <ResultsTab />,
//             children: [
//               { index: true, element: <Navigate to="submission-contest" replace /> },

//               { path: "submission-contest", element: <VoteSubmissionContestPage /> },
//               { path: "tally", element: <VoteTallyPage /> },

//               // PARTY
//               {
//                 path: "party",
//                 element: <PartyResultsLayout />,
//                 children: [
//                   { index: true, element: <Navigate to="candidates/counties" replace /> },

//                   { path: "candidates/centers", element: <PartyCandidateCentersPage /> },
//                   { path: "candidates/districts", element: <PartyCandidateDistrictsPage /> },
//                   { path: "candidates/counties", element: <PartyCandidateCountiesPage /> },
//                   { path: "candidates/election", element: <PartyCandidateElectionPage /> },

//                   { path: "totals/centers", element: <PartyTotalsCentersPage /> },
//                   { path: "totals/districts", element: <PartyTotalsDistrictsPage /> },
//                   { path: "totals/counties", element: <PartyTotalsCountiesPage /> },
//                   { path: "totals/election", element: <PartyTotalsElectionPage /> },
//                 ],
//               },

//               // OFFICIAL
//               {
//                 path: "official",
//                 element: <OfficialResultsLayout />,
//                 children: [
//                   { index: true, element: <Navigate to="candidates/counties" replace /> },

//                   { path: "candidates/centers", element: <OfficialCandidateCentersPage /> },
//                   { path: "candidates/districts", element: <OfficialCandidateDistrictsPage /> },
//                   { path: "candidates/counties", element: <OfficialCandidateCountiesPage /> },
//                   { path: "candidates/election", element: <OfficialCandidateElectionPage /> },

//                   { path: "totals/centers", element: <OfficialTotalsCentersPage /> },
//                   { path: "totals/districts", element: <OfficialTotalsDistrictsPage /> },
//                   { path: "totals/counties", element: <OfficialTotalsCountiesPage /> },
//                   { path: "totals/election", element: <OfficialTotalsElectionPage /> },
//                   { path: "geo", element: <NecResultGeoPage /> },
//                 ],
//               },

//               // COMPARE
//               {
//                 path: "compare",
//                 element: <CompareCountyCandidatesPage />,
//               },
//             ],
//           },
//         ],
//       },

//       /* ------------------------ OPERATIONS ------------------------ */

//       {
//         path: "operations",
//         element: <OperationsLayout />,
//         children: [
//           { index: true, element: <SubmissionQueuePage /> },
//           { path: "submissions", element: <SubmissionQueuePage /> },
//           { path: "observer-reports", element: <ObserverReportsPage /> },
//           { path: "notifications", element: <NotificationsPage /> },
//           { path: "tally-sheets", element: <TallySheetsPage /> },
//         ],
//       },

//       /* ------------------------ GEOGRAPHY ------------------------ */

//       {
//         path: "geography-registry",
//         element: <GeoRegistryLayout />,
//         children: [
//           { index: true, element: <CountiesPage /> },
//           { path: "counties", element: <CountiesPage /> },
//           { path: "districts", element: <DistrictsPage /> },
//           { path: "polling-centers", element: <PollingCentersPage /> },
//           { path: "polling-places", element: <PollingPlacesPage /> },

//           { path: "import-batches", element: <ImportBatchesPage /> },
//           { path: "voter-staging", element: <VoterStagingPage /> },
//           { path: "voter-registry", element: <VoterRegistryPage /> },
//           { path: "public-roll", element: <PublicRollPage /> },
//         ],
//       },

//       /* ------------------------ REPORTS ------------------------ */

//       {
//         path: "reports",
//         element: <ReportsLayout />,
//         children: [
//           { index: true, element: <ReportRequestsPage /> },
//           { path: "requests", element: <ReportRequestsPage /> },
//           { path: "files", element: <ReportFilesPage /> },
//         ],
//       },

//       /* ------------------------ ADMIN & SECURITY ------------------------ */

//       {
//         path: "admin-security",
//         element: <AdminSecurityLayout />,
//         children: [
//           { index: true, element: <AdminSecurityIndexRedirect /> },

//           { path: "organizations", element: <OrganizationsPage /> },
//           { path: "memberships", element: <MembershipsPage /> },
//           { path: "org-settings", element: <OrgSettingsPage /> },

//           { path: "users", element: <UsersPage /> },
//           { path: "roles", element: <RolesPage /> },
//           { path: "mfa", element: <MfaPage /> },
//           { path: "sessions", element: <SessionsPage /> },
//           { path: "signing-keys", element: <SigningKeysPage /> },

//           { path: "audit-logs", element: <AuditLogsPage /> },
//           { path: "audit-ledger", element: <AuditLedgerPage /> },
//           { path: "file-uploads", element: <FileUploadsPage /> },
//         ],
//       },
//     ],
//   },
// ]);
