package election.ems_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.UUID;

@Data
@AllArgsConstructor
public class CandidateVoteTotalDto {
    private UUID candidateId;
    private long votes;
}