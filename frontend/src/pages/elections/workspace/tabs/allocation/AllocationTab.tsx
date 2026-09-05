// src/pages/elections/workspace/tabs/allocation/AllocationTab.tsx

import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";

import { Download, MapPin, Vote } from "lucide-react";

import { useAuth } from "../../../../../auth/useAuth";
import { Badge, Panel } from "../../../shared/elections-ui";

export default function AllocationTab() {
  const { dashboardMode } = useAuth();

  const { electionId } = useParams<{ electionId: string }>();

  const navigate = useNavigate();
  const location = useLocation();

  const canEdit = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  const centersActive = location.pathname.includes("/allocation/centers");

  const placesActive = location.pathname.includes("/allocation/places");

  const goToCenters = () => {
    if (!electionId) {
      return;
    }

    navigate(`/elections/${electionId}/allocation/centers`);
  };

  const goToPlaces = () => {
    if (!electionId) {
      return;
    }

    navigate(`/elections/${electionId}/allocation/places`);
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <Panel title="Allocation">
        {/* ============================================================
            ALLOCATION NAVIGATION
        ============================================================ */}

        <div
          className="
            mb-4
            flex
            w-full
            min-w-0
            items-center
            justify-end
            gap-2
            border-b
            border-slate-200
            pb-3
          "
        >
          {/* ============================================================
              CENTERS
          ============================================================ */}

          <button
            type="button"
            onClick={goToCenters}
            className={`
              inline-flex
              min-h-11
              items-center
              justify-center
              gap-2
              rounded-lg
              border
              px-3
              py-2
              text-sm
              font-bold
              transition

              sm:px-4
              sm:text-base

              ${
                centersActive
                  ? `
                    border-blue-800
                    bg-blue-900
                    text-white
                    shadow-sm
                  `
                  : `
                    border-slate-300
                    bg-white
                    text-slate-800
                    hover:bg-slate-50
                  `
              }
            `}
          >
            <MapPin size={18} className="shrink-0" />

            <span>Centers</span>
          </button>

          {/* ============================================================
              PLACES
          ============================================================ */}

          <button
            type="button"
            onClick={goToPlaces}
            className={`
              inline-flex
              min-h-11
              items-center
              justify-center
              gap-2
              rounded-lg
              border
              px-3
              py-2
              text-sm
              font-bold
              transition

              sm:px-4
              sm:text-base

              ${
                placesActive
                  ? `
                    border-blue-800
                    bg-blue-900
                    text-white
                    shadow-sm
                  `
                  : `
                    border-slate-300
                    bg-white
                    text-slate-800
                    hover:bg-slate-50
                  `
              }
            `}
          >
            <Vote size={18} className="shrink-0" />

            <span>Places</span>
          </button>

          {/* ============================================================
              DIVIDER
          ============================================================ */}

          <div
            className="
              hidden
              h-7
              w-px
              bg-slate-300

              sm:block
            "
          />

          {/* ============================================================
              BULK IMPORT / READ ONLY
          ============================================================ */}

          {canEdit ? (
            <button
              type="button"
              disabled
              title="Coming soon"
              className="
                inline-flex
                min-h-11
                items-center
                justify-center
                gap-2
                rounded-lg
                border
                border-slate-300
                bg-slate-50
                px-3
                py-2
                text-sm
                font-semibold
                text-slate-400
                cursor-not-allowed

                sm:px-4
                sm:text-base
              "
            >
              <Download size={17} className="shrink-0" />

              <span>Bulk Import</span>
            </button>
          ) : (
            <Badge text="Read-only" />
          )}
        </div>

        {/* ============================================================
            ROUTED PAGE
        ============================================================ */}

        <div className="w-full min-w-0">
          <Outlet />
        </div>
      </Panel>
    </div>
  );
}
