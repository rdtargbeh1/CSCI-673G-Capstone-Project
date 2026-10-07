// src/pages/operations/OperationsLayout.tsx

import { Outlet } from "react-router-dom";

// ============================================================================
// OPERATIONS LAYOUT
// ============================================================================
//
// The application SidebarNav is the authoritative Operations navigation.
//
// Do NOT add another Operations navigation bar here.
//
// This prevents:
//
// Sidebar
// + Operations top tabs
//
// from becoming two competing navigation systems.
// ============================================================================

export default function OperationsLayout() {
  return (
    <div
      className="
        w-full
        min-w-0
      "
    >
      <Outlet />
    </div>
  );
}
