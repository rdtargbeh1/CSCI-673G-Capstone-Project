// src/pages/admin-security/security/UserAssignmentCreatePage.tsx

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Check,
  Loader2,
  MapPinned,
  Save,
  ShieldCheck,
  UserRound,
  Vote,
  X,
} from "lucide-react";

import { useAuthStore } from "../../../shared/store/authStore";
import type { UserDto } from "../../../auth/userTypes";
import { fetchUsers } from "../../../shared/services/userService";
import { fetchOrganizations as fetchOrganizationsPaged } from "../../../shared/services/organizationService";
import { listActiveElections } from "../../../shared/services/electionService";
import { fetchCounties } from "../../../shared/services/countyService";
import { fetchDistricts } from "../../../shared/services/districtService";
import { fetchPollingCenters } from "../../../shared/services/pollingCenterService";
import { fetchPollingPlaces } from "../../../shared/services/pollingPlaceService";
import {
  assignUserElection,
  fetchUserElectionAssignments,
  type AssignmentScope,
  type UserElectionAssignmentRequest,
} from "../../../shared/services/userElectionAssignmentService";

// ============================================================================
// TYPES
// ============================================================================

type LocationState = {
  orgId?: string;
  electionId?: string;
  userId?: string;
  user?: UserDto;
};

type Option = {
  value: string;
  label: string;
};

// ============================================================================
// ASSIGNMENT SCOPES
// ============================================================================

const SCOPE_OPTIONS: Array<{
  value: AssignmentScope;
  label: string;
  description: string;
}> = [
  {
    value: "ORGANIZATION",
    label: "Organization",
    description: "User can operate across the organization for this election.",
  },
  {
    value: "MULTI_COUNTY",
    label: "Multiple Counties",
    description: "User can operate in two or more selected counties.",
  },
  {
    value: "COUNTY",
    label: "County",
    description: "User can operate within one county.",
  },
  {
    value: "DISTRICT",
    label: "District",
    description: "User can operate within one electoral district.",
  },
  {
    value: "CENTER",
    label: "Polling Center",
    description: "User can operate in one or more selected polling centers.",
  },
  {
    value: "PLACE",
    label: "Polling Place",
    description: "User can operate at one polling place.",
  },
];

// ============================================================================
// HELPERS
// ============================================================================

function safeStr(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value == null) {
    return "";
  }
  return String(value);
}

function friendlyError(error: any): string {
  return (
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message ??
    "Unable to save user assignment."
  );
}

function userFullName(user: any): string {
  const name = `${safeStr(user?.firstName)} ${safeStr(user?.lastName)}`.trim();
  return (
    name || safeStr(user?.userName) || safeStr(user?.email) || "Unnamed User"
  );
}

function normalizeUsers(data: any): UserDto[] {
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data)) return data;
  return [];
}

function countyLabel(county: any): string {
  return (
    safeStr(county?.countyName) ||
    safeStr(county?.name) ||
    safeStr(county?.countyCode) ||
    safeStr(county?.countyId)
  );
}

function districtLabel(district: any): string {
  const name = safeStr(district?.districtName) || safeStr(district?.name);
  if (name) return name;
  if (district?.districtNumber != null) {
    return `District ${district.districtNumber}`;
  }
  return safeStr(district?.districtCode) || safeStr(district?.districtId);
}

function centerLabel(center: any): string {
  return (
    safeStr(center?.centerName) ||
    safeStr(center?.name) ||
    safeStr(center?.centerCode) ||
    safeStr(center?.code) ||
    safeStr(center?.centerId)
  );
}

function placeLabel(place: any): string {
  const label = safeStr(place?.label).trim();
  if (label) return label;
  const placeLabelValue = safeStr(place?.placeLabel).trim();
  if (placeLabelValue) return placeLabelValue;
  if (place?.placeNumber != null) {
    return `Polling Place ${place.placeNumber}`;
  }
  return safeStr(place?.code) || safeStr(place?.placeId);
}

// ============================================================================
// PAGE
// ============================================================================

