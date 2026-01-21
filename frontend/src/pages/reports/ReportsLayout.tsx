import { Outlet } from "react-router-dom";
import { ReportsTabs } from "./shared/reports-ui";

export default function ReportsLayout() {
  return (
    <div className="flex flex-col gap-4">
      <ReportsTabs />
      <Outlet />
    </div>
  );
}
