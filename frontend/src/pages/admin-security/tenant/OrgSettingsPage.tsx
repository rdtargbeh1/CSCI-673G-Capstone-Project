import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../shared/store/authStore";

import {
  fetchOrganizations as fetchOrganizationsPaged,
  fetchOrganizationById,
  updateOrganizationBranding, // ✅ ADD THIS EXPORT IN organizationService.ts
  type Organization,
} from "../../../shared/services/organizationService";

import {
  fetchOrgSettings,
  patchOrgSettings,
  type OrgSettingDto,
} from "../../../shared/services/orgSettingService";

import { AdminShell, Badge, Card, Note } from "../shared/admin-ui";
import { RefreshCw, Save, RotateCcw } from "lucide-react";

/** -------- helpers -------- */
function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function asInt(v: any): string {
  if (v == null) return "";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  return "";
}
function asBool(v: any): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}
function cleanPatchValue(v: any) {
  // Send null to remove key (your backend supports null -> remove)
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? null : t;
  }
  return v;
}

/** Keys (org_setting JSON keys) */
const K = {
  RATE_LIMIT_PER_MIN: "rate_limit_per_min",
  SHOW_OFFICIAL: "show_official",
  LOCKOUT_THRESHOLD: "lockout_threshold",
  LOCKOUT_MINUTES: "lockout_minutes",
};

