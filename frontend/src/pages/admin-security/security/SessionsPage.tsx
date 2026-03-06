

// src/pages/admin-security/security/SessionsPage.tsx
/**
 * SECURITY: SESSIONS
 * TABLE: user_session
 */

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminShell, Badge, Card, Note } from "../shared/admin-ui";
import { useAuthStore } from "../../../shared/store/authStore";
import { apiClient } from "../../../shared/lib/apiClient";
import {
  fetchUserSessions,
  revokeSession,
  revokeAllSessionsForUser,
  getSessionState,
  type UserSessionDto,
} from "../../../shared/services/userSessionService";

type MeDto = {
  userId: string;
  userName?: string;
};

async function fetchMe(): Promise<MeDto> {
  const { data } = await apiClient.get("/users/me");
  return data as MeDto;
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

function statePill(state: "ACTIVE" | "EXPIRED" | "REVOKED") {
  const base = "rounded-full px-2 py-0.5 text-xs font-bold border";
  if (state === "ACTIVE") return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  if (state === "EXPIRED") return `${base} bg-amber-50 text-amber-700 border-amber-200`;
  return `${base} bg-red-50 text-red-700 border-red-200`;
}

export default function SessionsPage() {
  const qc = useQueryClient();
  const dashboardMode = useAuthStore((s) => s.dashboardMode);

  /** Load current user */
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: 30_000,
    retry: 1,
  });

  const userId = meQuery.data?.userId;

  /** Load sessions for current user */
  const sessionsQuery = useQuery({
    queryKey: ["sessions", userId],
    queryFn: () => fetchUserSessions(userId as string),
    enabled: !!userId,
    staleTime: 10_000,
    retry: 1,
  });

  /** Revoke single */
  const revokeM = useMutation({
    mutationFn: async (sessionId: string) => {
      await revokeSession(sessionId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions", userId] });
    },
  });

  /** Revoke all */
  const revokeAllM = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      await revokeAllSessionsForUser(userId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions", userId] });
    },
  });

  const sessions = sessionsQuery.data ?? [];

  const sorted = useMemo(() => {
    const copy = [...sessions];
    copy.sort((a, b) => {
      const sa = getSessionState(a);
      const sb = getSessionState(b);
      const rank = (s: string) => (s === "ACTIVE" ? 0 : s === "EXPIRED" ? 1 : 2);
      const r = rank(sa) - rank(sb);
      if (r !== 0) return r;
      // newest first
      const ta = new Date(a.dateCreated ?? "").getTime();
      const tb = new Date(b.dateCreated ?? "").getTime();
      return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
    });
    return copy;
  }, [sessions]);

  return (
    <AdminShell
      title="Security • Sessions"
      subtitle="Monitor and revoke active login sessions."
      right={<Badge>{dashboardMode ?? "—"}</Badge>}
    >
      <Card
        title="Your Sessions"
        right={
          <button
            type="button"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
            disabled={!userId || revokeAllM.isPending || sorted.length === 0}
            onClick={() => {
              const ok = window.confirm("Revoke ALL sessions for this user?");
              if (ok) revokeAllM.mutate();
            }}
          >
            Revoke All
          </button>
        }
      >
        {/* Loading / Error */}
        {meQuery.isLoading && (
          <div className="text-sm text-slate-600">Loading user…</div>
        )}

        {meQuery.isError && (
          <div className="text-sm text-red-600 font-semibold">
            Failed to load current user.
          </div>
        )}

        {sessionsQuery.isLoading && (
          <div className="text-sm text-slate-600">Loading sessions…</div>
        )}

        {sessionsQuery.isError && (
          <div className="text-sm text-red-600 font-semibold">
            Failed to load sessions.
          </div>
        )}

        {/* Empty */}
        {!sessionsQuery.isLoading && !sessionsQuery.isError && sorted.length === 0 && (
          <div className="text-sm text-slate-600">No sessions found.</div>
        )}

        {/* Table */}
        {sorted.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[1050px]">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  {[
                    "Session ID",
                    "User",
                    "Organization",
                    "State",
                    "Created",
                    "Expires",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="border-b border-slate-200 px-3 py-2 text-[11px] font-extrabold text-slate-700"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {sorted.map((s: UserSessionDto) => {
                  const state = getSessionState(s);

                  const userLabel =
                    (s.userFullName && s.userFullName.trim()) ||
                    s.userId ||
                    "—";

                  const orgLabel =
                    (s.orgName && s.orgName.trim()) ||
                    s.orgId ||
                    "System Platform";

                  return (
                    <tr key={s.sessionId} className="hover:bg-slate-50">
                      <td className="border-b border-slate-100 px-3 py-2 text-xs font-mono">
                        {s.sessionId}
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">
                        {userLabel}
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-700">
                        {orgLabel}
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2">
                        <span className={statePill(state)}>{state}</span>
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-sm">
                        {fmtDate(s.dateCreated)}
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-sm">
                        {fmtDate(s.expiresDate)}
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2">
                        {!s.revoked && state === "ACTIVE" ? (
                          <button
                            type="button"
                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                            disabled={revokeM.isPending}
                            onClick={() => {
                              const ok = window.confirm("Revoke this session?");
                              if (ok) revokeM.mutate(s.sessionId);
                            }}
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Notes */}
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Note
            title="Session states"
            bullets={[
              "ACTIVE: token valid and not revoked.",
              "EXPIRED: token TTL passed.",
              "REVOKED: revoked via logout or admin action.",
            ]}
          />
          <Note
            title="Security behavior"
            bullets={[
              "Logout should revoke the current JWT sessionId (sid).",
              "Revoking forces token invalidation only if backend enforces sid check per request.",
              "Session changes should be recorded into audit_log (backend).",
            ]}
          />
        </div>
      </Card>
    </AdminShell>
  );
}



// // src/pages/admin-security/security/SessionsPage.tsx

// /**
//  * SECURITY: SESSIONS
//  * TABLE: user_session
//  */

// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { AdminShell, Badge, Card, Note } from "../shared/admin-ui";
// import { useAuthStore } from "../../../shared/store/authStore";
// import { apiClient } from "../../../shared/lib/apiClient";
// import {
//   fetchUserSessions,
//   revokeSession,
//   getSessionState,
//   type UserSessionDto,
// } from "../../../shared/services/userSessionService";

// type MeDto = {
//   userId: string;
//   userName?: string;
// };

// async function fetchMe(): Promise<MeDto> {
//   const { data } = await apiClient.get("/users/me");
//   return data as MeDto;
// }

// function fmtDate(v?: string | null) {
//   if (!v) return "—";
//   const d = new Date(v);
//   if (Number.isNaN(d.getTime())) return String(v);
//   return d.toLocaleString();
// }

// export default function SessionsPage() {
//   const qc = useQueryClient();
//   const dashboardMode = useAuthStore((s) => s.dashboardMode);

//   /** Load current user */
//   const meQuery = useQuery({
//     queryKey: ["me"],
//     queryFn: fetchMe,
//     staleTime: 30_000,
//   });

//   const userId = meQuery.data?.userId;

//   /** Load sessions */
//   const sessionsQuery = useQuery({
//     queryKey: ["sessions", userId],
//     queryFn: () => fetchUserSessions(userId as string),
//     enabled: !!userId,
//     staleTime: 10_000,
//   });

//   /** Revoke mutation */
//   const revokeM = useMutation({
//     mutationFn: async (sessionId: string) => {
//       await revokeSession(sessionId);
//     },
//     onSuccess: () => {
//       qc.invalidateQueries({ queryKey: ["sessions", userId] });
//     },
//   });

//   const sessions = sessionsQuery.data ?? [];

//   return (
//     <AdminShell
//       title="Security • Sessions"
//       subtitle="Monitor and revoke active login sessions."
//       right={<Badge>{dashboardMode}</Badge>}
//     >
//       <Card title="Your Sessions">
//         {/* Loading / Error */}
//         {sessionsQuery.isLoading && (
//           <div className="text-sm text-slate-600">Loading sessions…</div>
//         )}

//         {sessionsQuery.isError && (
//           <div className="text-sm text-red-600 font-semibold">
//             Failed to load sessions.
//           </div>
//         )}

//         {/* Table */}
//         {!sessionsQuery.isLoading && sessions.length === 0 && (
//           <div className="text-sm text-slate-600">
//             No sessions found.
//           </div>
//         )}

//         {sessions.length > 0 && (
//           <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
//             <table className="w-full min-w-[900px]">
//               <thead className="bg-slate-50">
//                 <tr className="text-left">
//                   {[
//                     "Session ID",
//                     "State",
//                     "Created",
//                     "Expires",
//                     "Actions",
//                   ].map((h) => (
//                     <th
//                       key={h}
//                       className="border-b border-slate-200 px-3 py-2 text-[11px] font-extrabold text-slate-700"
//                     >
//                       {h}
//                     </th>
//                   ))}
//                 </tr>
//               </thead>

//               <tbody>
//                 {sessions.map((s: UserSessionDto) => {
//                   const state = getSessionState(s);

//                   return (
//                     <tr key={s.sessionId} className="hover:bg-slate-50">
//                       <td className="border-b border-slate-100 px-3 py-2 text-xs font-mono">
//                         {s.sessionId}
//                       </td>

//                       <td className="border-b border-slate-100 px-3 py-2 text-sm font-semibold">
//                         <span
//                           className={`rounded-full px-2 py-0.5 text-xs font-bold ${
//                             state === "ACTIVE"
//                               ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
//                               : state === "EXPIRED"
//                               ? "bg-amber-50 text-amber-700 border border-amber-200"
//                               : "bg-red-50 text-red-700 border border-red-200"
//                           }`}
//                         >
//                           {state}
//                         </span>
//                       </td>

//                       <td className="border-b border-slate-100 px-3 py-2 text-sm">
//                         {fmtDate(s.dateCreated)}
//                       </td>

//                       <td className="border-b border-slate-100 px-3 py-2 text-sm">
//                         {fmtDate(s.expiresDate)}
//                       </td>

//                       <td className="border-b border-slate-100 px-3 py-2">
//                         {!s.revoked && state === "ACTIVE" && (
//                           <button
//                             type="button"
//                             className="rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
//                             disabled={revokeM.isPending}
//                             onClick={() => {
//                               const ok = window.confirm(
//                                 "Revoke this session?"
//                               );
//                               if (ok) revokeM.mutate(s.sessionId);
//                             }}
//                           >
//                             Revoke
//                           </button>
//                         )}
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         )}

//         {/* Notes */}
//         <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
//           <Note
//             title="Session states"
//             bullets={[
//               "ACTIVE: token valid and not revoked.",
//               "EXPIRED: token TTL passed.",
//               "REVOKED: manually revoked via logout or admin action.",
//             ]}
//           />
//           <Note
//             title="Security behavior"
//             bullets={[
//               "Logout revokes the current session.",
//               "Revoking forces token invalidation.",
//               "Session changes should be logged into audit_log.",
//             ]}
//           />
//         </div>
//       </Card>
//     </AdminShell>
//   );
// }
