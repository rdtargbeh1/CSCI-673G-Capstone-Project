// src/app/routes/index.tsx

import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "../layout/AppLayout";

// ✅ ADD
import RootRedirect from "./RootRedirect";
import LoginPage from "../../pages/auth/LoginPage";
import { RequireAuth } from "../../shared/routes/RequireGuards";
import SystemDashboard from "../../pages/dashboard/panels/SystemDashboard";
import NecDashboard from "../../pages/dashboard/panels/NecDashboard";

// ✅ ADD: store + tenant dashboard
import { useAuthStore } from "../../shared/store/authStore";
import OrgDashboard from "../../pages/dashboard/panels/OrgDashboard"; // your tenant dashboard component

// Elections
import ElectionsListPage from "../../pages/elections/ElectionsListPage";
import ElectionWorkspaceLayout from "../../pages/elections/workspace/ElectionWorkspaceLayout";

import OverviewTab from "../../pages/elections/workspace/tabs/overview/OverviewTab";
import SetupTab from "../../pages/elections/workspace/tabs/setup/SetupTab";
import AllocationTab from "../../pages/elections/workspace/tabs/allocation/AllocationTab";
import SubmissionsTab from "../../pages/elections/workspace/tabs/submissions/SubmissionsTab";
import ResultsTab from "../../pages/elections/workspace/tabs/results/ResultsTab";
import IntegrityTab from "../../pages/elections/workspace/tabs/integrity/IntegrityTab";
import NecWorkflowTab from "../../pages/elections/workspace/tabs/nec-workflow/NecWorkflowTab";

// Operations
import OperationsLayout from "../../pages/operations/OperationsLayout";
import SubmissionQueuePage from "../../pages/operations/SubmissionQueuePage";
import ObserverReportsPage from "../../pages/operations/ObserverReportsPage";
import NotificationsPage from "../../pages/operations/NotificationsPage";

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

// ✅ ADD: Smart dashboard entry
function DashboardEntry() {
  const mode = useAuthStore((s) => s.dashboardMode);

  if (mode === "SYSTEM") return <Navigate to="/dashboard/system" replace />;
  if (mode === "NEC") return <Navigate to="/dashboard/nec" replace />;

  return <OrgDashboard />; // TENANT
}

// ✅ NEW: Admin-security default route redirect
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
      // ✅ Default: also smart-route
      { index: true, element: <DashboardEntry /> },

      // ✅ Dashboard: smart entry (prevents system admin landing on tenant dashboard)
      { path: "dashboard", element: <DashboardEntry /> },
      // ✅ System dashboard route
      { path: "dashboard/system", element: <SystemDashboard /> },
      // ✅ NEC dashboard route
      { path: "dashboard/nec", element: <NecDashboard /> }, // ✅ NEW

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
          { path: "results", element: <ResultsTab /> },
          { path: "integrity", element: <IntegrityTab /> },
          { path: "nec-workflow", element: <NecWorkflowTab /> },
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
