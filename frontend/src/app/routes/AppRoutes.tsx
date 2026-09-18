// src/routes/AppRoutes.tsx (example)
import { Routes, Route } from "react-router-dom";
import RootRedirect from "../routes/RootRedirect";
import TenantGuard from "../guards/TenantGuard";
import SystemGuard from "../guards/SystemGuard";

import TenantDashboard from "../../pages/dashboard/panels/OrgDashboard";
import SystemDashboard from "../../pages/dashboard/panels/SystemDashboard";

// (add your existing pages)
import LoginPage from "../../pages/auth/LoginPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      {/* ✅ SYSTEM ADMIN */}
      <Route element={<SystemGuard />}>
        <Route path="/dashboard/system" element={<SystemDashboard />} />
      </Route>

      {/* ✅ TENANT */}
      <Route element={<TenantGuard />}>
        <Route path="/dashboard" element={<TenantDashboard />} />
      </Route>
    </Routes>
  );
}
