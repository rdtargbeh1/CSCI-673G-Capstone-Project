
package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.CandidateCountyCompareDto;
import election.ems_backend.views.entity.CandidateCountyCompare;

public class CandidateCountyCompareMapper {

    public CandidateCountyCompareDto toDto(CandidateCountyCompare e) {
        if (e == null) return null;

        CandidateCountyCompareDto d = new CandidateCountyCompareDto();

        if (e.getId() != null) {
            d.setOrgId(e.getId().getOrgId());
            d.setElectionId(e.getId().getElectionId());
            d.setContestId(e.getId().getContestId());
            d.setCountyId(e.getId().getCountyId());
            d.setCandidateId(e.getId().getCandidateId());
        }

        d.setCountyName(e.getCountyName());
        d.setCandidateName(e.getCandidateName());

        d.setPartyId(e.getPartyId());
        d.setPartyName(e.getPartyName());
        d.setPartyCode(e.getPartyCode());

        d.setPartyCandidateVotes(e.getPartyCandidateVotes());
        d.setOfficialCandidateVotes(e.getOfficialCandidateVotes());
        d.setDiffVotes(e.getDiffVotes());

        d.setPartyVoteSharePct(e.getPartyVoteSharePct());
        d.setOfficialVoteSharePct(e.getOfficialVoteSharePct());
        d.setDiffVoteSharePct(e.getDiffVoteSharePct());

        // PARTY coverage
        d.setPartyCentersReported(e.getPartyCentersReported());
        d.setPartyCentersTotal(e.getPartyCentersTotal());
        d.setPartyReportingPct(e.getPartyReportingPct());
        d.setPartyDistrictsReported(e.getPartyDistrictsReported());
        d.setPartyDistrictsTotal(e.getPartyDistrictsTotal());
        d.setPartyCentersStarted(e.getPartyCentersStarted());
        d.setPartyDistrictsStarted(e.getPartyDistrictsStarted());
        d.setPartyCountyStatus(e.getPartyCountyStatus());

        // OFFICIAL coverage
        d.setOfficialCentersReported(e.getOfficialCentersReported());
        d.setOfficialCentersTotal(e.getOfficialCentersTotal());
        d.setOfficialReportingPct(e.getOfficialReportingPct());
        d.setOfficialDistrictsReported(e.getOfficialDistrictsReported());
        d.setOfficialDistrictsTotal(e.getOfficialDistrictsTotal());
        d.setOfficialCentersStarted(e.getOfficialCentersStarted());
        d.setOfficialDistrictsStarted(e.getOfficialDistrictsStarted());
        d.setOfficialCountyStatus(e.getOfficialCountyStatus());

        // flags
        d.setIsComparable(e.getIsComparable());
        d.setIsCoverageAligned(e.getIsCoverageAligned());

        return d;
    }
}
