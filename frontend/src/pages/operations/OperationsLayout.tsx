// src/pages/operations/OperationsLayout.tsx

import { Outlet } from "react-router-dom";

import { OpsTabs } from "./shared/ops-ui";

// ============================================================================
// OPERATIONS LAYOUT
//
// Purpose:
//
// Provides the shared Operations module layout.
//
// Responsibilities:
//
// - Keeps the Operations navigation visible.
// - Renders the current Operations page through <Outlet />.
// - Does not define individual Operations routes.
//
// Individual Operations routes are maintained in:
//
// src/pages/operations/shared/OperationsTab.tsx
// ============================================================================

export default function OperationsLayout() {
  return (
    <div className="flex flex-col gap-4">
      {/* ==================================================================== */}
      {/* OPERATIONS NAVIGATION */}
      {/* ==================================================================== */}

      <OpsTabs />

      {/* ==================================================================== */}
      {/* CURRENT OPERATIONS PAGE */}
      {/* ==================================================================== */}

      <Outlet />
    </div>
  );
}