export default function OrgSettingsPage() {
  const qc = useQueryClient();

  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const currentOrgId = useAuthStore((s) => s.currentOrgId);

  const isSystemMode = dashboardMode === "SYSTEM";

  // SYSTEM: must pick org to view/update tenant settings
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");

  const effectiveOrgId = isSystemMode
    ? selectedOrgId.trim()
    : safeStr(currentOrgId).trim();

  const hasOrgContext = !!effectiveOrgId;

  /** SYSTEM org dropdown options */
  const orgsQ = useQuery({
    queryKey: ["lookups", "orgs", "system"],
    queryFn: async () => {
      const res = await fetchOrganizationsPaged({
        page: 0,
        size: 200,
        search: undefined,
        active: undefined,
        orgType: undefined,
        orgId: undefined,
      } as any);
      return (res.items ?? []) as Organization[];
    },
    enabled: isSystemMode,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const orgOptions = useMemo(() => {
    return (orgsQ.data ?? []).map((o) => ({
      value: o.orgId,
      label: o.subdomain ? `${o.orgName} (${o.subdomain})` : o.orgName,
    }));
  }, [orgsQ.data]);

  /** ✅ Load Organization (for branding fields stored in organization table) */
  const orgQ = useQuery({
    queryKey: ["org", effectiveOrgId || "no-org"],
    queryFn: async () => {
      if (!effectiveOrgId) return null;
      return (await fetchOrganizationById(effectiveOrgId)) as Organization;
    },
    enabled: hasOrgContext,
    staleTime: 10_000,
    retry: 1,
  });

  /** Load org_setting JSON settings (policies) */
  const settingsQ = useQuery({
    queryKey: ["org-settings", effectiveOrgId || "no-org"],
    queryFn: () => fetchOrgSettings(effectiveOrgId),
    enabled: hasOrgContext,
    staleTime: 10_000,
    retry: 1,
  });

  const dto: OrgSettingDto | undefined = settingsQ.data;
  const settings = dto?.settings ?? {};
  const org = orgQ.data ?? null;

  /** Form state (editable fields) */
  const [form, setForm] = useState({
    // ✅ Branding comes from Organization table
    logoUrl: "",
    primaryColor: "",
    subdomain: "",

    // ✅ Policies come from org_setting.settings
    rateLimitPerMin: "",
    showOfficial: false,
    lockoutThreshold: "",
    lockoutMinutes: "",
  });

  /** hydrate form when org/settings load or org changes */
  React.useEffect(() => {
    if (!hasOrgContext) return;

    setForm((p) => ({
      ...p,

      // Branding from organization
      logoUrl: safeStr(org?.logoUrl),
      primaryColor: safeStr(org?.primaryColor),
      subdomain: safeStr(org?.subdomain),

      // Policies from org_setting dto
      rateLimitPerMin: asInt(settings[K.RATE_LIMIT_PER_MIN]),
      showOfficial: asBool(settings[K.SHOW_OFFICIAL]),
      lockoutThreshold: asInt(settings[K.LOCKOUT_THRESHOLD]),
      lockoutMinutes: asInt(settings[K.LOCKOUT_MINUTES]),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveOrgId, orgQ.dataUpdatedAt, settingsQ.dataUpdatedAt]);

  const refreshNow = async () => {
    await qc.invalidateQueries({ queryKey: ["org-settings"] });
    await qc.invalidateQueries({ queryKey: ["org"] });
    if (hasOrgContext) {
      await Promise.all([settingsQ.refetch(), orgQ.refetch()]);
    }
  };

  /** ✅ Save BOTH: branding -> /orgs/{id}/branding, policies -> /org-settings */
  const saveM = useMutation({
    mutationFn: async () => {
      if (!hasOrgContext) throw new Error("Select an organization first.");

      // 1) ✅ Branding payload (organization table)
      const brandingPayload = {
        orgId: effectiveOrgId,
        logoUrl: cleanPatchValue(form.logoUrl),
        primaryColor: cleanPatchValue(form.primaryColor),
        subdomain: cleanPatchValue(form.subdomain),
      };

      // 2) ✅ Policy/settings patch (org_setting jsonb)
      const settingsPatch: Record<string, any> = {
        [K.RATE_LIMIT_PER_MIN]:
          cleanPatchValue(form.rateLimitPerMin) === null
            ? null
            : Number(form.rateLimitPerMin),
        [K.SHOW_OFFICIAL]: form.showOfficial,
        [K.LOCKOUT_THRESHOLD]:
          cleanPatchValue(form.lockoutThreshold) === null
            ? null
            : Number(form.lockoutThreshold),
        [K.LOCKOUT_MINUTES]:
          cleanPatchValue(form.lockoutMinutes) === null
            ? null
            : Number(form.lockoutMinutes),
      };

      // run both (sequential to keep debugging easy)
      await updateOrganizationBranding(brandingPayload);
      await patchOrgSettings(effectiveOrgId, settingsPatch);
    },
    onSuccess: async () => {
      await refreshNow();
    },
  });

  const canEdit = hasOrgContext;

  return (
    <AdminShell
      title="Admin • Org Settings"
      subtitle={
        isSystemMode
          ? "SYSTEM: select an organization to view/update tenant settings (requires X-Org-Id)."
          : "Tenant settings: branding + policies for your organization."
      }
      right={
        <Badge>
          {isSystemMode
            ? hasOrgContext
              ? "Org Selected"
              : "Select Org"
            : "Tenant"}
        </Badge>
      }
    >
      <Card
        title="Settings"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refreshNow}
              disabled={
                !hasOrgContext || settingsQ.isFetching || orgQ.isFetching
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-blue-100 px-3 py-2 text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
              title={
                !hasOrgContext ? "Select an organization first" : "Refresh"
              }
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => {
                // reset to server values
                if (!hasOrgContext) return;
                setForm({
                  logoUrl: safeStr(org?.logoUrl),
                  primaryColor: safeStr(org?.primaryColor),
                  subdomain: safeStr(org?.subdomain),
                  rateLimitPerMin: asInt(settings[K.RATE_LIMIT_PER_MIN]),
                  showOfficial: asBool(settings[K.SHOW_OFFICIAL]),
                  lockoutThreshold: asInt(settings[K.LOCKOUT_THRESHOLD]),
                  lockoutMinutes: asInt(settings[K.LOCKOUT_MINUTES]),
                });
              }}
              disabled={!hasOrgContext || settingsQ.isLoading || orgQ.isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-[#F08080] text-white px-3 py-2 text-lg font-bold hover:bg-slate-500 disabled:opacity-50"
            >
              <RotateCcw size={18} />
              Reset
            </button>

            <button
              type="button"
              onClick={() => saveM.mutate()}
              disabled={!canEdit || saveM.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-[#0000CD] text-white px-3 py-2 text-lg font-semibold hover:bg-slate-500 disabled:opacity-50"
            >
              <Save size={18} />
              Save
            </button>
          </div>
        }
      >
        {/* SYSTEM org selector */}
        {isSystemMode ? (
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-base font-semibold text-slate-600">
                Organization <span className="text-red-600">*</span>
              </div>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                disabled={orgsQ.isLoading || orgsQ.isError}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-(--org-primary)"
              >
                <option value="">
                  {orgsQ.isLoading
                    ? "Loading organizations…"
                    : "— Select Organization —"}
                </option>
                {orgOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {orgsQ.isError ? (
                <div className="mt-1 text-base font-semibold text-red-600">
                  Failed to load organizations
                </div>
              ) : null}
            </label>
          </div>
        ) : null}

        {/* Status messages */}
        {!hasOrgContext ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-base text-amber-800">
            {isSystemMode
              ? "Select an organization to manage its settings."
              : "Missing organization context."}
          </div>
        ) : settingsQ.isLoading || orgQ.isLoading ? (
          <div className="text-sm text-slate-600">Loading settings…</div>
        ) : settingsQ.isError || orgQ.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-base text-red-700">
            {(settingsQ.error as any)?.message ||
              (orgQ.error as any)?.message ||
              "Failed to load org settings."}
          </div>
        ) : null}

        {/* =========================
            Branding (Organization table)
           ========================= */}
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xl font-extrabold text-slate-900">
              Branding (Organization)
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <label className="block">
                <div className="mb-1 text-base font-semibold text-slate-600">
                  Logo URL
                </div>
                <input
                  value={form.logoUrl}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, logoUrl: e.target.value }))
                  }
                  placeholder="https://..."
                  disabled={!canEdit}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-(--org-primary) disabled:bg-slate-50"
                />
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <div className="mb-1 text-base font-semibold text-slate-600">
                    Primary Color
                  </div>
                  <input
                    value={form.primaryColor}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, primaryColor: e.target.value }))
                    }
                    placeholder="#1d4ed8"
                    disabled={!canEdit}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-(--org-primary) disabled:bg-slate-50"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <div
                      className="h-5 w-5 rounded-md border border-slate-200"
                      style={{ background: form.primaryColor || "#ffffff" }}
                      title="Preview"
                    />
                    <div className="text-base text-slate-600">Preview</div>
                  </div>
                </label>

                <label className="block">
                  <div className="mb-1 text-base font-semibold text-slate-600">
                    Subdomain
                  </div>
                  <input
                    value={form.subdomain}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, subdomain: e.target.value }))
                    }
                    placeholder="unity-party"
                    disabled={!canEdit}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-(--org-primary) disabled:bg-slate-50"
                  />
                </label>
              </div>

              {form.logoUrl ? (
                <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-base font-semibold text-slate-600">
                    Logo Preview
                  </div>
                  <img
                    src={form.logoUrl}
                    alt="Logo preview"
                    className="mt-2 h-14 w-14 rounded-xl border border-slate-200 object-cover bg-white"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                  <div className="mt-2 text-base text-slate-500">
                    (If the image fails to load, the preview hides
                    automatically.)
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {/* =========================
              Security / Policies (org_setting jsonb)
             ========================= */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xl font-extrabold text-slate-900">
              Security & Policy Defaults (Org Setting)
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3">
              <label className="block">
                <div className="mb-1 text-base font-semibold text-slate-600">
                  Rate limit per minute
                </div>
                <input
                  value={form.rateLimitPerMin}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, rateLimitPerMin: e.target.value }))
                  }
                  placeholder="e.g., 600"
                  disabled={!canEdit}
                  inputMode="numeric"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-(--org-primary) disabled:bg-slate-50"
                />
                <div className="mt-1 text-base text-slate-500">
                  Allowed range enforced by backend (example: 60..10000).
                </div>
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <input
                  type="checkbox"
                  checked={form.showOfficial}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, showOfficial: e.target.checked }))
                  }
                  disabled={!canEdit}
                />
                <div className="text-base text-slate-800">
                  Show official results / indicators
                </div>
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <div className="mb-1 text-base font-semibold text-slate-600">
                    Lockout threshold
                  </div>
                  <input
                    value={form.lockoutThreshold}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        lockoutThreshold: e.target.value,
                      }))
                    }
                    placeholder="e.g., 5"
                    disabled={!canEdit}
                    inputMode="numeric"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-(--org-primary) disabled:bg-slate-50"
                  />
                </label>

                <label className="block">
                  <div className="mb-1 text-base font-semibold text-slate-600">
                    Lockout minutes
                  </div>
                  <input
                    value={form.lockoutMinutes}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, lockoutMinutes: e.target.value }))
                    }
                    placeholder="e.g., 30"
                    disabled={!canEdit}
                    inputMode="numeric"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-(--org-primary) disabled:bg-slate-50"
                  />
                </label>
              </div>

              {saveM.isError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-base text-red-700">
                  {(saveM.error as any)?.message ?? "Failed to save settings."}
                </div>
              ) : null}

              {saveM.isSuccess ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-base text-emerald-800">
                  Saved successfully.
                </div>
              ) : null}
            </div>
          </section>
        </div>

        {/* Notes */}
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Note
            title="Important fix (why branding now works)"
            bullets={[
              "Branding fields are stored in organization table, not org_setting JSON.",
              "This page now calls PATCH /api/orgs/{id}/branding for logoUrl, primaryColor, subdomain.",
              "Policies still use PATCH /api/org-settings (jsonb settings).",
            ]}
          />
          <Note
            title="How this page works"
            bullets={[
              "GET /api/org-settings + GET /api/orgs/{orgId}",
              "Save runs: PATCH /api/orgs/{orgId}/branding then PATCH /api/org-settings",
              "Always sends X-Org-Id header on org-settings calls (tenant-scoped).",
            ]}
          />
        </div>
      </Card>
    </AdminShell>
  );
}
