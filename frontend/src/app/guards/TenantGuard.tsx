import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../shared/store/authStore";

export default function TenantGuard() {
  const token = useAuthStore((s) => s.token);
  const isSystemAdmin = useAuthStore((s) => s.user?.isSystemAdmin);
  const currentOrgId = useAuthStore((s) => s.currentOrgId);

  if (!token) return <Navigate to="/login" replace />;
  if (isSystemAdmin) return <Navigate to="/dashboard/system" replace />;
  if (!currentOrgId) return <Navigate to="/select-organization" replace />;

  return <Outlet />;
}
