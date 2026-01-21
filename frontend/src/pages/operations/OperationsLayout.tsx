/**
 * OPERATIONS LAYOUT
 *
 * PURPOSE:
 * - A task-focused workspace for day-to-day work (especially election day):
 *   - Vote Submissions: create/verify/flag/reject + evidence checks
 *   - Observer Reports: submissions from observers
 *   - Notifications: operational alerts and actions
 *
 * DATA SOURCES (SQL):
 * - vote_submission, vote_submission_contest, tally_sheet, file_upload
 * - observer_report
 * - notification
 * - audit_log (optional feed)
 */

import { Outlet } from "react-router-dom";
import { OpsTabs } from "./shared/ops-ui";

export default function OperationsLayout() {
  return (
    <div className="flex flex-col gap-4">
      <OpsTabs />
      <Outlet />
    </div>
  );
}
