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
  return `
    inline-flex
    min-w-0
    items-center
    rounded-full
    border
    px-2.5
    py-1
    text-[11px]
    font-semibold
    leading-none

    sm:text-xs

    ${cls}
  `;
}

export default function TopBar() {
  const [profileOpen, setProfileOpen] = useState(false);

  const navigate = useNavigate();

  const location = useLocation();

  const params = useParams();

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const currentOrgId = useAuthStore((state) => state.currentOrgId);

  const isElectionScope = location.pathname.startsWith("/elections/");

  const electionId = (params as any).electionId as string | undefined;

  // ==========================================================================
  // QUERIES
  // ==========================================================================

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

  // ==========================================================================
  // LABELS
  // ==========================================================================

  const rawTenantName =
    org?.orgName ?? useAuthStore.getState().tenantMeta?.orgName ?? null;

  const isSystemPlatform = !rawTenantName || rawTenantName.trim().length === 0;

  const tenantName = isSystemPlatform ? "System Platform" : rawTenantName;

  const role =
    user?.roleName ?? (user?.isSystemAdmin ? "SYSTEM_ADMIN" : undefined) ?? "—";

  const userLabel =
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
    user?.userName ||
    user?.email ||
    "User";

  const showOfficial = dashboardMode === "NEC";

  const officialValue = false;

  // ==========================================================================
  // LOGOUT
  // ==========================================================================

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // ignore
    } finally {
      const state: any = useAuthStore.getState();

      state.logout?.();
      state.reset?.();

      try {
        localStorage.removeItem("accessToken");

        localStorage.removeItem("refreshToken");
      } catch {
        // ignore
      }

      navigate("/login", {
        replace: true,
      });
    }
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <>
      <header
        className="
          w-full
          border-b
        "
        style={{
          backgroundColor: "#B80000",

          borderColor: "#330000",
        }}
      >
        <div
          className="
            mx-auto
            w-full
            min-w-0

            px-2
            py-2

            sm:px-3

            lg:flex
            lg:min-h-14
            lg:items-center
            lg:gap-2
            lg:px-3
            lg:py-1

            xl:gap-2.5
            xl:px-4
          "
        >
          {/* ================================================================
              BRAND + MOBILE ACTIONS
          ================================================================ */}

          <div
            className="
              flex
              w-full
              min-w-0
              items-center
              justify-start
              gap-3

              lg:w-auto
              lg:shrink-0
              lg:gap-1.5
            "
          >
            {/* BRAND */}

            <div
              className="
                flex
                shrink-0
                items-center
                gap-1.5
              "
            >
              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center

                  rounded-lg

                  bg-blue-700

                  text-base
                  font-extrabold
                  text-white
                "
              >
                E
              </div>

              <div
                className="
                  hidden

                  lg:block
                  lg:text-sm
                  lg:font-extrabold
                  lg:tracking-tight
                  lg:text-white
                "
              >
                EMS
              </div>
            </div>

            {/* MOBILE / TABLET ACTIONS */}

            <div
              className="
                ml-auto
                flex
                shrink-0
                items-center
                gap-1.5

                lg:hidden
              "
            >
              <button
                type="button"
                onClick={() => {
                  if (confirm("Log out of EMS?")) {
                    handleLogout();
                  }
                }}
                className="
                  inline-flex
                  h-9
                  min-h-0
                  items-center
                  justify-center

                  rounded-md

                  border
                  border-yellow-300

                  bg-white

                  px-2.5

                  text-xs
                  font-semibold
                  text-slate-900
                "
              >
                Logout
              </button>

              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="
                  flex
                  h-9
                  w-9
                  min-h-0
                  items-center
                  justify-center

                  rounded-md

                  border
                  border-white

                  bg-blue-600

                  p-0
                "
                aria-label="Open profile"
              >
                <div
                  className="
                    flex
                    h-7
                    w-7
                    items-center
                    justify-center

                    rounded-full

                    border
                    border-yellow-300

                    bg-red-300

                    text-xs
                  "
                >
                  👤
                </div>
              </button>
            </div>
          </div>

          {/* ================================================================
              CONTEXT

              MOBILE:
              Row 1 = Tenant / Role / Mode
              Row 2 = Election / Status / Official

              DESKTOP:
              Everything stays on ONE horizontal line.
          ================================================================ */}

          <div
            className="
              mt-2
              min-w-0
              flex-1

              lg:mt-0
              lg:flex
              lg:items-center
              lg:gap-1.5

              xl:gap-2
            "
          >
            {/* ============================================================
                TENANT / ROLE / MODE
            ============================================================ */}

            <div
              className="
                flex
                min-w-0
                flex-wrap
                items-center
                gap-1.5

                lg:shrink-0
                lg:flex-nowrap
              "
            >
              {/* TENANT */}

              <span
                className={pill(
                  `
                    max-w-full

                    border-yellow-300
                    text-white

                    lg:max-w-[180px]

                    xl:max-w-[220px]
                  `,
                )}
                title={tenantName}
              >
                <span
                  className="
                    min-w-0

                    lg:truncate
                  "
                >
                  {tenantName}
                </span>
              </span>

              {/* ROLE */}

              <span
                className={pill(
                  `
                    border-yellow-300
                    text-white

                    lg:max-w-[150px]

                    xl:max-w-[180px]
                  `,
                )}
                title={`Role: ${role}`}
              >
                <span
                  className="
                    lg:truncate
                  "
                >
                  Role: {role}
                </span>
              </span>

              {/* MODE */}

              <span
                className={pill(
                  `
                    shrink-0

                    border-yellow-300
                    text-white
                  `,
                )}
              >
                {dashboardMode ?? "—"}
              </span>
            </div>

            {/* ============================================================
                ELECTION
            ============================================================ */}

            {isElectionScope && (
              <div
                className="
                  mt-1.5
                  flex
                  min-w-0
                  flex-wrap
                  items-center
                  gap-1.5

                  lg:mt-0
                  lg:flex-1
                  lg:flex-nowrap
                "
              >
                {electionQuery.isLoading ? (
                  <span
                    className="
                      shrink-0
                      text-xs
                      text-yellow-100
                    "
                  >
                    Loading election…
                  </span>
                ) : electionQuery.isError ? (
                  <span
                    className="
                      shrink-0
                      text-xs
                      font-semibold
                      text-red-200
                    "
                  >
                    Election context error
                  </span>
                ) : (
                  <>
                    {/* ELECTION NAME */}

                    <span
                      className={pill(
                        `
                          max-w-full

                          border-yellow-300
                          bg-white
                          text-blue-700

                          lg:max-w-[260px]

                          xl:max-w-[360px]

                          2xl:max-w-[460px]
                        `,
                      )}
                      title={`Election: ${election?.electionName ?? "—"}`}
                    >
                      <span
                        className="
                          whitespace-normal
                          leading-4

                          lg:block
                          lg:truncate
                          lg:whitespace-nowrap
                        "
                      >
                        Election: {election?.electionName ?? "—"}
                      </span>
                    </span>

                    {/* STATUS */}

                    <span
                      className={pill(
                        `
                          shrink-0

                          border-yellow-300
                          bg-white
                          text-blue-700
                        `,
                      )}
                    >
                      Status: {election?.isActive ? "Active" : "Inactive"}
                    </span>

                    {/* OFFICIAL */}

                    {showOfficial && (
                      <span
                        className={pill(
                          officialValue
                            ? `
                                shrink-0
                                border-emerald-200
                                bg-emerald-50
                                text-emerald-700
                              `
                            : `
                                shrink-0
                                border-red-200
                                bg-red-50
                                text-red-700
                              `,
                        )}
                      >
                        Official: {officialValue ? "✓" : "✗"}
                      </span>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ============================================================
                QUERY STATUS
            ============================================================ */}

            {meQuery.isLoading && (
              <span
                className="
                  mt-1
                  block
                  shrink-0
                  text-xs
                  text-yellow-100

                  lg:mt-0
                "
              >
                Loading user…
              </span>
            )}

            {meQuery.isError && (
              <span
                className="
                  mt-1
                  block
                  shrink-0
                  text-xs
                  font-semibold
                  text-red-200

                  lg:mt-0
                "
              >
                User load error
              </span>
            )}

            {orgQuery.isError && (
              <span
                className="
                  mt-1
                  block
                  shrink-0
                  text-xs
                  font-semibold
                  text-red-200

                  lg:mt-0
                "
              >
                Org load error
              </span>
            )}
          </div>

          {/* ================================================================
              DESKTOP ACTIONS
          ================================================================ */}

          <div
            className="
              hidden
              shrink-0
              items-center
              gap-1.5

              lg:flex
            "
          >
            {/* LOGOUT */}

            <button
              type="button"
              onClick={() => {
                if (confirm("Log out of EMS?")) {
                  handleLogout();
                }
              }}
              className="
                inline-flex
                h-9
                min-h-0
                items-center
                justify-center

                rounded-md

                border
                border-yellow-300

                bg-white

                px-2.5

                text-xs
                font-semibold
                text-slate-900

                transition

                hover:bg-blue-50
              "
            >
              Logout
            </button>

            {/* PROFILE */}

            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="
                flex
                h-9
                min-h-0
                items-center
                gap-1.5

                rounded-md

                border
                border-white

                bg-blue-600

                px-1.5

                transition

                hover:bg-blue-800
              "
            >
              <div
                className="
                  flex
                  h-7
                  w-7
                  shrink-0
                  items-center
                  justify-center

                  rounded-full

                  border
                  border-yellow-300

                  bg-red-300

                  text-xs
                "
              >
                👤
              </div>

              <div
                className="
                  hidden
                  max-w-[130px]
                  truncate

                  text-xs
                  font-bold
                  text-white

                  xl:block

                  2xl:max-w-[190px]
                "
                title={userLabel}
              >
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
