// src/pages/operations/shared/OperationsTab.tsx

import type { ReactNode } from "react";

import { Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";

import OperationsLayout from "../OperationsLayout";

import OperationWorkspaceDashboard from "../OperationWorkspaceDashboard";

import { OpsTabs } from "./ops-ui";

// ============================================================================
// GEOGRAPHY
// ============================================================================

import GeographyReadRoutes from "../../geo-registry/shared/GeographyReadRoutes";

// ============================================================================
// ELECTION REFERENCE
// ============================================================================

import ElectionReferenceRoutes from "../../elections/workspace/tabs/setup/shared/ElectionReferenceRoutes";

// ============================================================================
// SUBMISSIONS
// ============================================================================

import SubmissionsTab from "../../elections/workspace/tabs/submissions/shared/SubmissionsTab";

// ============================================================================
// OPERATIONS
// ============================================================================

import ObserverReportsPage from "../ObserverReportsPage";

import NotificationsPage from "../NotificationsPage";

import TallySheetsPage from "../TallySheetsPage";

// ============================================================================
// RESULTS
// ============================================================================

import ElectionResultsRoutes from "../../elections/workspace/tabs/results/shared/ElectionResultsRoutes";

// ============================================================================
// REPORTS
// ============================================================================

import ReportRequestsPage from "../../reports/ReportRequestsPage";

import ReportFilesPage from "../../reports/ReportFilesPage";

// ============================================================================
// CONTEXT
// ============================================================================

import { useOperationalContext } from "../../../shared/hooks/useOperationalContext";

// ============================================================================
// MESSAGE
// ============================================================================

function WorkspaceMessage({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-lg font-extrabold text-slate-900">{title}</div>

      <div className="mt-2 text-sm text-slate-600">{message}</div>
    </div>
  );
}

// ============================================================================
// ELECTION ACCESS GATE
// ============================================================================
//
// This gate establishes only the Operations election context.
//
// It does NOT replace backend resource authorization.
//
// Individual APIs remain responsible for:
//
// - geography scope
// - ownership
// - submission actions
// - observer-report actions
// - result aggregate safety
// - report access
// - personnel visibility
//
// ============================================================================

function ElectionAccessGate({
  electionId,
  operationalAccess,
  loading,
  error,
  children,
}: {
  electionId: string | null;
  operationalAccess: boolean;
  loading: boolean;
  error: unknown;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <WorkspaceMessage
        title="Loading workspace"
        message="Resolving Operations election access..."
      />
    );
  }

  if (error) {
    return (
      <WorkspaceMessage
        title="Unable to resolve Operations access"
        message={
          error instanceof Error
            ? error.message
            : "The Operations election context could not be loaded."
        }
      />
    );
  }

  if (!electionId) {
    return (
      <WorkspaceMessage
        title="Election required"
        message="Select an election from the Operations Dashboard before opening this workspace."
      />
    );
  }

  if (!operationalAccess) {
    return (
      <WorkspaceMessage
        title="Operations unavailable"
        message="You do not have Operations access for the selected election."
      />
    );
  }

  return <>{children}</>;
}

// ============================================================================
// WORKFLOW SHELL
// ============================================================================
//
// These remain the internal Operations workflow tabs:
//
// Submissions
// Observer Reports
// Notifications
// Tally Sheets
//
// They are children of the broader Operations portal.
//
// ============================================================================

function WorkflowShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <OpsTabs />

      <div className="min-w-0">{children}</div>
    </div>
  );
}

// ============================================================================
// PERSONNEL
// ============================================================================
//
// Personnel is read-only in Operations.
//
// Do not reuse administrative user-management pages here.
//
// ============================================================================

function OperationsPersonnelPage() {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-extrabold text-slate-900">Personnel</h1>

        <p className="mt-1 text-sm text-slate-600">
          Authorized operational personnel within the selected election and
          assigned geographic scope.
        </p>

        <div className="mt-3">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
            READ ONLY
          </span>
        </div>
      </section>

      <WorkspaceMessage
        title="Operational Team"
        message="The scoped operational personnel list will be rendered here without exposing administrative user-management actions."
      />
    </div>
  );
}

// ============================================================================
// SUBMISSION ACTION HISTORY
// ============================================================================

function OperationsSubmissionActionsPage() {
  return (
    <WorkspaceMessage
      title="Submission Actions"
      message="Submission action history is read-only in the Operations workspace."
    />
  );
}

// ============================================================================
// DISCREPANCIES
// ============================================================================

function OperationsDiscrepanciesPage() {
  return (
    <WorkspaceMessage
      title="Discrepancies"
      message="Discrepancies are read-only and remain restricted by election and authorized geographic scope."
    />
  );
}

// ============================================================================
// REPORT ROUTES
// ============================================================================

