


// src/pages/oversight/AuditLedgerPage.tsx

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useAuth } from "../../../auth/useAuth";
import { AdminShell, Badge, Card, Note, Table } from "../shared/admin-ui";

import {
  fetchLedgerByType,
  fetchLedgerVerifyErrors,
  fetchRetryList,
  forceRetryOne,
  type AuditLedgerDto,
  type AuditLedgerRetryDto,
} from "../../../shared/services/auditLedgerService";

function short(id?: string | null, n = 8) {
  if (!id) return "";
  return id.length <= n ? id : `${id.slice(0, n)}…`;
}

function fmtTime(s?: string | null) {
  if (!s) return "";
  return s.replace("T", " ");
}

function toUpperSet(values: unknown): Set<string> {
  const arr = Array.isArray(values) ? values : [];
  return new Set(arr.map((v) => String(v ?? "").toUpperCase()).filter(Boolean));
}

function errMsg(e: any) {
  // axios-like
  const status = e?.response?.status;
  const data = e?.response?.data;
  const msg =
    data?.message ||
    data?.error ||
    (typeof data === "string" ? data : null) ||
    e?.message ||
    String(e);

  return status ? `${status} — ${msg}` : msg;
}

export default function AuditLedgerPage() {
  const auth: any = useAuth();
  const dashboardMode: string = String(auth?.dashboardMode ?? "").toUpperCase();
  const me: any = auth?.me ?? auth?.user ?? auth?.currentUser ?? null;

  const roleSet = useMemo(() => {
    const rolesFromArray = toUpperSet(me?.roles);
    const roleName = String(me?.roleName ?? "").toUpperCase();
    const tenantRole = String(me?.tenantRole ?? "").toUpperCase();
    if (roleName) rolesFromArray.add(roleName);
    if (tenantRole) rolesFromArray.add(tenantRole);
    return rolesFromArray;
  }, [me]);

  const isSystemAdmin =
    Boolean(me?.isSystemAdmin) ||
    roleSet.has("SYSTEM_ADMIN") ||
    roleSet.has("PLATFORM_ADMIN");

  const allowed =
    isSystemAdmin || dashboardMode === "SYSTEM" || dashboardMode === "NEC";

  const [typeFilter, setTypeFilter] = useState<string>("VOTE_SUBMISSION");

  // ✅ IMPORTANT: If allowed=false, NOTHING will fetch
  const ledgerEnabled = allowed && Boolean(typeFilter?.trim());

  const ledgerQ = useQuery({
    queryKey: ["audit-ledger", "by-type", typeFilter],
    enabled: ledgerEnabled,
    queryFn: async () => {
      const t = typeFilter.trim();
      const data = await fetchLedgerByType(t);
      return data;
    },
  });

  const retryQ = useQuery({
    queryKey: ["audit-ledger-retry", "list", 50],
    enabled: allowed,
    queryFn: () => fetchRetryList(50),
    refetchInterval: 10_000,
  });

  const verifyQ = useQuery({
    queryKey: ["audit-ledger", "verify"],
    enabled: allowed,
    queryFn: fetchLedgerVerifyErrors,
    refetchOnWindowFocus: false,
  });

  const retryMut = useMutation({
    mutationFn: (retryId: string) => forceRetryOne(retryId),
    onSuccess: () => retryQ.refetch(),
  });

  const ledgerRows = useMemo(() => {
    const rows = (ledgerQ.data ?? []) as AuditLedgerDto[];
    return rows.map((r) => [
      "OK",
      r.entryType ?? "",
      short(r.actorId),
      `Hash: ${short(r.chainHash, 12)}  Ref: ${short(r.entryReference, 8)}`,
      fmtTime(r.createdAt),
      "audit_ledger",
    ]);
  }, [ledgerQ.data]);

  const retryRows = useMemo(() => {
    const rows = (retryQ.data ?? []) as AuditLedgerRetryDto[];
    const sorted = [...rows].sort((a, b) => {
      const at = a.nextAttemptAt ?? "";
      const bt = b.nextAttemptAt ?? "";
      return at.localeCompare(bt);
    });

    return sorted.map((r) => [
      r.status ?? "RETRY",
      r.entryType ?? "",
      short(r.actorId),
      `Attempts: ${r.attempts ?? 0}  Next: ${fmtTime(r.nextAttemptAt)}  Err: ${
        r.lastError
          ? r.lastError.slice(0, 40) + (r.lastError.length > 40 ? "…" : "")
          : ""
      }`,
      fmtTime(r.createdAt),
      "audit_ledger_retry",
      r.retryId,
    ]);
  }, [retryQ.data]);

  const rowsCombined = useMemo(() => {
    const headerRetry = retryRows.length
      ? [["—", "RETRY QUEUE", "—", "Failed ledger writes awaiting recovery", "—", "—"]]
      : [];
    return [...ledgerRows, ...headerRetry, ...retryRows.map((r) => r.slice(0, 6))];
  }, [ledgerRows, retryRows]);

  if (!allowed) {
    return (
      <AdminShell
        title="Oversight • Audit Ledger"
        subtitle="NEC/System only. Tamper-resistant audit ledger."
        right={<Badge>Restricted</Badge>}
      >
        <Card title="Access">
          <Note
            title="Not allowed, so queries will NOT run"
            bullets={[
              `dashboardMode = ${dashboardMode || "—"}`,
              `isSystemAdmin = ${String(isSystemAdmin)}`,
              `roles = ${Array.from(roleSet).join(", ") || "—"}`,
              "Fix: login as SYSTEM_ADMIN or switch dashboard mode to NEC/SYSTEM.",
            ]}
          />
        </Card>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Oversight • Audit Ledger"
      subtitle="NEC/System only. Tamper-resistant audit ledger + retry activity."
      right={<Badge>NEC/SYSTEM</Badge>}
    >
      <Card title="Ledger (then Retry Activity)">
        {/* ✅ DEBUG / STATUS PANEL */}
        <div className="mb-3 rounded-xl border bg-white p-3 text-xs text-slate-700">
          <div className="font-bold text-slate-800">Status</div>
          <div className="mt-1 grid grid-cols-1 gap-1 lg:grid-cols-2">
            <div>allowed: <b>{String(allowed)}</b></div>
            <div>ledgerEnabled: <b>{String(ledgerEnabled)}</b></div>
            <div>typeFilter: <b>{typeFilter || "—"}</b></div>
            <div>ledgerCount: <b>{ledgerRows.length}</b></div>
            <div>retryCount: <b>{retryRows.length}</b></div>
            <div>verifyErrors: <b>{(verifyQ.data ?? []).length}</b></div>
          </div>

          {(ledgerQ.isError || retryQ.isError || verifyQ.isError) ? (
            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-red-700">
              <div className="font-bold">API Errors</div>
              {ledgerQ.isError ? <div>ledgerQ: {errMsg(ledgerQ.error)}</div> : null}
              {retryQ.isError ? <div>retryQ: {errMsg(retryQ.error)}</div> : null}
              {verifyQ.isError ? <div>verifyQ: {errMsg(verifyQ.error)}</div> : null}
            </div>
          ) : null}
        </div>

        {/* FILTER + REFRESH */}
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-800">Ledger filter</div>
            <div className="text-xs text-slate-500">
              Uses /api/admin/audit-ledger/by-type (controller doesn’t expose “list all”).
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 w-[260px] rounded-xl border border-slate-300 bg-white px-3 text-sm"
              placeholder="Entry type (e.g., VOTE_SUBMISSION)"
            />
            <button
              type="button"
              onClick={() => {
                ledgerQ.refetch();
                retryQ.refetch();
                verifyQ.refetch();
              }}
              className="h-10 rounded-xl border bg-white px-4 text-sm font-extrabold hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* LOADING INDICATORS */}
        {(ledgerQ.isLoading || retryQ.isLoading) ? (
          <div className="mb-3 text-xs text-slate-500">
            Loading… {ledgerQ.isLoading ? "ledger" : ""} {retryQ.isLoading ? "retry" : ""}
          </div>
        ) : null}

        <Table
          columns={["State", "Action", "Actor", "Proof / Detail", "Time", "Source"]}
          rows={rowsCombined}
        />

        {/* Retry controls */}
        <div className="mt-4">
          <div className="text-sm font-semibold text-slate-800">Retry controls</div>
          <div className="text-xs text-slate-500">
            Manual retry calls POST /api/admin/audit/retries/{`{retryId}`}/retry.
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2">
            {(retryQ.data ?? []).slice(0, 8).map((r) => (
              <div
                key={r.retryId}
                className="flex flex-col gap-2 rounded-xl border bg-white p-3 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="text-sm">
                  <div className="font-semibold text-slate-800">
                    {r.status} • {r.entryType || "—"} • retryId {short(r.retryId, 10)}
                  </div>
                  <div className="text-xs text-slate-500">
                    attempts={r.attempts} • next={fmtTime(r.nextAttemptAt)} • err=
                    {r.lastError
                      ? ` ${r.lastError.slice(0, 80)}${r.lastError.length > 80 ? "…" : ""}`
                      : " —"}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={retryMut.isPending}
                  onClick={() => retryMut.mutate(r.retryId)}
                  className={`h-10 rounded-xl border px-4 text-sm font-extrabold ${
                    retryMut.isPending ? "opacity-60" : "hover:bg-slate-50"
                  }`}
                >
                  Retry now
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-xl border bg-white p-3">
          <div className="text-sm font-semibold text-slate-800">Verify status</div>
          {verifyQ.isLoading ? (
            <div className="text-xs text-slate-500">Checking ledger chain…</div>
          ) : (verifyQ.data ?? []).length ? (
            <div className="text-xs text-red-700">
              {(verifyQ.data ?? []).slice(0, 8).map((e, i) => (
                <div key={i}>• {e}</div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-500">No chain errors reported.</div>
          )}
        </div>
      </Card>
    </AdminShell>
  );
}

