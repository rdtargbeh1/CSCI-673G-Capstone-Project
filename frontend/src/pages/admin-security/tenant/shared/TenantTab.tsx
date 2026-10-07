// src/pages/admin-security/tenant/shared/TenantTab.tsx

import { Navigate, Route, Routes } from "react-router-dom";

import OrganizationsPage from "../OrganizationsPage";

import MembershipsPage from "../MembershipsPage";

import OrgSettingsPage from "../OrgSettingsPage";

import TenantAdminCreatePage from "../TenantAdminCreatePage";

// ============================================================================
// TENANT ADMIN MODULE ROUTER
//
// Purpose:
//
// Keeps Tenant Admin page routing inside the Tenant module.
//
// Main application routing only mounts:
//
// /admin-security/tenant
// /admin-security/tenant/*
//
// This file owns:
//
// /admin-security/tenant/organizations
// /admin-security/tenant/memberships
// /admin-security/tenant/org-settings
// /admin-security/tenant/admins/new
//
// Tenant administrator creation belongs to this module because it creates
// organization-scoped administrators.
//
// Future Tenant Admin pages should be registered here instead of index.tsx.
// ============================================================================

export default function TenantTab() {
  return (
    <Routes>
      {/* ==================================================================== */}
      {/* DEFAULT */}
      {/* ==================================================================== */}

      <Route index element={<Navigate to="memberships" replace />} />

      {/* ==================================================================== */}
      {/* ORGANIZATIONS */}
      {/* ==================================================================== */}

      <Route path="organizations" element={<OrganizationsPage />} />

      {/* ==================================================================== */}
      {/* MEMBERSHIPS */}
      {/* ==================================================================== */}

      <Route path="memberships" element={<MembershipsPage />} />

      {/* ==================================================================== */}
      {/* ORGANIZATION SETTINGS */}
      {/* ==================================================================== */}

      <Route path="org-settings" element={<OrgSettingsPage />} />

      {/* ==================================================================== */}
      {/* CREATE TENANT ADMIN */}
      {/* ==================================================================== */}

      <Route path="admins/new" element={<TenantAdminCreatePage />} />

      {/* ==================================================================== */}
      {/* FALLBACK */}
      {/* ==================================================================== */}

      <Route path="*" element={<Navigate to="memberships" replace />} />
    </Routes>
  );
}
