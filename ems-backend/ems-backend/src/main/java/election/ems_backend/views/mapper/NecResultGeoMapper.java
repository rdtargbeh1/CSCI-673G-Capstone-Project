package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.NecResultGeoDto;
import election.ems_backend.views.entity.NecResultGeo;

public class NecResultGeoMapper {
    public NecResultGeoDto toDto(NecResultGeo e) {
        if (e == null) return null;
        NecResultGeoDto d = new NecResultGeoDto();
        d.setResultId(e.getResultId());
        d.setElectionId(e.getElectionId());
        d.setCenterId(e.getCenterId());
        d.setCenterCode(e.getCenterCode());
        d.setCenterName(e.getCenterName());
        d.setDistrictId(e.getDistrictId());
        d.setDistrictName(e.getDistrictName());
        d.setCountyId(e.getCountyId());
        d.setCountyName(e.getCountyName());
        d.setCandidateVotes(e.getCandidateVotes());
        d.setTotalRegisteredVoters(e.getTotalRegisteredVoters());
        d.setBallotsCast(e.getBallotsCast());
        d.setInvalidBallots(e.getInvalidBallots());
        d.setBlankBallots(e.getBlankBallots());
        d.setRejectedBallots(e.getRejectedBallots());
        d.setSpoiledBallots(e.getSpoiledBallots());
        d.setBallotsIssued(e.getBallotsIssued());
        d.setSource(e.getSource());
        d.setUploadTime(e.getUploadTime());
        return d;
    }
}