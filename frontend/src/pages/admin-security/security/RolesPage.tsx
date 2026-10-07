




import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../shared/store/authStore";

import {
  fetchRoles,
  updateRole,
  deleteRole,
  createRole,
  type UserRoleDto,
  type RoleName,
} from "../../../shared/services/roleService";

import {
  AdminShell,
  Badge,
  Card,
  Note,
  Modal,
  TextField,
} from "../shared/admin-ui";
import { RefreshCw, Pencil, Trash2, Plus, Save } from "lucide-react";

/** helpers */
function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function fmtRoleName(v: any) {
  const s = safeStr(v);
  return s || "—";
}

type RoleFormState = {
  roleId?: string;
  roleName: string;
  description: string;
};

export default function RolesPage() {
  const qc = useQueryClient();

  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const isSystem = dashboardMode === "SYSTEM";
  const canEdit = isSystem; // ✅ ONLY SYSTEM can CRUD

  const [page, setPage] = useState(0);

  // modals
  const [openEdit, setOpenEdit] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);

  const [form, setForm] = useState<RoleFormState>({
    roleName: "",
    description: "",
  });

  const rolesQ = useQuery({
    queryKey: ["roles", page],
    queryFn: () => fetchRoles({ page, size: 20 }),
    staleTime: 10_000,
    retry: 1,
  });

  const rows: UserRoleDto[] = useMemo(
    () => rolesQ.data?.items ?? [],
    [rolesQ.data]
  );
  const totalPages = Math.max(1, rolesQ.data?.totalPages ?? 1);

  const refreshNow = async () => {
    await qc.invalidateQueries({ queryKey: ["roles"] });
    await rolesQ.refetch();
  };

  const updateM = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new Error("SYSTEM only.");
      if (!form.roleId) throw new Error("Missing roleId.");

      return updateRole(form.roleId, {
        roleName: form.roleName.trim() as RoleName,
        description: form.description.trim() || null,
      });
    },
    onSuccess: async () => {
      setOpenEdit(false);
      await refreshNow();
    },
  });

  const deleteM = useMutation({
    mutationFn: async (role: UserRoleDto) => {
      if (!canEdit) throw new Error("SYSTEM only.");

      // If backend enforces builtin, this will fail; we still confirm.
      await deleteRole(role.roleId);
    },
    onSuccess: refreshNow,
  });

  const createM = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new Error("SYSTEM only.");

      // If your backend does NOT support POST /roles, this will 404/405.
      // UI will show error nicely.
      return createRole({
        roleName: form.roleName.trim() as RoleName,
        description: form.description.trim() || null,
      });
    },
    onSuccess: async () => {
      setOpenCreate(false);
      await refreshNow();
    },
  });

  return (
    <AdminShell
      title="Security • Roles"
      subtitle="System-level roles (RBAC). Tenants can view, SYSTEM can manage."
      right={<Badge>{canEdit ? "Editable (SYSTEM)" : "Read-only"}</Badge>}
    >
      <Card
        title="Roles"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refreshNow}
              disabled={rolesQ.isFetching}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => {
                setForm({ roleName: "", description: "" });
                setOpenCreate(true);
              }}
              disabled={!canEdit}
              title={canEdit ? "Create role" : "SYSTEM only"}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200  bg-[#0000CD] text-white px-3 py-2 text-lg font-bold hover:bg-slate-500 disabled:opacity-50"
            >
              <Plus size={18} />
              Create Role
            </button>
          </div>
        }
      >
        {/* status */}
        <div className="mt-2">
          {rolesQ.isLoading ? (
            <div className="text-sm text-slate-600">Loading roles…</div>
          ) : rolesQ.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-base text-red-700">
              {(rolesQ.error as any)?.message ?? "Failed to load roles."}
            </div>
          ) : null}
        </div>

        {/* table */}
        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-1000px w-full">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="text-left">
                {["Role Name", "Description", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-base font-extrabold text-slate-700"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && !rolesQ.isLoading ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-sm text-slate-600">
                    No roles found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const builtin = (r as any)?.isBuiltin === true; // optional field if API returns it
                  return (
                    <tr key={r.roleId} className="hover:bg-slate-50">
                      <td className="border-b border-slate-100 px-3 py-2">
                        <div className="text-sm font-bold text-slate-900">
                          {fmtRoleName(r.roleName)}
                        </div>
                        {builtin ? (
                          <div className="mt-0.5 text-base font-semibold text-slate-500">
                            Built-in
                          </div>
                        ) : null}
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-base text-slate-700">
                        {safeStr(r.description) || "—"}
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border text-[#008000 border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                            title={canEdit ? "Edit" : "Read-only"}
                            disabled={!canEdit}
                            onClick={() => {
                              setForm({
                                roleId: r.roleId,
                                roleName: safeStr(r.roleName),
                                description: safeStr(r.description),
                              });
                              setOpenEdit(true);
                            }}
                          >
                            <Pencil size={20} className="mx-auto text-[#008000]" />
                            {/* <Pencil size={20} /> */}
                          </button>

                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                            title={
                              !canEdit
                                ? "SYSTEM only"
                                : builtin
                                ? "Built-in roles should not be deleted"
                                : "Delete"
                            }
                            disabled={!canEdit || deleteM.isPending}
                            onClick={() => {
                              const ok = window.confirm(
                                `Delete role "${fmtRoleName(r.roleName)}"?`
                              );
                              if (ok) deleteM.mutate(r);
                            }}
                          >
                            <Trash2 size={20} className="text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Page <span className="font-bold">{page + 1}</span> of{" "}
            <span className="font-bold">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Prev
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>

        {/* notes */}
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Note
            title="Scope rules (as requested)"
            bullets={[
              "Only SYSTEM dashboard can create/update/delete roles.",
              "Tenants and NEC see roles read-only.",
              "Tenant operational roles belong to org_membership, not user_role.",
            ]}
          />
          <Note
            title="API mapping used here"
            bullets={[
              "GET /api/roles",
              "PUT /api/roles/{id}",
              "DELETE /api/roles/{id}",
              "Create uses POST /api/roles (only works if implemented on backend).",
            ]}
          />
        </div>
      </Card>

      {/* EDIT MODAL */}
      <Modal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        title="Edit Role"
        subtitle={canEdit ? "SYSTEM only." : "Read-only"}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpenEdit(false)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => updateM.mutate()}
              disabled={!canEdit || updateM.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-blue-600 text-white font-bold px-3 py-2 text-base font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={16} />
              Save
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3">
          <TextField
            label="Role Name"
            value={form.roleName}
            onChange={(v) => setForm((p) => ({ ...p, roleName: v }))}
            disabled={!canEdit}
            placeholder="SYSTEM_ADMIN"
            required
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={(v) => setForm((p) => ({ ...p, description: v }))}
            disabled={!canEdit}
            placeholder="Short description"
          />

          {updateM.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-base text-red-700">
              {(updateM.error as any)?.message ?? "Failed to update role."}
            </div>
          ) : null}
        </div>
      </Modal>

      {/* CREATE MODAL */}
      <Modal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Create Role"
        subtitle="SYSTEM only. Requires POST /api/roles on backend."
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpenCreate(false)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => createM.mutate()}
              disabled={!canEdit || createM.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-blue-500 text-white font-bold px-3 py-2 text-base font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={18} />
              Create
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3">
          <TextField
            label="Role Name"
            value={form.roleName}
            onChange={(v) => setForm((p) => ({ ...p, roleName: v }))}
            disabled={!canEdit}
            placeholder="NEW_ROLE"
            required
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={(v) => setForm((p) => ({ ...p, description: v }))}
            disabled={!canEdit}
            placeholder="Short description"
          />

          {createM.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {(createM.error as any)?.message ??
                "Failed to create role (backend may not support POST /roles)."}
            </div>
          ) : null}
        </div>
      </Modal>
    </AdminShell>
  );
}
