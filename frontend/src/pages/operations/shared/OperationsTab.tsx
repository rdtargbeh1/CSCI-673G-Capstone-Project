// src/pages/operations/shared/OperationsTab.tsx

import { Navigate, Route, Routes } from "react-router-dom";

import SubmissionQueuePage from "../SubmissionQueuePage";

import ObserverReportsPage from "../ObserverReportsPage";

import NotificationsPage from "../NotificationsPage";

import TallySheetsPage from "../TallySheetsPage";

// ============================================================================
// OPERATIONS MODULE ROUTER
//
// Purpose:
//
// Keeps all Operations page routing inside the Operations module.
//
// Main application routing only mounts:
//
// /operations/*
//
// This file owns:
//
// /operations/submissions
// /operations/observer-reports
// /operations/notifications
// /operations/tally-sheets
//
// Observer Report modal components remain under:
//
// src/pages/operations/modal/
//
// Those files are internal components and are NOT routes.
//
// Future Operations pages should be registered here instead of index.tsx.
// ============================================================================

export default function OperationsTab() {
  return (
    <Routes>
      {/* ==================================================================== */}
      {/* DEFAULT */}
      {/* ==================================================================== */}

      <Route index element={<Navigate to="submissions" replace />} />

      {/* ==================================================================== */}
      {/* SUBMISSIONS */}
      {/* ==================================================================== */}

      <Route path="submissions" element={<SubmissionQueuePage />} />

      {/* ==================================================================== */}
      {/* OBSERVER REPORTS */}
      {/* ==================================================================== */}

      <Route path="observer-reports" element={<ObserverReportsPage />} />

      {/* ==================================================================== */}
      {/* NOTIFICATIONS */}
      {/* ==================================================================== */}

      <Route path="notifications" element={<NotificationsPage />} />

      {/* ==================================================================== */}
      {/* TALLY SHEETS */}
      {/* ==================================================================== */}

      <Route path="tally-sheets" element={<TallySheetsPage />} />

      {/* ==================================================================== */}
      {/* FALLBACK */}
      {/* ==================================================================== */}

      <Route path="*" element={<Navigate to="submissions" replace />} />
    </Routes>
  );
}
