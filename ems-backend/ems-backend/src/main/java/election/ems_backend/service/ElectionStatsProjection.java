package election.ems_backend.service;

import java.math.BigDecimal;
import java.util.UUID;

public interface ElectionStatsProjection {

    UUID getOrgId();
    UUID getElectionId();

    Integer getRegisteredVoters();
    Integer getBallotsCast();
    Integer getValidVotes();
    Integer getInvalidTotal();

    BigDecimal getTurnoutPct();
    BigDecimal getInvalidPct();



}