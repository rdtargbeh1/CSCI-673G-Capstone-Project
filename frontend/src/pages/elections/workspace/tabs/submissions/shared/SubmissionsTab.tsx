// src/pages/elections/workspace/tabs/submissions/SubmissionsTab.tsx

import { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";

import SubmissionListPage from "../SubmissionListPage";
import SubmissionFormPage from "../SubmissionFormPage";
import SubmissionDetailPage from "../SubmissionDetailPage";
import SubmissionVerifyPage from "../SubmissionVerifyPage";
import SubmissionFlagPage from "../SubmissionFlagPage";
import SubmissionAmendPage from "../SubmissionAmendPage";
import SubmissionDeletePage from "../SubmissionDeletePage";

// ============================================================================
// TYPES
// ============================================================================

type SubmissionRoute =
  | { type: "list" }
  | { type: "create" }
  | { type: "edit"; submissionId: string }
  | { type: "detail"; submissionId: string }
  | { type: "verify"; submissionId: string }
  | { type: "flag"; submissionId: string }
  | { type: "unflag"; submissionId: string }
  | { type: "amend"; submissionId: string }
  | { type: "delete"; submissionId: string }
  | { type: "unknown" };

// ============================================================================
// HELPERS
// ============================================================================

function decodeRouteValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SubmissionsTab() {
  const location = useLocation();
  const pathname = location.pathname;

  const route = useMemo<SubmissionRoute>(() => {
    // =========================================================================
    // CREATE
    // =========================================================================

    if (/\/submissions\/new\/?$/.test(pathname)) {
      return {
        type: "create",
      };
    }

    // =========================================================================
    // EDIT
    // =========================================================================

    const editMatch = pathname.match(/\/submissions\/([^/]+)\/edit\/?$/);

    if (editMatch?.[1]) {
      return {
        type: "edit",
        submissionId: decodeRouteValue(editMatch[1]),
      };
    }

    // =========================================================================
    // VERIFY
    // =========================================================================

    const verifyMatch = pathname.match(/\/submissions\/([^/]+)\/verify\/?$/);

    if (verifyMatch?.[1]) {
      return {
        type: "verify",
        submissionId: decodeRouteValue(verifyMatch[1]),
      };
    }

    // =========================================================================
    // UNFLAG
    // =========================================================================

    const unflagMatch = pathname.match(/\/submissions\/([^/]+)\/unflag\/?$/);

    if (unflagMatch?.[1]) {
      return {
        type: "unflag",
        submissionId: decodeRouteValue(unflagMatch[1]),
      };
    }

    // =========================================================================
    // FLAG
    // =========================================================================

    const flagMatch = pathname.match(/\/submissions\/([^/]+)\/flag\/?$/);

    if (flagMatch?.[1]) {
      return {
        type: "flag",
        submissionId: decodeRouteValue(flagMatch[1]),
      };
    }

    // =========================================================================
    // AMEND
    // =========================================================================

    const amendMatch = pathname.match(/\/submissions\/([^/]+)\/amend\/?$/);

    if (amendMatch?.[1]) {
      return {
        type: "amend",
        submissionId: decodeRouteValue(amendMatch[1]),
      };
    }

    // =========================================================================
    // DELETE
    // =========================================================================

    const deleteMatch = pathname.match(/\/submissions\/([^/]+)\/delete\/?$/);

    if (deleteMatch?.[1]) {
      return {
        type: "delete",
        submissionId: decodeRouteValue(deleteMatch[1]),
      };
    }

    // =========================================================================
    // DETAIL
    // =========================================================================

    const detailMatch = pathname.match(/\/submissions\/([^/]+)\/?$/);

    if (detailMatch?.[1]) {
      return {
        type: "detail",
        submissionId: decodeRouteValue(detailMatch[1]),
      };
    }

    // =========================================================================
    // LIST
    // =========================================================================

    if (/\/submissions\/?$/.test(pathname)) {
      return {
        type: "list",
      };
    }

    return {
      type: "unknown",
    };
  }, [pathname]);

  // ==========================================================================
  // LIST
  // ==========================================================================

  if (route.type === "list") {
    return <SubmissionListPage />;
  }

  // ==========================================================================
  // CREATE
  // ==========================================================================

  if (route.type === "create") {
    return <SubmissionFormPage mode="create" />;
  }

  // ==========================================================================
  // EDIT
  // ==========================================================================

  if (route.type === "edit") {
    return <SubmissionFormPage mode="edit" submissionId={route.submissionId} />;
  }

  // ==========================================================================
  // DETAIL
  // ==========================================================================

  if (route.type === "detail") {
    return <SubmissionDetailPage />;
  }
  // ==========================================================================
  // VERIFY
  // ==========================================================================

  if (route.type === "verify") {
    return <SubmissionVerifyPage submissionId={route.submissionId} />;
  }

  // ==========================================================================
  // FLAG
  // ==========================================================================

  if (route.type === "flag") {
    return <SubmissionFlagPage submissionId={route.submissionId} mode="flag" />;
  }

  // ==========================================================================
  // UNFLAG
  // ==========================================================================

  if (route.type === "unflag") {
    return (
      <SubmissionFlagPage submissionId={route.submissionId} mode="unflag" />
    );
  }

  // ==========================================================================
  // AMEND
  // ==========================================================================

  if (route.type === "amend") {
    return <SubmissionAmendPage submissionId={route.submissionId} />;
  }

  // ==========================================================================
  // DELETE
  // ==========================================================================

  if (route.type === "delete") {
    return <SubmissionDeletePage submissionId={route.submissionId} />;
  }

  // ==========================================================================
  // FALLBACK
  // ==========================================================================

  return <Navigate to="." replace />;
}
