import { useAuth } from "../../auth/useAuth";
import SystemDashboard from "../dashboard/panels/SystemDashboard";
import NecDashboard from "../dashboard/panels/NecDashboard";
import OrgDashboard from "../dashboard/panels/OrgDashboard";

export default function DashboardPage() {
  const { dashboardMode, loading, error } = useAuth();

  if (loading) return <div style={{ padding: 16 }}>Loading dashboard…</div>;
  if (error)
    return <div style={{ padding: 16, color: "crimson" }}>{error}</div>;

  if (dashboardMode === "SYSTEM") return <SystemDashboard />;
  if (dashboardMode === "NEC") return <NecDashboard />;
  return <OrgDashboard />;
}
