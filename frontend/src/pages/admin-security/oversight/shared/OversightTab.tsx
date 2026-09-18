// src/pages/admin-security/oversight/shared/OversightTab.tsx

import { Navigate, Route, Routes } from "react-router-dom";

import AuditLogsPage from "../AuditLogsPage";

import AuditLedgerPage from "../AuditLedgerPage";

import VoteSubmissionActionsPage from "../VoteSubmissionActionsPage";

import SubmissionActionDetailPage from "../SubmissionActionDetailPage";

import FileUploadsPage from "../FileUploadsPage";

// ============================================================================
// OVERSIGHT MODULE ROUTER
//
// Purpose:
//
// Keeps all Oversight routing inside the Oversight module.
//
// Main application routing only mounts:
//
// /admin-security/oversight
// /admin-security/oversight/*
//
// This file owns:
//
// /admin-security/oversight/audit-logs
// /admin-security/oversight/audit-ledger
// /admin-security/oversight/submission-actions
// /admin-security/oversight/submission-actions/:actionId
// /admin-security/oversight/file-uploads
//
// Future Oversight pages should be registered here.
// ============================================================================

export default function OversightTab() {
  return (
    <Routes>
      {/* ==================================================================== */}
      {/* DEFAULT */}
      {/* ==================================================================== */}

      <Route index element={<Navigate to="audit-logs" replace />} />

      {/* ==================================================================== */}
      {/* AUDIT LOGS */}
      {/* ==================================================================== */}

      <Route path="audit-logs" element={<AuditLogsPage />} />

      {/* ==================================================================== */}
      {/* AUDIT LEDGER */}
      {/* ==================================================================== */}

      <Route path="audit-ledger" element={<AuditLedgerPage />} />

      {/* ==================================================================== */}
      {/* VOTE SUBMISSION ACTIONS */}
      {/* ==================================================================== */}

      <Route
        path="submission-actions"
        element={<VoteSubmissionActionsPage />}
      />

      {/* ==================================================================== */}
      {/* VOTE SUBMISSION ACTION DETAIL */}
      {/* ==================================================================== */}

      <Route
        path="submission-actions/:actionId"
        element={<SubmissionActionDetailPage />}
      />

      {/* ==================================================================== */}
      {/* FILE UPLOADS */}
      {/* ==================================================================== */}

      <Route path="file-uploads" element={<FileUploadsPage />} />

      {/* ==================================================================== */}
      {/* FALLBACK */}
      {/* ==================================================================== */}

      <Route path="*" element={<Navigate to="audit-logs" replace />} />
    </Routes>
  );
}
