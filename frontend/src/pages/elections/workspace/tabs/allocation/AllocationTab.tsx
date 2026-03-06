import { useState } from "react";
import { useAuth } from "../../../../../auth/useAuth";
import { Panel, Badge } from "../../../shared/elections-ui";

import PollingCenterAllocationsPage from "./PollingCenterAllocationsPage";
import PollingPlaceAllocationsPage from "./PollingPlaceAllocationsPage";

type SubTab = "CENTERS" | "PLACES";

export default function AllocationTab() {
  const { dashboardMode } = useAuth();
  const canEdit = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  const [tab, setTab] = useState<SubTab>("CENTERS");
 
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 16}}>
      <Panel
        title="Allocation"
        right={
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
              fontSize: 14
            }}
          >
            <button
              type="button"
              onClick={() => setTab("CENTERS")}
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: tab === "CENTERS" ? "#f8fafc" : "#fff",
                fontWeight: 700,
                fontSize: 20,
              }}
            >
              Centers
            </button>

            <button
              type="button"
              onClick={() => setTab("PLACES")}
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: tab === "PLACES" ? "#f8fafc" : "#fff",
                fontWeight: 700,
                fontSize: 20,
              }}
            >
              Places
            </button>

            {/* <Badge
              text={canEdit ? "Editable (NEC/SYSTEM)" : "Read-only (Tenant)"}
            /> */}

            {canEdit && (
              <button
                type="button"
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                }}
              >
                Bulk Import (later)
              </button>
            )}
          </div>
        }
      >
        {tab === "CENTERS" ? (
          
          <PollingCenterAllocationsPage />
        ) : (
          <PollingPlaceAllocationsPage />
        )}
      </Panel>
    </div>
  );
}
