

/**
 * WORKSPACE: NEC WORKFLOW (LAYOUT)
 *
 * WHO SEES THIS:
 * - NEC and SYSTEM admins only
 *
 * PURPOSE:
 * - Official pipeline navigation:
 *   - nec_result (publish status)
 *   - staging imports
 *   - history / audit
 *   - geo outputs (v_nec_result_geo / mv_nec_result_geo)
 */

import { NavLink, Outlet } from "react-router-dom";
import { Panel } from "../../../../shared/elections-ui";

function tabClass(active: boolean) {
  return [
    "relative inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-lg font-extrabold transition",
    active
      ? "border-indigo-200 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-100"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  ].join(" ");
}

function ActiveDot({ active }: { active: boolean }) {
  return (
    <span
      className={[
        "h-2.5 w-2.5 rounded-full",
        active ? "bg-indigo-600" : "bg-slate-300",
      ].join(" ")}
    />
  );
}

export default function NecWorkflowTab() {
  return (
    <div className="flex flex-col gap-2">
      <Panel
        title="NEC Workflow"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <NavLink to="nec-result" className={({ isActive }) => tabClass(isActive)}>
              {({ isActive }) => (
                <>
                  <ActiveDot active={isActive} />
                  <span>NEC Result</span>
                  {isActive && (
                    <span className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-indigo-600" />
                  )}
                </>
              )}
            </NavLink>

            <NavLink to="staging" className={({ isActive }) => tabClass(isActive)}>
              {({ isActive }) => (
                <>
                  <ActiveDot active={isActive} />
                  <span>Staging</span>
                  {isActive && (
                    <span className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-indigo-600" />
                  )}
                </>
              )}
            </NavLink>

            <NavLink to="history" className={({ isActive }) => tabClass(isActive)}>
              {({ isActive }) => (
                <>
                  <ActiveDot active={isActive} />
                  <span>History</span>
                  {isActive && (
                    <span className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-indigo-600" />
                  )}
                </>
              )}
            </NavLink>

            <NavLink to="geo" className={({ isActive }) => tabClass(isActive)}>
              {({ isActive }) => (
                <>
                  <ActiveDot active={isActive} />
                  <span>Geo</span>
                  {isActive && (
                    <span className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-indigo-600" />
                  )}
                </>
              )}
            </NavLink>
          </div>
        }
      >
        {/* intentionally empty — workflow tabs only */}
        <></>
      </Panel>

      <Outlet />
    </div>
  );
}

