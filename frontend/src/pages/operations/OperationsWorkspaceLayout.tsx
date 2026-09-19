import { Outlet } from "react-router-dom";

import { OpsTabs } from "./shared/ops-ui";
import { useAuthStore } from "../../shared/store/authStore";

function resolveWorkspaceContext(args: {
  currentOrgId: string | null;
  currentElectionId: string | null;
  orgName?: string | null;
}) {
  const { currentOrgId, currentElectionId, orgName } = args;

  if (orgName || currentOrgId || currentElectionId) {
    return [
      orgName || "Organization",
      currentOrgId ? `Org ${currentOrgId}` : null,
      currentElectionId ? `Election ${currentElectionId}` : null,
    ]
      .filter(Boolean)
      .join(" • ");
  }

  return "Operational context";
}

export default function OperationsWorkspaceLayout() {
  const currentOrgId = useAuthStore((state) => state.currentOrgId);
  const currentElectionId = useAuthStore((state) => state.currentElectionId);
  const tenantMeta = useAuthStore((state) => state.tenantMeta);

  const contextLabel = resolveWorkspaceContext({
    currentOrgId,
    currentElectionId,
    orgName: tenantMeta?.orgName,
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-4 sm:px-4 lg:px-6">
        <header className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <h1 className="text-2xl font-extrabold text-slate-900">
            Operations Workspace
          </h1>
          <p className="mt-1 text-sm text-slate-600">{contextLabel}</p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <OpsTabs basePath="/workspace" />
        </div>

        <section>
          <Outlet />
        </section>
      </div>
    </div>
  );
}