function OperationsReportsLayout() {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <nav className="flex gap-3" aria-label="Report sections">
        <NavLink to="/operations/reports/requests">
          Report Snapshots / Requests
        </NavLink>
        <NavLink to="/operations/reports/files">Report Files</NavLink>
      </nav>
      <Outlet />
    </div>
  );
}

function OperationsReportsRoutes() {
  return (
    <Routes>
      <Route element={<OperationsReportsLayout />}>
        <Route
          index
          element={<Navigate to="/operations/reports/requests" replace />}
        />

        <Route path="requests" element={<ReportRequestsPage />} />

        <Route path="files" element={<ReportFilesPage />} />

        <Route
          path="*"
          element={<Navigate to="/operations/reports/requests" replace />}
        />
      </Route>
    </Routes>
  );
}

// ============================================================================
// OPERATIONS MODULE
// ============================================================================
//
// Stable portal:
//
// /operations/dashboard
//
// /operations/geography/*
//
// /operations/personnel
//
// /operations/reference/*
//
// /operations/submissions/*
// /operations/observer-reports/*
// /operations/notifications/*
// /operations/tally-sheets/*
// /operations/submission-actions/*
// /operations/discrepancies/*
//
// /operations/results/*
//
// /operations/reports/*
//
// Election is context.
//
// Election ID is NOT part of the Operations URL.
//
// ============================================================================

export default function OperationsTab() {
  const { electionId, operationalAccess, loading, error } =
    useOperationalContext(true);

  // ==========================================================================
  // SHARED ELECTION GATE
  // ==========================================================================

  const gated = (children: ReactNode) => (
    <ElectionAccessGate
      electionId={electionId}
      operationalAccess={operationalAccess}
      loading={loading}
      error={error}
    >
      {children}
    </ElectionAccessGate>
  );

  // ==========================================================================
  // ROUTES
  // ==========================================================================

  return (
    <Routes>
      <Route element={<OperationsLayout />}>
        {/* ==================================================================
            DEFAULT
        ================================================================== */}

        <Route index element={<OperationWorkspaceDashboard />} />

        {/* ==================================================================
            DASHBOARD

            Dashboard is intentionally NOT election-gated.

            It must remain available so the user can select/change election.
        ================================================================== */}

        <Route
          path="dashboard"
          element={<Navigate to="/operations" replace />}
        />

        {/* ==================================================================
            GEOGRAPHY
        ================================================================== */}

        <Route path="geography/*" element={gated(<GeographyReadRoutes />)} />

        {/* ==================================================================
            PERSONNEL
        ================================================================== */}

        <Route path="personnel" element={gated(<OperationsPersonnelPage />)} />

        {/* ==================================================================
            ALLOCATIONS
        ================================================================== */}

        {/* ==================================================================
            ELECTION REFERENCE
        ================================================================== */}

        <Route
          path="reference/*"
          element={gated(<ElectionReferenceRoutes />)}
        />

        {/* ==================================================================
            SUBMISSIONS
        ================================================================== */}

        <Route
          path="submissions/*"
          element={gated(
            <WorkflowShell>
              <SubmissionsTab />
            </WorkflowShell>,
          )}
        />

        {/* ==================================================================
            OBSERVER REPORTS
        ================================================================== */}

        <Route
          path="observer-reports/*"
          element={gated(
            <WorkflowShell>
              <ObserverReportsPage />
            </WorkflowShell>,
          )}
        />

        {/* ==================================================================
            NOTIFICATIONS
        ================================================================== */}

        <Route
          path="notifications/*"
          element={
            <WorkflowShell>
              <NotificationsPage />
            </WorkflowShell>
          }
        />

        {/* ==================================================================
            TALLY SHEETS
        ================================================================== */}

        <Route
          path="tally-sheets/*"
          element={gated(
            <WorkflowShell>
              <TallySheetsPage />
            </WorkflowShell>,
          )}
        />

        {/* ==================================================================
            SUBMISSION ACTIONS
        ================================================================== */}

        <Route
          path="submission-actions/*"
          element={gated(
            <WorkflowShell>
              <OperationsSubmissionActionsPage />
            </WorkflowShell>,
          )}
        />

        {/* ==================================================================
            DISCREPANCIES
        ================================================================== */}

        <Route
          path="discrepancies/*"
          element={gated(
            <WorkflowShell>
              <OperationsDiscrepanciesPage />
            </WorkflowShell>,
          )}
        />

        {/* ==================================================================
            RESULTS
        ================================================================== */}

        <Route path="results/*" element={gated(<ElectionResultsRoutes />)} />

        {/* ==================================================================
            REPORTS
        ================================================================== */}

        <Route path="reports/*" element={gated(<OperationsReportsRoutes />)} />

        {/* ==================================================================
            FALLBACK
        ================================================================== */}

        <Route
          path="*"
          element={
            <WorkspaceMessage
              title="Page not found"
              message="Choose a section from the Operations menu."
            />
          }
        />
      </Route>
    </Routes>
  );
}
