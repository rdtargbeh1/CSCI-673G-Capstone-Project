package election.ems_backend.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class ElectionPartyDto {

    private UUID electionId;
    private UUID partyId;

    private String partyName;
    private String partyAbbreviation;
    private String partyLogoUrl;

    private Integer ballotOrder;
    private boolean isQualified;
}