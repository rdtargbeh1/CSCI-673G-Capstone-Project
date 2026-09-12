package election.ems_backend.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class ReportRequest {
    private UUID electionId;
    private UUID countyId;
    private UUID districtId;
    private UUID centerId;
    private UUID candidateId;
    private UUID partyId;
    private String format; // CSV | XLSX | PDF
}