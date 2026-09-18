package election.ems_backend.mapper;

import election.ems_backend.dto.OrganizationCreateRequest;
import election.ems_backend.dto.OrganizationDto;
import election.ems_backend.dto.OrganizationUpdateRequest;
import election.ems_backend.entity.Organization;
import org.springframework.stereotype.Component;

@Component
public class OrganizationMapper {

    public OrganizationDto toDTO(Organization org) {
        if (org == null) return null;

        OrganizationDto dto = new OrganizationDto();
        dto.setOrgId(org.getOrgId());
        dto.setOrgName(org.getOrgName());
        dto.setOrganizationType(org.getOrganizationType());
        dto.setLogoUrl(org.getLogoUrl());
        dto.setPrimaryColor(org.getPrimaryColor());
        dto.setSubdomain(org.getSubdomain());
        dto.setActive(org.isActive());
        dto.setDateCreated(org.getDateCreated());

        // map party
        if (org.getParty() != null) {
            dto.setPartyId(org.getParty().getPartyId());
            dto.setPartyName(org.getParty().getPartyName());
            dto.setPartyAbbreviation(org.getParty().getAbbreviation());
        }

        return dto;
    }

    /** Scalars only; attaching Party is done in the service. */
    public Organization toEntity(OrganizationCreateRequest req) {
        if (req == null) return null;
        Organization org = new Organization();
        org.setOrgName(req.getOrgName());
        org.setOrganizationType(req.getOrganizationType());
        org.setLogoUrl(req.getLogoUrl());
        org.setPrimaryColor(req.getPrimaryColor());
        org.setSubdomain(req.getSubdomain());
        org.setActive(req.getIsActive());
        return org;
    }

    /** Apply scalars; Party relation handled in service. */
    public void apply(OrganizationUpdateRequest req, Organization org) {
        if (req == null || org == null) return;
        if (req.getOrgName() != null) org.setOrgName(req.getOrgName());
        if (req.getOrganizationType() != null) org.setOrganizationType(req.getOrganizationType());
        if (req.getLogoUrl() != null) org.setLogoUrl(req.getLogoUrl());
        if (req.getPrimaryColor() != null) org.setPrimaryColor(req.getPrimaryColor());
        if (req.getSubdomain() != null) org.setSubdomain(req.getSubdomain());
        if (req.getActive() != null) org.setActive(req.getActive());
    }
}
