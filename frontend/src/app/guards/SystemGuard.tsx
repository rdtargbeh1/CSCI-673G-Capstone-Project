import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../shared/store/authStore";

export default function SystemGuard() {
  const token = useAuthStore((s) => s.token);
  const isSystemAdmin = useAuthStore((s) => s.user?.isSystemAdmin);

  if (!token) return <Navigate to="/login" replace />;
  if (!isSystemAdmin) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
