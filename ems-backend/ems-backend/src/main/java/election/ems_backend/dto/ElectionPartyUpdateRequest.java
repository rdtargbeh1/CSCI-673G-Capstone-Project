package election.ems_backend.dto;

import lombok.Data;

@Data
public class ElectionPartyUpdateRequest {

    // nullable – if provided, update ballot order
    private Integer ballotOrder;

    // nullable – if provided, update qualification flag
    private Boolean isQualified;
}
