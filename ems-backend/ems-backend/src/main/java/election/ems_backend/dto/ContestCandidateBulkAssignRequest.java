package election.ems_backend.dto;


import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class ContestCandidateBulkAssignRequest {

    @NotNull
    private UUID contestId;

    @NotEmpty
    private List<UUID> electIds;

    /**
     * If true: deactivate existing candidate options not in candidateIds
     * If false: only add missing candidates, keep existing as-is
     */
    private boolean replace = false;
}
