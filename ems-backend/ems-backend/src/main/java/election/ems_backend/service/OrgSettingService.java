package election.ems_backend.service;

import election.ems_backend.dto.OrgSettingDto;

import java.util.Map;

public interface OrgSettingService {

    OrgSettingDto getForCurrentTenant();
    OrgSettingDto updateForCurrentTenant(Map<String, Object> patch);
}