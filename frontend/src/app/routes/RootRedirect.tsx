// src/pages/auth/RootRedirect.tsx

import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../shared/store/authStore";

export default function RootRedirect() {
  const token = useAuthStore((s) => s.token);
  const isSystemAdmin = useAuthStore((s) => s.isSystemAdmin());

  if (!token) return <Navigate to="/login" replace />;

  return isSystemAdmin ? (
    <Navigate to="/dashboard/system" replace />
  ) : (
    <Navigate to="/dashboard" replace />
  );
}
