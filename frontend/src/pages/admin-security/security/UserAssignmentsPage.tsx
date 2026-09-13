// src/pages/admin-security/security/UserAssignmentsPage.tsx

import { useEffect, useMemo, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AlertCircle,
  ArrowLeft,
  MapPinned,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";

import { useAuthStore } from "../../../shared/store/authStore";

import { listActiveElections } from "../../../shared/services/electionService";

import { fetchOrganizations as fetchOrganizationsPaged } from "../../../shared/services/organizationService";

import {
  deactivateUserElectionAssignments,
  listUserElectionAssignments,
  type UserElectionAssignmentDto,
} from "../../../shared/services/userElectionAssignmentService";

import { AdminShell, Badge, Card } from "../shared/admin-ui";

// ============================================================================
// TYPES
// ============================================================================

type LocationState = {
  orgId?: string;

  electionId?: string;
};

type AssignmentGroup = {
  userId: string;

  userName: string;

  userDisplayName: string;

  orgId: string;

  orgName: string;

  electionId: string;

  electionName: string;

  scopeType: string;

  countyNames: string[];

  districtNames: string[];

  centerNames: string[];

  placeNames: string[];

  rows: UserElectionAssignmentDto[];
};

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
    "Unable to load user assignments."
  );
}

function scopeLabel(value: string): string {
  switch (value) {
    case "ORGANIZATION":
      return "Organization";

    case "MULTI_COUNTY":
      return "Multiple Counties";

    case "COUNTY":
      return "County";

    case "DISTRICT":
      return "District";

    case "CENTER":
      return "Polling Center";

    case "PLACE":
      return "Polling Place";

    default:
      return value || "—";
  }
}

