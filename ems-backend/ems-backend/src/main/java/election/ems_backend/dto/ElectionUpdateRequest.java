package election.ems_backend.dto;

import election.ems_backend.enums.ElectionType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ElectionUpdateRequest {

    @Size(max = 100)
    private String electionName;

    @Min(1900)
    @Max(2100)
    private Integer year;

    private ElectionType electionType;

    private Boolean isActive;

    @Min(0)
    @Max(100)
    private Integer ballotSparePercent;

    private Boolean enforceBallotsGteRegistered;
}