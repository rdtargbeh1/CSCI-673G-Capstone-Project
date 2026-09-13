import { Outlet } from "react-router-dom";
import { Tabs } from "./shared/admin-ui";

export default function AdminSecurityLayout() {
  return (
    <div className="flex flex-col gap-4">
      <Tabs />
      <Outlet />
    </div>
  );
}
