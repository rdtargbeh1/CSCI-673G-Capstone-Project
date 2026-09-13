package election.ems_backend.mapper;

import election.ems_backend.dto.CandidateCreateRequest;
import election.ems_backend.dto.CandidateDto;
import election.ems_backend.dto.CandidateUpdateRequest;
import election.ems_backend.entity.Candidate;
import election.ems_backend.entity.Party;
import org.springframework.stereotype.Component;

@Component
public class CandidateMapper {

    public CandidateDto toDTO(Candidate candidate){

        if (candidate == null) return null;

        CandidateDto dto = new CandidateDto();
        dto.setCandidateId(candidate.getCandidateId());
        dto.setFullName(candidate.getFullName());
        dto.setPosition(candidate.getPosition());
        dto.setPhotoUrl(candidate.getPhotoUrl());
        dto.setActive(candidate.isActive());
        dto.setIndependent(candidate.isIndependent());

        if (candidate.getParty() != null) {
            dto.setPartyId(candidate.getParty().getPartyId());
            dto.setPartyName(candidate.getParty().getPartyName());
            dto.setAbbreviation(candidate.getParty().getAbbreviation());
        }

        dto.setDateCreated(candidate.getDateCreated());
        dto.setDateUpdated(candidate.getDateUpdated());

        return dto;

    }

    public Candidate toEntity(CandidateCreateRequest req, Party party) {
        if (req == null) return null;

        Candidate c = new Candidate();
        c.setFullName(req.getFullName());
        c.setPosition(req.getPosition());
        c.setPhotoUrl(req.getPhotoUrl());
        c.setActive(true); // default on create

        // Default independent=false unless explicitly true
        boolean isIndependent = Boolean.TRUE.equals(req.getIndependent());
        c.setIndependent(isIndependent);

        // If independent, ensure no party attached at entity level (extra safety)
        if (isIndependent) {
            c.setParty(null);
        } else {
            c.setParty(party);
        }


        return c;
    }

    public void apply(CandidateUpdateRequest req, Candidate entity, Party party) {
        if (req == null || entity == null) return;

        if (req.getFullName() != null) entity.setFullName(req.getFullName());
        if (req.getPosition() != null) entity.setPosition(req.getPosition());
        if (req.getPhotoUrl() != null) entity.setPhotoUrl(req.getPhotoUrl());
        if (req.getIsActive() != null) entity.setActive(req.getIsActive());

        if (req.getIndependent() != null) {
            entity.setIndependent(req.getIndependent());
            // If switching to independent, clear party
            if (req.getIndependent()) {
                entity.setParty(null);
            }
        }

        // If not independent & caller explicitly gave a partyId, attach party
        if (party != null && !entity.isIndependent()) {
            entity.setParty(party);
        }
    }

}
