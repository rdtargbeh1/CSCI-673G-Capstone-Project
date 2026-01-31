
// src/app/layout/TopBar.tsx
import { useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../shared/lib/apiClient";
import { useAuthStore } from "../../shared/store/authStore";
import type { ElectionDto } from "../../auth/api";

import UserProfileDrawer from "../../pages/profile/UserProfileDrawer";

type MeDto = {
  userId: string;
  firstName?: string;
  lastName?: string;
  userName?: string;
  email?: string;
  roleName?: string;
  isSystemAdmin?: boolean;
};

type OrgDto = {
  orgId: string;
  orgName: string;
  organizationType: string;
  active: boolean;
};

async function fetchMe(): Promise<MeDto> {
  const { data } = await apiClient.get("/users/me");
  return data as MeDto;
}

async function fetchOrgById(orgId: string): Promise<OrgDto> {
  const { data } = await apiClient.get(`/orgs/${orgId}`);
  return data as OrgDto;
}

async function fetchElectionById(electionId: string): Promise<ElectionDto> {
  const { data } = await apiClient.get(`/elections/${electionId}`);
  return data as ElectionDto;
}

function pill(cls: string) {
  return `rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`;
}

export default function TopBar() {
  const [profileOpen, setProfileOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const currentOrgId = useAuthStore((s) => s.currentOrgId);

  const isElectionScope = location.pathname.startsWith("/elections/");
  const electionId = (params as any).electionId as string | undefined;

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: 1000 * 30,
    retry: 1,
  });

  const orgQuery = useQuery({
    queryKey: ["org", currentOrgId],
    queryFn: () => fetchOrgById(currentOrgId as string),
    enabled: !!currentOrgId,
    staleTime: 1000 * 60,
    retry: 1,
  });

  const electionQuery = useQuery({
    queryKey: ["election", electionId],
    queryFn: () => fetchElectionById(electionId as string),
    enabled: isElectionScope && !!electionId,
    staleTime: 1000 * 30,
    retry: 1,
  });

  const user = meQuery.data;
  const org = orgQuery.data;
  const election = electionQuery.data;

  // ✅ FINAL: tenant name logic + boolean
  const rawTenantName =
    org?.orgName ?? useAuthStore.getState().tenantMeta?.orgName ?? null;

  const isSystemPlatform =
    !rawTenantName || rawTenantName.trim().length === 0;

  const tenantName = isSystemPlatform
    ? "System Platform"
    : rawTenantName;

  const role =
    user?.roleName ?? (user?.isSystemAdmin ? "SYSTEM_ADMIN" : undefined) ?? "—";

  const userLabel =
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
    user?.userName ||
    user?.email ||
    "User";

  const showOfficial = dashboardMode === "NEC";
  const officialValue = false;

  // ✅ Logout handler
  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // ignore
    } finally {
      const st: any = useAuthStore.getState();
      st.logout?.();
      st.reset?.();
      try {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      } catch {}
      navigate("/login", { replace: true });
    }
  };

  return (
    <>
      <header className="h-14 w-full border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-full items-center justify-between px-4">
          {/* Left */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-extrabold">
                E
              </div>
              <div className="hidden sm:block font-extrabold tracking-tight">
                EMS
              </div>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className={pill("border-slate-200 bg-white text-slate-700")}>
                {tenantName}
              </span>

              <span className={pill("border-slate-200 bg-white text-slate-700")}>
                Role: {role}
              </span>

              <span className={pill("border-slate-200 bg-white text-slate-700")}>
                {dashboardMode ?? "—"}
              </span>

              {isElectionScope && (
                <>
                  {electionQuery.isLoading ? (
                    <span className="text-xs text-slate-500">
                      Loading election…
                    </span>
                  ) : electionQuery.isError ? (
                    <span className="text-xs font-semibold text-red-600">
                      Election context error
                    </span>
                  ) : (
                    <>
                      <span className={pill("border-slate-200 bg-white text-slate-700")}>
                        Election: {election?.electionName ?? "—"}
                      </span>

                      <span className={pill("border-slate-200 bg-white text-slate-700")}>
                        Status: {election?.isActive ? "Active" : "Inactive"}
                      </span>

                      {showOfficial && (
                        <span
                          className={pill(
                            officialValue
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-red-200 bg-red-50 text-red-700"
                          )}
                        >
                          Official: {officialValue ? "✓" : "✗"}
                        </span>
                      )}
                    </>
                  )}
                </>
              )}

              {meQuery.isLoading && (
                <span className="text-xs text-slate-500">Loading user…</span>
              )}
              {meQuery.isError && (
                <span className="text-xs font-semibold text-red-600">
                  User load error
                </span>
              )}
              {orgQuery.isError && (
                <span className="text-xs font-semibold text-red-600">
                  Org load error
                </span>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (confirm("Log out of EMS?")) handleLogout();
              }}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50"
            >
              Logout
            </button>

            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 hover:bg-slate-50"
            >
              <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                👤
              </div>
              <div className="hidden sm:block text-sm font-semibold text-slate-700">
                {userLabel}
              </div>
            </button>
          </div>
        </div>
      </header>

      <UserProfileDrawer
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </>
  );
}


