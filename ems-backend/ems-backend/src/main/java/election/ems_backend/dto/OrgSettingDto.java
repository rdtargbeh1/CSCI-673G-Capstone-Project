package election.ems_backend.dto;

import java.util.Map;
import java.util.UUID;

public class OrgSettingDto {
    private UUID orgId;
    private Map<String, Object> settings; // already merged with defaults
    public UUID getOrgId() { return orgId; }
    public void setOrgId(UUID orgId) { this.orgId = orgId; }
    public Map<String, Object> getSettings() { return settings; }
    public void setSettings(Map<String, Object> settings) { this.settings = settings; }
}
