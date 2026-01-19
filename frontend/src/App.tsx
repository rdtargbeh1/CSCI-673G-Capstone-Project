// src/App.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import {
  RequireAuth,
  RequireOrg,
  RequireElectionAdmin,
} from "./shared/routes/RequireGuards";
import { RequireSystemAdmin } from "./shared/routes/RequireGuards";
import AppShell from "./shared/layout/AppShell";

// import { RequireElectionAdmin } from "../shared/guards/RequireElectionAdmin";

import LoginPage from "./pages/loginPage";
import SelectOrgPage from "./pages/SelectOrgPage";
import DashboardPage from "./pages/DashboardPage";
import GeographyPage from "./pages/GeographyPage";
import HealthCheckPage from "./pages/HealthCheckPage";
import VoteSubmissionsPage from "./pages/VoteSubmissionsPage";
import ObserverReportsPage from "./pages/ObserverReportsPage";
import ResultsOverviewPage from "./pages/ResultsOverviewPage";
import CreateSubmissionForm from "./pages/CreateSubmissionForm";
import UserManagementPage from "./pages/UserManagementPage";
import UserProfilePage from "./pages/UserProfilePage";
import OrganizationPage from "./pages/OrganizationPage";
import OrgMembershipPage from "./pages/OrgMembershipPage";
import OrgSettingsPage from "./pages/OrgSettingsPage";
import ElectionManagementPage from "./pages/ElectionManagementPage";
import ElectionCandidatesPage from "./pages/elections/ElectionCandidatesPage";

const App: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/select-org" element={<SelectOrgPage />} />
      <Route path="/health-test" element={<HealthCheckPage />} />

      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Protected + shell-wrapped routes */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <RequireOrg>
              {/* <RequireEnabledMembership> */}
              <AppShell>
                <DashboardPage />
              </AppShell>
              {/* </RequireEnabledMembership> */}
            </RequireOrg>
          </RequireAuth>
        }
      />

      <Route
        path="/geography"
        element={
          <RequireAuth>
            <RequireOrg>
              <AppShell>
                <GeographyPage />
              </AppShell>
            </RequireOrg>
          </RequireAuth>
        }
      />

      <Route
        path="/vote-submissions"
        element={
          <RequireAuth>
            <RequireOrg>
              <AppShell>
                <VoteSubmissionsPage />
              </AppShell>
            </RequireOrg>
          </RequireAuth>
        }
      />

      <Route
        path="/observer-reports"
        element={
          <RequireAuth>
            <RequireOrg>
              <AppShell>
                <ObserverReportsPage />
              </AppShell>
            </RequireOrg>
          </RequireAuth>
        }
      />

      <Route
        path="/results"
        element={
          <RequireAuth>
            <RequireOrg>
              <AppShell>
                <ResultsOverviewPage />
              </AppShell>
            </RequireOrg>
          </RequireAuth>
        }
      />

      {/* Route for User Management */}
      <Route
        path="/users"
        element={
          <RequireAuth>
            <RequireOrg>
              <AppShell>
                <UserManagementPage />
              </AppShell>
            </RequireOrg>
          </RequireAuth>
        }
      />

      {/* Route for Org Membership */}
      <Route
        path="/org-memberships"
        element={
          <RequireAuth>
            <RequireOrg>
              <AppShell>
                <OrgMembershipPage />
              </AppShell>
            </RequireOrg>
          </RequireAuth>
        }
      />

      {/* Route for User Profile */}
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <RequireOrg>
              <AppShell>
                <UserProfilePage />
              </AppShell>
            </RequireOrg>
          </RequireAuth>
        }
      />

      {/* ✅ Organization is platform/tenant admin-only. Keep it protected + inside shell */}
      <Route
        path="/admin/organizations"
        element={
          <RequireAuth>
            <RequireSystemAdmin>
              <AppShell>
                {/* ✅ Pass required props to fix TS error */}
                <OrganizationPage isSystemAdmin={true} userOrgId="" />
              </AppShell>
            </RequireSystemAdmin>
          </RequireAuth>
        }
      />

      {/* ✅ Election is platform/NEC admin-only. Keep it protected + inside shell */}
      <Route
        path="/admin/elections"
        element={
          <RequireAuth>
            <RequireElectionAdmin>
              <AppShell>
                <ElectionManagementPage />
              </AppShell>
            </RequireElectionAdmin>
          </RequireAuth>
        }
      />

      <Route
        path="/admin/election-candidates"
        element={
          <RequireAuth>
            <RequireElectionAdmin>
              <AppShell>
                <ElectionCandidatesPage />
              </AppShell>
            </RequireElectionAdmin>
          </RequireAuth>
        }
      />

      <Route
        path="/admin/org-settings"
        element={
          <RequireAuth>
            <RequireOrg>
              <AppShell>
                <OrgSettingsPage />
              </AppShell>
            </RequireOrg>
          </RequireAuth>
        }
      />

      {/* Create submission route */}
      <Route
        path="/vote-submissions/create"
        element={
          <RequireAuth>
            <RequireOrg>
              <AppShell>
                <CreateSubmissionForm />
              </AppShell>
            </RequireOrg>
          </RequireAuth>
        }
      />

      {/* convenience redirect for legacy path */}
      <Route
        path="/create-submission"
        element={<Navigate to="/vote-submissions/create" replace />}
      />

      {/* 404 fallback */}
      <Route path="*" element={<div>Not found</div>} />
    </Routes>
  );
};

export default App;
