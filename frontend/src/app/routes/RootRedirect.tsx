// src/shared/routes/RootRedirect.tsx

import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../shared/store/authStore";
import { isOperationalWorkspaceUser } from "../../shared/routes/operationalWorkspace";

export default function RootRedirect() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const isSystemAdmin = useAuthStore((state) => state.isSystemAdmin());
  const dashboardMode = useAuthStore((state) => state.dashboardMode);
  const currentOrgId = useAuthStore((state) => state.currentOrgId);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (
    isOperationalWorkspaceUser({
      user,
      currentOrgId,
      dashboardMode,
    })
  ) {
    return <Navigate to="/workspace/submissions" replace />;
  }

  if (isSystemAdmin) {
    return <Navigate to="/dashboard/system" replace />;
  }

  if (dashboardMode === "NEC") {
    return <Navigate to="/dashboard/nec" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
