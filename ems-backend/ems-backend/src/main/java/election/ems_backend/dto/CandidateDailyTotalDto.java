package election.ems_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
@AllArgsConstructor
public class CandidateDailyTotalDto {
    private UUID candidateId;
    private LocalDate day;
    private long votes;
    private long registeredVoters;
    private long ballotsCast;
    private double voteSharePct;
}