export default function UserAssignmentCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const routeState = (location.state ?? {}) as LocationState;

  // ==========================================================================
  // AUTH / TENANT CONTEXT
  // ==========================================================================

  const dashboardMode = useAuthStore((state) => state.dashboardMode);
  const currentOrgId = useAuthStore((state) => state.currentOrgId);
  const isSystemMode = dashboardMode === "SYSTEM";

  // ==========================================================================
  // PRIMARY FORM STATE
  // ==========================================================================

  const [selectedOrgId, setSelectedOrgId] = useState(
    isSystemMode ? safeStr(routeState.orgId) : safeStr(currentOrgId),
  );
  const effectiveOrgId = isSystemMode ? selectedOrgId : safeStr(currentOrgId);

  const [selectedUserId, setSelectedUserId] = useState(
    safeStr(routeState.userId ?? routeState.user?.userId),
  );
  const [electionId, setElectionId] = useState(safeStr(routeState.electionId));
  const [scopeType, setScopeType] = useState<AssignmentScope | "">("");

  // ==========================================================================
  // GEOGRAPHY STATE
  // ==========================================================================

  const [countyId, setCountyId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [centerId, setCenterId] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [countyIds, setCountyIds] = useState<string[]>([]);
  const [centerIds, setCenterIds] = useState<string[]>([]);

  // ==========================================================================
  // ORGANIZATIONS
  // ==========================================================================

  const organizationsQuery = useQuery({
    queryKey: ["lookups", "orgs", "user-assignment-create"],
    queryFn: async () => {
      const response = await fetchOrganizationsPaged({
        page: 0,
        size: 500,
        search: undefined,
        active: true,
        orgType: undefined,
        orgId: undefined,
      } as any);
      return response.items ?? [];
    },
    enabled: isSystemMode,
    staleTime: 60_000,
    retry: 1,
  });

  const organizationOptions = useMemo<Option[]>(() => {
    return (organizationsQuery.data ?? [])
      .map((organization: any) => ({
        value: safeStr(organization.orgId),
        label: organization.subdomain
          ? `${organization.orgName} (${organization.subdomain})`
          : safeStr(organization.orgName),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [organizationsQuery.data]);

  const selectedOrganization = useMemo(() => {
    return (organizationsQuery.data ?? []).find(
      (organization: any) => safeStr(organization.orgId) === effectiveOrgId,
    );
  }, [organizationsQuery.data, effectiveOrgId]);

  // ==========================================================================
  // TENANT USERS
  // ==========================================================================

  const usersQuery = useQuery({
    queryKey: ["users", "assignment-create", effectiveOrgId],
    queryFn: async () => {
      return fetchUsers(effectiveOrgId, {
        page: 0,
        size: 1000,
        q: undefined,
        active: true,
      });
    },
    enabled: Boolean(effectiveOrgId),
    staleTime: 10_000,
    retry: 1,
  });

  const tenantUsers = useMemo(
    () => normalizeUsers(usersQuery.data),
    [usersQuery.data],
  );

  const userOptions = useMemo<Option[]>(() => {
    return tenantUsers
      .map((user) => {
        const role = safeStr(user.roleName);
        const username = safeStr(user.userName);
        const suffix = [username ? `@${username}` : "", role]
          .filter(Boolean)
          .join(" • ");

        return {
          value: user.userId,
          label: suffix
            ? `${userFullName(user)} — ${suffix}`
            : userFullName(user),
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [tenantUsers]);

  const selectedUser = useMemo(() => {
    return (
      tenantUsers.find((user) => user.userId === selectedUserId) ??
      (routeState.user?.userId === selectedUserId ? routeState.user : undefined)
    );
  }, [tenantUsers, selectedUserId, routeState.user]);

  // ==========================================================================
  // ACTIVE ELECTIONS
  // ==========================================================================

  const electionsQuery = useQuery({
    queryKey: ["elections", "active", "user-assignment-create"],
    queryFn: listActiveElections,
    staleTime: 60_000,
    retry: 1,
  });

  const electionOptions = useMemo<Option[]>(() => {
    return (electionsQuery.data ?? []).map((election) => ({
      value: election.electionId,
      label: `${election.electionName} (${election.year})`,
    }));
  }, [electionsQuery.data]);

  // ==========================================================================
  // COUNTIES
  // ==========================================================================

  const countiesQuery = useQuery({
    queryKey: ["counties", "user-assignment-create"],
    queryFn: async () => {
      const response = await fetchCounties({
        page: 0,
        size: 500,
      });
      return (response.items ?? []) as any[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const counties = countiesQuery.data ?? [];

  const countyOptions = useMemo<Option[]>(() => {
    return counties
      .map((county) => ({
        value: safeStr(county.countyId),
        label: countyLabel(county),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [counties]);

  // ==========================================================================
  // DISTRICTS
  // ==========================================================================

  const districtsQuery = useQuery({
    enabled: Boolean(countyId),
    queryKey: ["districts", "user-assignment-create", countyId],
    queryFn: async () => {
      const response = await fetchDistricts({
        page: 0,
        size: 2000,
        countyId,
      });
      return (response.items ?? []) as any[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const districts = districtsQuery.data ?? [];

  const districtOptions = useMemo<Option[]>(() => {
    return districts
      .map((district) => ({
        value: safeStr(district.districtId),
        label: districtLabel(district),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [districts]);

  // ==========================================================================
  // CENTER-SCOPE POLLING CENTERS
  //
  // CENTER scope is filtered through:
  //
  // County -> District -> Polling Center
  //
  // This prevents loading/displaying every polling center nationally.
  // Selected centers remain in centerIds even when the geographic filter
  // changes, so an administrator can still assign multiple centers.
  // ==========================================================================

  const centerScopeCentersQuery = useQuery({
    enabled: scopeType === "CENTER" && Boolean(countyId && districtId),

    queryKey: [
      "polling-centers",
      "user-assignment-create",
      "center-scope",
      countyId,
      districtId,
    ],

    queryFn: async () => {
      const response = await fetchPollingCenters({
        page: 0,
        size: 5000,
        countyId,
        districtId,
      });

      return (response.items ?? []) as any[];
    },

    staleTime: 60_000,
    retry: 1,
  });

  const centerScopeCenters = centerScopeCentersQuery.data ?? [];

  const filteredCenters = useMemo(() => {
    return [...centerScopeCenters].sort((a, b) =>
      centerLabel(a).localeCompare(centerLabel(b)),
    );
  }, [centerScopeCenters]);

  // ==========================================================================
  // PLACE-SCOPE CENTERS
  // ==========================================================================

  const placeCentersQuery = useQuery({
    enabled: scopeType === "PLACE" && Boolean(countyId && districtId),
    queryKey: [
      "polling-centers",
      "user-assignment-create",
      "place",
      countyId,
      districtId,
    ],
    queryFn: async () => {
      const response = await fetchPollingCenters({
        page: 0,
        size: 5000,
        countyId,
        districtId,
      });
      return (response.items ?? []) as any[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const placeCenters = placeCentersQuery.data ?? [];

  const placeCenterOptions = useMemo<Option[]>(() => {
    return placeCenters
      .map((center) => ({
        value: safeStr(center.centerId),
        label: centerLabel(center),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [placeCenters]);

  // ==========================================================================
  // POLLING PLACES
  // ==========================================================================

  const placesQuery = useQuery({
    enabled: scopeType === "PLACE" && Boolean(centerId),
    queryKey: [
      "polling-places",
      "user-assignment-create",
      countyId,
      districtId,
      centerId,
    ],
    queryFn: async () => {
      const response = await fetchPollingPlaces({
        page: 0,
        size: 5000,
        countyId: countyId || undefined,
        districtId: districtId || undefined,
        centerId,
      });
      return (response.items ?? []) as any[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const places = placesQuery.data ?? [];

  const filteredPlaces = useMemo(() => {
    return [...places].sort((a, b) =>
      placeLabel(a).localeCompare(placeLabel(b)),
    );
  }, [places]);

  // ==========================================================================
  // CURRENT ASSIGNMENT
  // ==========================================================================

  const assignmentQuery = useQuery({
    queryKey: [
      "user-election-assignment",
      selectedUserId,
      effectiveOrgId,
      electionId,
    ],
    queryFn: () =>
      fetchUserElectionAssignments(effectiveOrgId, selectedUserId, electionId),
    enabled: Boolean(selectedUserId && effectiveOrgId && electionId),
    staleTime: 0,
    retry: 1,
  });

  const currentAssignments = assignmentQuery.data ?? [];
  const isEditing = currentAssignments.length > 0;

  // ==========================================================================
  // LOAD EXISTING ASSIGNMENT
  // ==========================================================================

  useEffect(() => {
    if (!assignmentQuery.isSuccess) return;

    const assignments = assignmentQuery.data ?? [];

    if (assignments.length === 0) {
      setScopeType("");
      setCountyId("");
      setDistrictId("");
      setCenterId("");
      setPlaceId("");
      setCountyIds([]);
      setCenterIds([]);
      return;
    }

    const first = assignments[0];
    setScopeType(first.scopeType);

    if (first.scopeType === "MULTI_COUNTY") {
      setCountyIds(
        assignments
          .map((assignment) => safeStr(assignment.countyId))
          .filter(Boolean),
      );
    } else {
      setCountyIds([]);
    }

    if (first.scopeType === "CENTER") {
      setCenterIds(
        assignments
          .map((assignment) => safeStr(assignment.centerId))
          .filter(Boolean),
      );
    } else {
      setCenterIds([]);
    }

    setCountyId(safeStr(first.countyId));
    setDistrictId(safeStr(first.districtId));
    setCenterId(safeStr(first.centerId));
    setPlaceId(safeStr(first.placeId));
  }, [assignmentQuery.data, assignmentQuery.isSuccess]);

  // ==========================================================================
  // STATE SETTERS
  // ==========================================================================

  function changeOrganization(value: string) {
    setSelectedOrgId(value);
    setSelectedUserId("");
    setElectionId("");
    clearAssignmentFields();
  }

  function changeUser(value: string) {
    setSelectedUserId(value);
    clearAssignmentFields();
  }

  function changeElection(value: string) {
    setElectionId(value);
    clearAssignmentFields();
  }

  function changeScope(value: AssignmentScope | "") {
    setScopeType(value);
    setCountyId("");
    setDistrictId("");
    setCenterId("");
    setPlaceId("");
    setCountyIds([]);
    setCenterIds([]);
  }

  function clearAssignmentFields() {
    setScopeType("");
    setCountyId("");
    setDistrictId("");
    setCenterId("");
    setPlaceId("");
    setCountyIds([]);
    setCenterIds([]);
  }

  function changeCounty(value: string) {
    setCountyId(value);
    setDistrictId("");
    setCenterId("");
    setPlaceId("");
  }

  function changeDistrict(value: string) {
    setDistrictId(value);
    setCenterId("");
    setPlaceId("");
  }

  function changeCenter(value: string) {
    setCenterId(value);
    setPlaceId("");
  }

  function toggleCounty(id: string) {
    setCountyIds((current) =>
      current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
    );
  }

  function toggleCenter(id: string) {
    setCenterIds((current) =>
      current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
    );
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  const errors = useMemo(() => {
    const result: Record<string, string> = {};

    if (!effectiveOrgId) result.orgId = "Organization is required.";
    if (!selectedUserId) result.userId = "User is required.";
    if (!electionId) result.electionId = "Election is required.";
    if (!scopeType) result.scopeType = "Assignment scope is required.";

    if (scopeType === "MULTI_COUNTY" && countyIds.length < 2) {
      result.geography = "Select at least two counties.";
    }

    if (scopeType === "COUNTY" && !countyId) {
      result.geography = "Select a county.";
    }

    if (scopeType === "DISTRICT" && !districtId) {
      result.geography = "Select a district.";
    }

    if (scopeType === "CENTER") {
      if (!countyId) {
        result.geography = "Select a county.";
      } else if (!districtId) {
        result.geography = "Select a district.";
      } else if (centerIds.length === 0) {
        result.geography = "Select at least one polling center.";
      }
    }

    if (scopeType === "PLACE" && !placeId) {
      result.geography = "Select a polling place.";
    }

    return result;
  }, [
    effectiveOrgId,
    selectedUserId,
    electionId,
    scopeType,
    countyIds,
    countyId,
    districtId,
    centerIds,
    placeId,
  ]);

  const isValid = Object.keys(errors).length === 0;

  // ==========================================================================
  // SAVE MUTATION
  // ==========================================================================

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!isValid) {
        throw new Error("Complete all required assignment fields.");
      }

      const payload: UserElectionAssignmentRequest = {
        userId: selectedUserId,
        orgId: effectiveOrgId,
        electionId,
        scopeType: scopeType as AssignmentScope,
      };

      switch (scopeType) {
        case "MULTI_COUNTY":
          payload.countyIds = countyIds;
          break;
        case "COUNTY":
          payload.countyId = countyId;
          break;
        case "DISTRICT":
          payload.countyId = countyId;
          payload.districtId = districtId;
          break;
        case "CENTER":
          payload.centerIds = centerIds;
          break;
        case "PLACE":
          payload.countyId = countyId;
          payload.districtId = districtId;
          payload.centerId = centerId;
          payload.placeId = placeId;
          break;
        case "ORGANIZATION":
        default:
          break;
      }

      return assignUserElection(effectiveOrgId, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["user-election-assignment"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["user-election-assignments"],
      });

      navigate("/admin-security/user-assignments", {
        replace: true,
        state: { orgId: effectiveOrgId, electionId },
      });
    },
  });

  const selectedScope = SCOPE_OPTIONS.find(
    (option) => option.value === scopeType,
  );

  const geographyHeaderFilters =
    scopeType === "COUNTY" ? (
      <HeaderSelect
        ariaLabel="County"
        value={countyId}
        onChange={changeCounty}
        options={countyOptions}
        placeholder="County"
        disabled={countiesQuery.isLoading}
      />
    ) : scopeType === "DISTRICT" ? (
      <>
        <HeaderSelect
          ariaLabel="County"
          value={countyId}
          onChange={changeCounty}
          options={countyOptions}
          placeholder="County"
          disabled={countiesQuery.isLoading}
        />

        <HeaderSelect
          ariaLabel="District"
          value={districtId}
          onChange={changeDistrict}
          options={districtOptions}
          placeholder="District"
          disabled={!countyId || districtsQuery.isLoading}
        />
      </>
    ) : scopeType === "CENTER" ? (
      <>
        <HeaderSelect
          ariaLabel="County"
          value={countyId}
          onChange={changeCounty}
          options={countyOptions}
          placeholder="County"
          disabled={countiesQuery.isLoading}
        />

        <HeaderSelect
          ariaLabel="District"
          value={districtId}
          onChange={changeDistrict}
          options={districtOptions}
          placeholder="District"
          disabled={!countyId || districtsQuery.isLoading}
        />
      </>
    ) : scopeType === "PLACE" ? (
      <>
        <HeaderSelect
          ariaLabel="County"
          value={countyId}
          onChange={changeCounty}
          options={countyOptions}
          placeholder="County"
          disabled={countiesQuery.isLoading}
        />

        <HeaderSelect
          ariaLabel="District"
          value={districtId}
          onChange={changeDistrict}
          options={districtOptions}
          placeholder="District"
          disabled={!countyId || districtsQuery.isLoading}
        />

        <HeaderSelect
          ariaLabel="Polling Center"
          value={centerId}
          onChange={changeCenter}
          options={placeCenterOptions}
          placeholder="Center"
          disabled={!districtId || placeCentersQuery.isLoading}
        />
      </>
    ) : null;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="app-content min-h-screen bg-slate-50/60 p-4 sm:p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        {/* HEADER */}
        <div className="flex min-w-0 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={saveMutation.isPending}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300/80 bg-white text-slate-700 shadow-xs transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0013bf]/20 disabled:opacity-50"
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold text-slate-900">
                {isEditing ? "Update User Assignment" : "Assign User"}
              </h1>
              <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                Configure election and geographic operating access across
                workspaces.
              </p>
            </div>
          </div>

          <span className="shrink-0 rounded-full border border-[#0013bf]/20 bg-[#0013bf]/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#0013bf]">
            Tenant Scope
          </span>
        </div>

        {/* ALERTS */}
        {saveMutation.isError ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <div className="text-sm font-bold text-red-900">
                Unable to save assignment
              </div>
              <div className="mt-0.5 text-sm text-red-700">
                {friendlyError(saveMutation.error)}
              </div>
            </div>
          </div>
        ) : null}

        {assignmentQuery.isError ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
            Unable to check the user's current assignment.
          </div>
        ) : null}

        {/* MAIN FORM CARD */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/5">
          {/* ASSIGNMENT CONTEXT SECTION */}
          <FormSection
            title="Assignment Context"
            icon={<ShieldCheck size={18} />}
          >
            <div
              className="
                grid
                grid-cols-1
                gap-y-4
                md:grid-cols-2
                md:gap-x-8
                xl:gap-x-10
              "
            >
              {isSystemMode ? (
                <SelectField
                  label="Organization"
                  required
                  value={selectedOrgId}
                  onChange={changeOrganization}
                  options={organizationOptions}
                  placeholder={
                    organizationsQuery.isLoading
                      ? "Loading organizations..."
                      : "Select organization"
                  }
                  disabled={
                    organizationsQuery.isLoading || Boolean(routeState.userId)
                  }
                  error={errors.orgId}
                />
              ) : (
                <ReadOnlyField
                  label="Organization"
                  value={
                    safeStr(selectedOrganization?.orgName) ||
                    "Current Organization"
                  }
                  icon={<Building2 size={16} />}
                />
              )}

              <SelectField
                label="User"
                required
                value={selectedUserId}
                onChange={changeUser}
                options={userOptions}
                placeholder={
                  !effectiveOrgId
                    ? "Select organization first"
                    : usersQuery.isLoading
                      ? "Loading tenant users..."
                      : "Select tenant user"
                }
                disabled={
                  !effectiveOrgId ||
                  usersQuery.isLoading ||
                  Boolean(routeState.userId)
                }
                error={errors.userId}
              />

              <SelectField
                label="Election"
                required
                value={electionId}
                onChange={changeElection}
                options={electionOptions}
                placeholder={
                  electionsQuery.isLoading
                    ? "Loading elections..."
                    : "Select election"
                }
                disabled={electionsQuery.isLoading || !selectedUserId}
                error={errors.electionId}
              />

              <SelectField
                label="Assignment Scope"
                required
                value={scopeType}
                onChange={(value) => changeScope(value as AssignmentScope | "")}
                options={SCOPE_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                placeholder="Select assignment scope"
                disabled={!electionId || assignmentQuery.isLoading}
                error={errors.scopeType}
              />
            </div>

            {/* USER + ASSIGNMENT SCOPE CONTEXT */}
            {selectedUser ? (
              <div
                className="
                  mt-4
                  flex
                  flex-col
                  gap-2
                  rounded-xl
                  border
                  border-slate-200/80
                  bg-slate-50
                  px-3.5
                  py-2.5
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <UserRound size={17} className="shrink-0 text-[#0013bf]" />

                  <div className="min-w-0 text-sm">
                    <span className="font-bold text-slate-900">
                      {userFullName(selectedUser)}
                    </span>

                    {selectedUser.userName ? (
                      <span className="ml-2 text-xs font-semibold text-slate-500">
                        @{selectedUser.userName}
                      </span>
                    ) : null}
                  </div>
                </div>

                {selectedScope ? (
                  <div
                    className="
                      shrink-0
                      text-xs
                      font-semibold
                      text-[#0013bf]
                      sm:text-right
                    "
                  >
                    {selectedScope.description}
                  </div>
                ) : null}
              </div>
            ) : null}
          </FormSection>

          {/* GEOGRAPHY SECTION */}
          <FormSection
            title="Election Geography"
            icon={<MapPinned size={18} />}
            borderTop
            right={geographyHeaderFilters}
          >
            {!scopeType ? (
              <EmptyMessage>
                Select an assignment scope above to configure geography access.
              </EmptyMessage>
            ) : null}

            {/* ============================================================ */}
            {/* ORGANIZATION */}
            {/* ============================================================ */}

            {scopeType === "ORGANIZATION" ? (
              <div className="text-sm font-semibold text-slate-600">
                Organization-wide access.
              </div>
            ) : null}

            {/* ============================================================ */}
            {/* COUNTY */}
            {/* ============================================================ */}

            {scopeType === "COUNTY" && errors.geography ? (
              <div className="text-xs font-semibold text-red-600">
                {errors.geography}
              </div>
            ) : null}

            {/* ============================================================ */}
            {/* MULTI COUNTY */}
            {/* ============================================================ */}

            {scopeType === "MULTI_COUNTY" ? (
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-sm font-bold text-slate-700">
                    Counties <span className="text-red-600">*</span>
                  </div>

                  <div className="text-xs font-semibold text-slate-500">
                    {countyIds.length} selected
                  </div>
                </div>

                {errors.geography ? (
                  <div className="mb-2 text-xs font-semibold text-red-600">
                    {errors.geography}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {countiesQuery.isLoading ? (
                    <div className="text-sm text-slate-500">
                      Loading counties...
                    </div>
                  ) : null}

                  {!countiesQuery.isLoading && counties.length === 0 ? (
                    <div className="text-sm text-slate-500">
                      No counties found.
                    </div>
                  ) : null}

                  {counties.map((county) => {
                    const id = safeStr(county.countyId);
                    const selected = countyIds.includes(id);

                    return (
                      <div key={id} className="w-full sm:w-auto">
                        <SelectionButton
                          selected={selected}
                          label={countyLabel(county)}
                          compact
                          onClick={() => toggleCounty(id)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* ============================================================ */}
            {/* DISTRICT */}
            {/* ============================================================ */}

            {scopeType === "DISTRICT" && errors.geography ? (
              <div className="text-xs font-semibold text-red-600">
                {errors.geography}
              </div>
            ) : null}

            {/* ============================================================ */}
            {/* CENTER */}
            {/* ============================================================ */}

            {scopeType === "CENTER" ? (
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-sm font-bold text-slate-700">
                    Polling Centers <span className="text-red-600">*</span>
                  </div>

                  <div className="text-xs font-semibold text-slate-500">
                    {centerIds.length} selected
                  </div>
                </div>

                {errors.geography ? (
                  <div className="mb-2 text-xs font-semibold text-red-600">
                    {errors.geography}
                  </div>
                ) : null}

                {countyId && districtId ? (
                  <>
                    {centerScopeCentersQuery.isLoading ? (
                      <div className="text-sm text-slate-500">
                        Loading polling centers...
                      </div>
                    ) : null}

                    {!centerScopeCentersQuery.isLoading &&
                    filteredCenters.length === 0 ? (
                      <div className="text-sm text-slate-500">
                        No polling centers found.
                      </div>
                    ) : null}

                    {!centerScopeCentersQuery.isLoading &&
                    filteredCenters.length > 0 ? (
                      <div className="flex max-h-[340px] flex-wrap items-start gap-2 overflow-y-auto">
                        {filteredCenters.map((center) => {
                          const id = safeStr(center.centerId);
                          const selected = centerIds.includes(id);

                          return (
                            <div
                              key={id}
                              className="w-full sm:w-[220px] lg:w-[240px]"
                            >
                              <SelectionButton
                                selected={selected}
                                label={centerLabel(center)}
                                compact
                                onClick={() => toggleCenter(id)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}

            {/* ============================================================ */}
            {/* PLACE */}
            {/* ============================================================ */}

            {scopeType === "PLACE" ? (
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-sm font-bold text-slate-700">
                    Polling Place <span className="text-red-600">*</span>
                  </div>

                  {centerId ? (
                    <div className="text-xs font-semibold text-slate-500">
                      {places.length} place{places.length === 1 ? "" : "s"}
                    </div>
                  ) : null}
                </div>

                {errors.geography ? (
                  <div className="mb-2 text-xs font-semibold text-red-600">
                    {errors.geography}
                  </div>
                ) : null}

                {centerId ? (
                  <>
                    {placesQuery.isLoading ? (
                      <div className="text-sm text-slate-500">
                        Loading polling places...
                      </div>
                    ) : null}

                    {!placesQuery.isLoading && filteredPlaces.length === 0 ? (
                      <div className="text-sm text-slate-500">
                        No polling places found.
                      </div>
                    ) : null}

                    {!placesQuery.isLoading && filteredPlaces.length > 0 ? (
                      <div className="flex max-h-[320px] flex-wrap items-start gap-2 overflow-y-auto">
                        {filteredPlaces.map((place) => {
                          const id = safeStr(place.placeId);
                          const selected = placeId === id;

                          const helper = [
                            place?.placeNumber != null
                              ? `Place #${place.placeNumber}`
                              : "",
                            safeStr(place?.code),
                          ]
                            .filter(Boolean)
                            .join(" • ");

                          return (
                            <div
                              key={id}
                              className="w-full sm:w-[180px] lg:w-[195px]"
                            >
                              <SelectionButton
                                selected={selected}
                                label={placeLabel(place)}
                                helper={helper}
                                compact
                                onClick={() => setPlaceId(id)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </FormSection>

          {/* SUMMARY SECTION */}
          {scopeType && selectedUserId && electionId ? (
            <FormSection
              title="Assignment Summary"
              icon={<Vote size={18} />}
              borderTop
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SummaryItem
                  label="User"
                  value={
                    selectedUser ? userFullName(selectedUser) : "Selected User"
                  }
                />

                <SummaryItem
                  label="Election"
                  value={
                    electionOptions.find(
                      (option) => option.value === electionId,
                    )?.label ?? "Selected Election"
                  }
                />

                <SummaryItem
                  label="Scope"
                  value={selectedScope?.label ?? "—"}
                />
              </div>
            </FormSection>
          ) : null}
        </section>

        {/* STICKY BOTTOM ACTION BAR */}
        <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-3 shadow-lg shadow-slate-950/5 backdrop-blur-md">
          {!isValid ? (
            <div className="hidden text-xs font-semibold text-slate-500 sm:block">
              Complete all required fields to save assignment.
            </div>
          ) : (
            <div className="hidden text-xs font-semibold text-emerald-600 sm:block">
              Ready to submit configuration.
            </div>
          )}

          <div className="ml-auto flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={saveMutation.isPending}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300/80 bg-white px-4 text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
            >
              <X size={16} />
              Cancel
            </button>

            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={
                !isValid || saveMutation.isPending || assignmentQuery.isLoading
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#0013bf] px-5 text-sm font-bold text-white shadow-xs transition hover:bg-[#000fa0] focus:outline-none focus:ring-2 focus:ring-[#0013bf]/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saveMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {isEditing ? "Update Assignment" : "Save Assignment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT HELPERS & FIELDS
// ============================================================================

function FormSection({
  title,
  icon,
  right,
  borderTop = false,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  right?: React.ReactNode;
  borderTop?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "p-5 sm:p-6",
        borderTop ? "border-t border-slate-100" : "",
      ].join(" ")}
    >
      <div
        className={[
          "flex flex-wrap items-center gap-2.5",
          children ? "mb-4" : "",
        ].join(" ")}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0013bf]/10 text-[#0013bf]">
          {icon}
        </div>

        <h2 className="text-base font-extrabold text-slate-900">{title}</h2>

        {right ? (
          <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
            {right}
          </div>
        ) : null}
      </div>

      {children}
    </div>
  );
}

function HeaderSelect({
  ariaLabel,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="
        h-8
        min-w-[120px]
        max-w-[210px]
        rounded-lg
        border
        border-slate-300
        bg-white
        px-2.5
        text-xs
        font-semibold
        text-slate-700
        outline-none
        transition
        focus:border-[#0013bf]
        focus:ring-2
        focus:ring-[#0013bf]/15
        disabled:cursor-not-allowed
        disabled:bg-slate-100
        disabled:text-slate-400
      "
    >
      <option value="">{placeholder}</option>

      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  disabled,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <label className="block min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-700 sm:text-sm">
          {label}
          {required ? <span className="ml-0.5 text-red-600">*</span> : null}
        </span>

        {error ? (
          <span className="text-xs font-semibold text-red-600">{error}</span>
        ) : null}
      </div>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={[
          "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition duration-150",
          error
            ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            : "border-slate-300/80 focus:border-[#0013bf] focus:ring-2 focus:ring-[#0013bf]/15",
          disabled ? "cursor-not-allowed bg-slate-100 text-slate-500" : "",
        ].join(" ")}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReadOnlyField({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-bold text-slate-700 sm:text-sm">
        {label}
      </div>
      <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-700">
        {icon ? <span className="text-slate-400">{icon}</span> : null}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

function SelectionButton({
  selected,
  label,
  helper,
  compact = false,
  onClick,
}: {
  selected: boolean;
  label: string;
  helper?: string;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex min-w-0 items-start border text-left transition duration-150 active:scale-[0.99]",
        compact
          ? "gap-2 rounded-lg px-2.5 py-1.5"
          : "gap-2.5 rounded-xl px-3 py-2.5",
        selected
          ? "border-[#0013bf]/40 bg-[#0013bf]/5 shadow-xs"
          : "border-slate-200 bg-white hover:bg-slate-50/80",
      ].join(" ")}
    >
      <span
        className={[
          "shrink-0 items-center justify-center rounded border transition-colors",
          compact ? "mt-0.5 flex h-4 w-4" : "mt-0.5 flex h-4.5 w-4.5",
          selected
            ? "border-[#0013bf] bg-[#0013bf] text-white"
            : "border-slate-300 bg-white text-transparent",
        ].join(" ")}
      >
        <Check size={compact ? 10 : 12} strokeWidth={3} />
      </span>

      <span className="min-w-0">
        <span
          className={[
            "block truncate font-semibold",
            compact ? "text-[11px]" : "text-sm",
            selected ? "text-[#0013bf]" : "text-slate-700",
          ].join(" ")}
        >
          {label}
        </span>

        {helper ? (
          <span
            className={[
              "mt-0.5 block truncate text-slate-500",
              compact ? "text-[10px]" : "text-xs",
            ].join(" ")}
          >
            {helper}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-3.5 py-2.5">
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-bold text-slate-900">
        {value}
      </div>
    </div>
  );
}

function EmptyMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-8 text-center text-sm font-medium text-slate-500">
      {children}
    </div>
  );
}
