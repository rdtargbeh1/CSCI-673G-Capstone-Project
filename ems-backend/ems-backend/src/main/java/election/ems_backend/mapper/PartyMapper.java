package election.ems_backend.mapper;

import election.ems_backend.dto.PartyCreateRequest;
import election.ems_backend.dto.PartyDto;
import election.ems_backend.dto.PartyUpdateRequest;
import election.ems_backend.entity.Party;
import org.springframework.stereotype.Component;

@Component
public class PartyMapper {

    public PartyDto toDTO(Party p) {
        if (p == null) return null;
        return PartyDto.builder()
                .partyId(p.getPartyId())
                .partyName(p.getPartyName())
                .abbreviation(p.getAbbreviation())
                .logoUrl(p.getLogoUrl())
                .dateCreated(p.getDateCreated())
                .dateUpdated(p.getDateUpdated())
                .build();
    }


    public Party toEntity(PartyCreateRequest req) {
        if (req == null) return null;
        return Party.builder()
                .partyName(req.getPartyName())
                .abbreviation(req.getAbbreviation())
                .logoUrl(req.getLogoUrl())
                .build();
    }

    public void apply(PartyUpdateRequest req, Party p) {
        if (req == null || p == null) return;
        if (req.getPartyName() != null) p.setPartyName(req.getPartyName());
        if (req.getAbbreviation() != null) p.setAbbreviation(req.getAbbreviation());
        if (req.getLogoUrl() != null) p.setLogoUrl(req.getLogoUrl());
    }
}
