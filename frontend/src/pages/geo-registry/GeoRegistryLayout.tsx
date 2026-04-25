import { Outlet } from "react-router-dom";
import { Tabs } from "./shared/geo-ui";

export default function GeoRegistryLayout() {
  return (
    <div className="flex flex-col gap-4">
      <Tabs />
      <Outlet />
    </div>
  );
}