function uniqueNameValues(
  rows: UserElectionAssignmentDto[],
  selector: (row: UserElectionAssignmentDto) => string | null | undefined,
): string[] {
  return Array.from(
    new Set(rows.map((row) => safeStr(selector(row)).trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
}

function groupAssignments(
  rows: UserElectionAssignmentDto[],
): AssignmentGroup[] {
  const grouped = new Map<string, UserElectionAssignmentDto[]>();

  rows.forEach((row) => {
    const key = [row.userId, row.orgId, row.electionId].join("::");

    const current = grouped.get(key) ?? [];

    current.push(row);

    grouped.set(key, current);
  });

  return Array.from(grouped.values()).map((assignmentRows) => {
    const first = assignmentRows[0];

    return {
      userId: first.userId,

      userName: safeStr(first.userName),

      userDisplayName:
        safeStr(first.userDisplayName) || safeStr(first.userName),

      orgId: first.orgId,

      orgName: safeStr(first.orgName),

      electionId: first.electionId,

      electionName: safeStr(first.electionName),

      scopeType: first.scopeType,

      countyNames: uniqueNameValues(assignmentRows, (row) => row.countyName),

      districtNames: uniqueNameValues(
        assignmentRows,
        (row) => row.districtName,
      ),

      centerNames: uniqueNameValues(assignmentRows, (row) => row.centerName),

      placeNames: uniqueNameValues(assignmentRows, (row) => row.placeName),

      rows: assignmentRows,
    };
  });
}

// ============================================================================
// PAGE
// ============================================================================

export default function UserAssignmentsPage() {
  const navigate = useNavigate();

  const location = useLocation();

  const queryClient = useQueryClient();

  const routeState = (location.state ?? {}) as LocationState;

  // ==========================================================================
  // CONTEXT
  // ==========================================================================

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const currentOrgId = useAuthStore((state) => state.currentOrgId);

  const isSystemMode = dashboardMode === "SYSTEM";

  const [selectedOrgId, setSelectedOrgId] = useState(
    isSystemMode ? safeStr(routeState.orgId) : "",
  );

  const effectiveOrgId = isSystemMode ? selectedOrgId : safeStr(currentOrgId);

  const hasOrgContext = Boolean(effectiveOrgId.trim());

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [electionId, setElectionId] = useState(safeStr(routeState.electionId));

  const [search, setSearch] = useState("");

  const [countyFilter, setCountyFilter] = useState("");

  const [districtFilter, setDistrictFilter] = useState("");

  const [centerFilter, setCenterFilter] = useState("");

  const [placeFilter, setPlaceFilter] = useState("");

  // ==========================================================================
  // ORGANIZATIONS
  // ==========================================================================

  const organizationsQuery = useQuery({
    queryKey: ["lookups", "orgs", "user-assignments"],

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

  const organizations = organizationsQuery.data ?? [];

  // ==========================================================================
  // ELECTIONS
  // ==========================================================================

  const electionsQuery = useQuery({
    queryKey: ["elections", "active", "user-assignments"],

    queryFn: listActiveElections,

    staleTime: 60_000,

    retry: 1,
  });

  const elections = electionsQuery.data ?? [];

  useEffect(() => {
    if (electionId || elections.length === 0) {
      return;
    }

    setElectionId(elections[0].electionId);
  }, [electionId, elections]);

  // ==========================================================================
  // ASSIGNMENTS
  // ==========================================================================

  const assignmentsQuery = useQuery({
    queryKey: ["user-election-assignments", effectiveOrgId, electionId],

    queryFn: () => listUserElectionAssignments(effectiveOrgId, electionId),

    enabled: Boolean(effectiveOrgId && electionId),

    staleTime: 10_000,

    retry: 1,
  });

  const groupedAssignments = useMemo(
    () => groupAssignments(assignmentsQuery.data ?? []),
    [assignmentsQuery.data],
  );

  const countyOptions = useMemo(() => {
    return Array.from(
      new Set(
        groupedAssignments.flatMap((assignment) => assignment.countyNames),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [groupedAssignments]);

  const districtOptions = useMemo(() => {
    return Array.from(
      new Set(
        groupedAssignments.flatMap((assignment) => assignment.districtNames),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [groupedAssignments]);

  const centerOptions = useMemo(() => {
    return Array.from(
      new Set(
        groupedAssignments.flatMap((assignment) => assignment.centerNames),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [groupedAssignments]);

  const placeOptions = useMemo(() => {
    return Array.from(
      new Set(
        groupedAssignments.flatMap((assignment) => assignment.placeNames),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [groupedAssignments]);

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return groupedAssignments.filter((assignment) => {
      const matchesSearch =
        !query ||
        [
          assignment.userDisplayName,
          assignment.userName,
          assignment.scopeType,
          assignment.electionName,
          ...assignment.countyNames,
          ...assignment.districtNames,
          ...assignment.centerNames,
          ...assignment.placeNames,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesCounty =
        !countyFilter || assignment.countyNames.includes(countyFilter);

      const matchesDistrict =
        !districtFilter || assignment.districtNames.includes(districtFilter);

      const matchesCenter =
        !centerFilter || assignment.centerNames.includes(centerFilter);

      const matchesPlace =
        !placeFilter || assignment.placeNames.includes(placeFilter);

      return (
        matchesSearch &&
        matchesCounty &&
        matchesDistrict &&
        matchesCenter &&
        matchesPlace
      );
    });
  }, [
    groupedAssignments,
    search,
    countyFilter,
    districtFilter,
    centerFilter,
    placeFilter,
  ]);

  // ==========================================================================
  // REMOVE
  // ==========================================================================

  const removeMutation = useMutation({
    mutationFn: async (assignment: AssignmentGroup) => {
      await deactivateUserElectionAssignments(
        assignment.orgId,
        assignment.userId,
        assignment.electionId,
      );
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["user-election-assignments"],
      });
    },
  });

  function clearGeographyFilters() {
    setCountyFilter("");
    setDistrictFilter("");
    setCenterFilter("");
    setPlaceFilter("");
  }

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  function openCreate() {
    if (!effectiveOrgId) {
      return;
    }

    navigate("/admin-security/user-assignments/new", {
      state: {
        orgId: effectiveOrgId,

        electionId: electionId || undefined,
      },
    });
  }

  function openAssignment(assignment: AssignmentGroup) {
    navigate("/admin-security/user-assignments/new", {
      state: {
        orgId: assignment.orgId,

        electionId: assignment.electionId,

        userId: assignment.userId,

        user: {
          userId: assignment.userId,

          userName: assignment.userName,

          firstName: assignment.userDisplayName,
        },
      },
    });
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <AdminShell
      title="Security • User Assignments"
      subtitle="Manage election and geographic access for tenant users."
      right={<Badge>Tenant Scope</Badge>}
    >
      <Card title="User Assignments">
        <div
          className="
            mx-auto
            flex
            w-full
            max-w-7xl
            min-w-0
            flex-col
            gap-3
          "
        >
          {/* ================================================================ */}
          {/* ACTIONS */}
          {/* ================================================================ */}

          <div
            className="
              flex
              flex-wrap
              items-center
              justify-between
              gap-2
            "
          >
            <div
              className="
                flex
                min-w-0
                items-center
                gap-2
              "
            >
              <button
                type="button"
                onClick={() =>
                  navigate("/admin-security/users", {
                    state: {
                      orgId: effectiveOrgId || undefined,
                    },
                  })
                }
                className="
                  inline-flex
                  min-h-10
                  shrink-0
                  items-center
                  justify-center
                  gap-1.5
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-3
                  py-2
                  text-sm
                  font-bold
                  text-slate-700
                  transition
                  hover:bg-slate-50
                "
              >
                <ArrowLeft size={16} />

                <span className="hidden sm:inline">Back to Users</span>

                <span className="sm:hidden">Back</span>
              </button>

              <div
                className="
                  hidden
                  min-w-0
                  text-sm
                  text-slate-600

                  lg:block
                "
              >
                Assign users to election operating areas.
              </div>
            </div>

            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <button
                type="button"
                onClick={openCreate}
                disabled={!hasOrgContext}
                className="
                  inline-flex
                  min-h-10
                  items-center
                  gap-1.5
                  rounded-lg
                  bg-blue-600
                  px-3
                  py-2
                  text-sm
                  font-bold
                  text-white
                  hover:bg-blue-700
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                <Plus size={17} />
                Assign User
              </button>

              <button
                type="button"
                onClick={() => assignmentsQuery.refetch()}
                disabled={
                  !effectiveOrgId || !electionId || assignmentsQuery.isFetching
                }
                className="
                  inline-flex
                  min-h-10
                  items-center
                  gap-1.5
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-3
                  py-2
                  text-sm
                  font-semibold
                  text-slate-700
                  hover:bg-slate-50
                  disabled:opacity-40
                "
              >
                <RefreshCw
                  size={16}
                  className={assignmentsQuery.isFetching ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* ================================================================ */}
          {/* FILTERS */}
          {/* ================================================================ */}

          <section
            className="
              rounded-xl
              border
              border-slate-200
              bg-white
              p-2.5
            "
          >
            <div
              className="
                grid
                grid-cols-1
                gap-2
                sm:grid-cols-2
                xl:grid-cols-4
              "
            >
              <div className="relative min-w-0">
                <Search
                  size={17}
                  className="
                    pointer-events-none
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, username, geography..."
                  className="
                    min-h-10
                    w-full
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    py-2
                    pl-9
                    pr-3
                    text-sm
                    outline-none
                    placeholder:text-slate-400
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-100
                  "
                />
              </div>

              {isSystemMode ? (
                <select
                  value={selectedOrgId}
                  onChange={(event) => {
                    setSelectedOrgId(event.target.value);
                    clearGeographyFilters();
                  }}
                  className="
                    min-h-10
                    w-full
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    px-3
                    text-sm
                    outline-none
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-100
                  "
                >
                  <option value="">Select organization</option>

                  {organizations.map((organization) => (
                    <option key={organization.orgId} value={organization.orgId}>
                      {organization.orgName}
                    </option>
                  ))}
                </select>
              ) : (
                <div
                  className="
                    flex
                    min-h-10
                    items-center
                    rounded-lg
                    border
                    border-slate-200
                    bg-slate-50
                    px-3
                    text-sm
                    font-semibold
                    text-slate-600
                  "
                >
                  Current Organization
                </div>
              )}

              <select
                value={electionId}
                onChange={(event) => {
                  setElectionId(event.target.value);
                  clearGeographyFilters();
                }}
                className="
                  min-h-10
                  w-full
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-3
                  text-sm
                  outline-none
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-100
                "
              >
                <option value="">Select election</option>

                {elections.map((election) => (
                  <option key={election.electionId} value={election.electionId}>
                    {election.electionName} ({election.year})
                  </option>
                ))}
              </select>

              <select
                value={countyFilter}
                onChange={(event) => setCountyFilter(event.target.value)}
                disabled={!effectiveOrgId || !electionId}
                className="
                  min-h-10
                  w-full
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-3
                  text-sm
                  outline-none
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-100
                  disabled:bg-slate-100
                  disabled:text-slate-500
                "
              >
                <option value="">All Counties</option>

                {countyOptions.map((county) => (
                  <option key={county} value={county}>
                    {county}
                  </option>
                ))}
              </select>

              <select
                value={districtFilter}
                onChange={(event) => setDistrictFilter(event.target.value)}
                disabled={!effectiveOrgId || !electionId}
                className="
                  min-h-10
                  w-full
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-3
                  text-sm
                  outline-none
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-100
                  disabled:bg-slate-100
                  disabled:text-slate-500
                "
              >
                <option value="">All Districts</option>

                {districtOptions.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>

              <select
                value={centerFilter}
                onChange={(event) => setCenterFilter(event.target.value)}
                disabled={!effectiveOrgId || !electionId}
                className="
                  min-h-10
                  w-full
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-3
                  text-sm
                  outline-none
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-100
                  disabled:bg-slate-100
                  disabled:text-slate-500
                "
              >
                <option value="">All Centers</option>

                {centerOptions.map((center) => (
                  <option key={center} value={center}>
                    {center}
                  </option>
                ))}
              </select>

              <select
                value={placeFilter}
                onChange={(event) => setPlaceFilter(event.target.value)}
                disabled={!effectiveOrgId || !electionId}
                className="
                  min-h-10
                  w-full
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-3
                  text-sm
                  outline-none
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-100
                  disabled:bg-slate-100
                  disabled:text-slate-500
                "
              >
                <option value="">All Places</option>

                {placeOptions.map((place) => (
                  <option key={place} value={place}>
                    {place}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* ================================================================ */}
          {/* SELECT CONTEXT */}
          {/* ================================================================ */}

          {!effectiveOrgId || !electionId ? (
            <div
              className="
                rounded-xl
                border
                border-dashed
                border-slate-300
                bg-slate-50
                px-4
                py-10
                text-center
              "
            >
              <MapPinned
                size={30}
                className="
                  mx-auto
                  text-slate-400
                "
              />

              <div
                className="
                  mt-2
                  font-bold
                  text-slate-700
                "
              >
                Select assignment context
              </div>

              <div
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
              >
                Select an organization and election to view assignments.
              </div>
            </div>
          ) : null}

          {/* ================================================================ */}
          {/* ERROR */}
          {/* ================================================================ */}

          {assignmentsQuery.isError ? (
            <div
              className="
                flex
                items-start
                gap-2
                rounded-lg
                border
                border-red-200
                bg-red-50
                p-3
                text-sm
                text-red-700
              "
            >
              <AlertCircle size={17} className="mt-0.5" />

              {friendlyError(assignmentsQuery.error)}
            </div>
          ) : null}

          {/* ================================================================ */}
          {/* LOADING */}
          {/* ================================================================ */}

          {assignmentsQuery.isLoading ? (
            <div
              className="
                rounded-xl
                border
                border-slate-200
                bg-white
                p-6
                text-center
                text-sm
                text-slate-500
              "
            >
              Loading user assignments...
            </div>
          ) : null}

          {/* ================================================================ */}
          {/* EMPTY */}
          {/* ================================================================ */}

          {effectiveOrgId &&
          electionId &&
          !assignmentsQuery.isLoading &&
          !assignmentsQuery.isError &&
          filteredAssignments.length === 0 ? (
            <div
              className="
                rounded-xl
                border
                border-dashed
                border-slate-300
                bg-white
                px-4
                py-10
                text-center
              "
            >
              <UserRound
                size={30}
                className="
                  mx-auto
                  text-slate-400
                "
              />

              <div
                className="
                  mt-2
                  font-bold
                  text-slate-700
                "
              >
                No user assignments
              </div>

              <div
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
              >
                Assign a tenant user to an election geography.
              </div>
            </div>
          ) : null}

          {/* ================================================================ */}
          {/* LIST */}
          {/* ================================================================ */}

          {filteredAssignments.length > 0 ? (
            <section
              className="
                overflow-hidden
                rounded-xl
                border
                border-slate-200
                bg-white
              "
            >
              {/* ============================================================ */}
              {/* DESKTOP HEADER */}
              {/* ============================================================ */}

              <div
                className="
                  hidden
                  grid-cols-[minmax(160px,1.15fr)_minmax(110px,0.75fr)_130px_minmax(120px,0.85fr)_minmax(110px,0.8fr)_minmax(130px,0.9fr)_minmax(130px,0.9fr)_92px]
                  gap-3
                  border-b
                  border-slate-200
                  bg-slate-50
                  px-4
                  py-2
                  text-xs
                  font-bold
                  uppercase
                  tracking-wide
                  text-slate-500
                  md:grid
                  md:items-center
                "
              >
                <div>Full Name</div>

                <div>Username</div>

                <div>Scope</div>

                <div>County</div>

                <div>District</div>

                <div>Center</div>

                <div>Place</div>

                <div className="text-right">Actions</div>
              </div>

              {/* ============================================================ */}
              {/* RECORDS */}
              {/* ============================================================ */}

              {filteredAssignments.map((assignment) => (
                <div
                  key={`${assignment.userId}-${assignment.electionId}`}
                  className="
                    border-b
                    border-slate-200
                    bg-white
                    last:border-b-0
                  "
                >
                  {/* ======================================================== */}
                  {/* MOBILE */}
                  {/* ======================================================== */}

                  <div className="p-3 md:hidden">
                    <div
                      className="
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        p-3
                      "
                    >
                      <div
                        className="
                          flex
                          min-w-0
                          items-start
                          justify-between
                          gap-3
                        "
                      >
                        <div className="min-w-0 flex-1">
                          <div
                            className="
                              truncate
                              text-base
                              font-extrabold
                              text-slate-900
                            "
                          >
                            {assignment.userDisplayName || "—"}
                          </div>

                          <div
                            className="
                              mt-0.5
                              truncate
                              text-sm
                              font-semibold
                              text-blue-700
                            "
                          >
                            @{assignment.userName || "—"}
                          </div>
                        </div>

                        <span
                          className="
                            shrink-0
                            rounded-full
                            bg-slate-100
                            px-2.5
                            py-1
                            text-[11px]
                            font-bold
                            text-slate-700
                          "
                        >
                          {scopeLabel(assignment.scopeType)}
                        </span>
                      </div>

                      <div
                        className="
                          mt-3
                          grid
                          grid-cols-2
                          gap-2
                          rounded-lg
                          bg-slate-50
                          p-2.5
                        "
                      >
                        <GeoValue
                          label="County"
                          values={assignment.countyNames}
                        />

                        <GeoValue
                          label="District"
                          values={assignment.districtNames}
                        />

                        <GeoValue
                          label="Center"
                          values={assignment.centerNames}
                        />

                        <GeoValue
                          label="Place"
                          values={assignment.placeNames}
                        />
                      </div>

                      <div
                        className="
                          mt-3
                          flex
                          items-center
                          justify-end
                          gap-2
                        "
                      >
                        <button
                          type="button"
                          onClick={() => openAssignment(assignment)}
                          className="
                            inline-flex
                            min-h-9
                            items-center
                            justify-center
                            gap-1.5
                            rounded-lg
                            border
                            border-slate-300
                            bg-white
                            px-3
                            text-xs
                            font-bold
                            text-slate-700
                            hover:bg-slate-50
                            hover:text-blue-700
                          "
                        >
                          <Pencil size={14} />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => removeMutation.mutate(assignment)}
                          disabled={removeMutation.isPending}
                          className="
                            inline-flex
                            min-h-9
                            items-center
                            justify-center
                            gap-1.5
                            rounded-lg
                            border
                            border-red-200
                            bg-white
                            px-3
                            text-xs
                            font-bold
                            text-red-600
                            hover:bg-red-50
                            disabled:opacity-40
                          "
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ======================================================== */}
                  {/* TABLET / DESKTOP */}
                  {/* ======================================================== */}

                  <div
                    className="
                      hidden
                      grid-cols-[minmax(160px,1.15fr)_minmax(110px,0.75fr)_130px_minmax(120px,0.85fr)_minmax(110px,0.8fr)_minmax(130px,0.9fr)_minmax(130px,0.9fr)_92px]
                      items-center
                      gap-3
                      px-4
                      py-3
                      md:grid
                    "
                  >
                    {/* FULL NAME */}

                    <div
                      className="
                        min-w-0
                        truncate
                        text-sm
                        font-bold
                        text-slate-900
                      "
                      title={assignment.userDisplayName}
                    >
                      {assignment.userDisplayName || "—"}
                    </div>

                    {/* USERNAME */}

                    <div
                      className="
                        min-w-0
                        truncate
                        text-sm
                        font-semibold
                        text-blue-700
                      "
                      title={assignment.userName}
                    >
                      @{assignment.userName || "—"}
                    </div>

                    {/* SCOPE */}

                    <div>
                      <span
                        className="
                          inline-flex
                          max-w-full
                          rounded-full
                          bg-slate-100
                          px-2.5
                          py-1
                          text-xs
                          font-bold
                          text-slate-700
                        "
                      >
                        {scopeLabel(assignment.scopeType)}
                      </span>
                    </div>

                    {/* COUNTY */}

                    <GeoCell values={assignment.countyNames} />

                    {/* DISTRICT */}

                    <GeoCell values={assignment.districtNames} />

                    {/* CENTER */}

                    <GeoCell values={assignment.centerNames} />

                    {/* PLACE */}

                    <GeoCell values={assignment.placeNames} />

                    {/* ACTIONS */}

                    <div
                      className="
                        flex
                        justify-end
                        gap-1
                      "
                    >
                      <button
                        type="button"
                        onClick={() => openAssignment(assignment)}
                        className="
                          inline-flex
                          h-9
                          w-9
                          items-center
                          justify-center
                          rounded-lg
                          border
                          border-slate-300
                          text-slate-600
                          hover:bg-slate-50
                          hover:text-blue-700
                        "
                        title="Update assignment"
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeMutation.mutate(assignment)}
                        disabled={removeMutation.isPending}
                        className="
                          inline-flex
                          h-9
                          w-9
                          items-center
                          justify-center
                          rounded-lg
                          border
                          border-red-200
                          text-red-600
                          hover:bg-red-50
                          disabled:opacity-40
                        "
                        title="Remove assignment"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          ) : null}
        </div>
      </Card>
    </AdminShell>
  );
}

function GeoCell({ values }: { values: string[] }) {
  const display = values.length > 0 ? values.join(", ") : "—";

  return (
    <div
      className="
        min-w-0
        truncate
        text-sm
        font-semibold
        text-slate-700
      "
      title={display}
    >
      {display}
    </div>
  );
}

function GeoValue({
  label,
  values,
}: {
  label: string;

  values: string[];
}) {
  return (
    <div className="min-w-0">
      <div
        className="
          text-[10px]
          font-bold
          uppercase
          tracking-wide
          text-slate-400
        "
      >
        {label}
      </div>

      <div
        className="
          mt-0.5
          break-words
          text-xs
          font-bold
          text-slate-800
        "
      >
        {values.length > 0 ? values.join(", ") : "—"}
      </div>
    </div>
  );
}
