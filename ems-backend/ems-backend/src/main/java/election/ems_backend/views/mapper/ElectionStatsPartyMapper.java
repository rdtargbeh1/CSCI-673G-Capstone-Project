package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.ElectionStatsPartyDto;
import election.ems_backend.views.entity.ElectionStatsParty;

public class ElectionStatsPartyMapper {

    public ElectionStatsPartyDto toDto(ElectionStatsParty e) {
        if (e == null) return null;

        return ElectionStatsPartyDto.builder()
                .orgId(e.getId() != null ? e.getId().getOrgId() : null)
                .electionId(e.getId() != null ? e.getId().getElectionId() : null)

                .registeredVoters(e.getRegisteredVoters())
                .ballotsCast(e.getBallotsCast())
                .validVotes(e.getValidVotes())
                .invalidTotal(e.getInvalidTotal())

                .turnoutPct(e.getTurnoutPct())
                .invalidPct(e.getInvalidPct())

                // ✅ NEW
                .centersReported(e.getCentersReported())
                .centersTotal(e.getCentersTotal())
                .reportingPct(e.getReportingPct())
                .build();
    }
}