// src/pages/admin-security/security/shared/SecurityTab.tsx

import { Navigate, Route, Routes } from "react-router-dom";

import UsersPage from "../UsersPage";

import UserCreateForm from "../UserCreateForm";

import UserDetailPage from "../UserDetailPage";

import UserAssignmentsPage from "../UserAssignmentsPage";

import UserAssignmentCreatePage from "../UserAssignmentCreatePage";

import RolesPage from "../RolesPage";

import MfaPage from "../MfaPage";

import SessionsPage from "../SessionsPage";

import SigningKeysPage from "../SigningKeysPage";

// ============================================================================
// SECURITY MODULE ROUTER
//
// Purpose:
//
// Keeps Security-module page routing inside the Security module.
//
// Main application routing only needs:
//
// /admin-security/*
//
// This file owns:
//
// USERS
//
// /admin-security/users
// /admin-security/users/new
// /admin-security/users/:userId
// /admin-security/users/:userId/edit
//
//
// USER ASSIGNMENTS
//
// /admin-security/user-assignments
// /admin-security/user-assignments/new
//
//
// SECURITY
//
// /admin-security/roles
// /admin-security/mfa
// /admin-security/sessions
// /admin-security/signing-keys
//
// Future Security pages should be registered here instead of index.tsx.
// ============================================================================

export default function SecurityTab() {
  return (
    <Routes>
      {/* ==================================================================== */}
      {/* USERS */}
      {/* ==================================================================== */}

      <Route path="users" element={<UsersPage />} />

      {/* CREATE USER */}

      <Route path="users/new" element={<UserCreateForm />} />

      {/* EDIT USER */}

      <Route path="users/:userId/edit" element={<UserCreateForm />} />

      {/* USER DETAIL */}

      <Route path="users/:userId" element={<UserDetailPage />} />

      {/* ==================================================================== */}
      {/* USER ASSIGNMENTS */}
      {/* ==================================================================== */}

      <Route path="user-assignments" element={<UserAssignmentsPage />} />

      <Route
        path="user-assignments/new"
        element={<UserAssignmentCreatePage />}
      />

      {/* ==================================================================== */}
      {/* ROLES */}
      {/* ==================================================================== */}

      <Route path="roles" element={<RolesPage />} />

      {/* ==================================================================== */}
      {/* MFA */}
      {/* ==================================================================== */}

      <Route path="mfa" element={<MfaPage />} />

      {/* ==================================================================== */}
      {/* SESSIONS */}
      {/* ==================================================================== */}

      <Route path="sessions" element={<SessionsPage />} />

      {/* ==================================================================== */}
      {/* SIGNING KEYS */}
      {/* ==================================================================== */}

      <Route path="signing-keys" element={<SigningKeysPage />} />

      {/* ==================================================================== */}
      {/* SECURITY FALLBACK */}
      {/* ==================================================================== */}

      <Route
        path="*"
        element={<Navigate to="/admin-security/users" replace />}
      />
    </Routes>
  );
}
