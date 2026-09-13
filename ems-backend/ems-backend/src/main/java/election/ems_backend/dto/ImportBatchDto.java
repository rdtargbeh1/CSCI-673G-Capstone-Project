package election.ems_backend.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for ImportBatch
 */
@Data
public class ImportBatchDto {
    private UUID batchId;
    private String name;
    private String description;
    private UUID createdBy;
    private LocalDateTime createdAt;
    private Integer rowCount;
    private Boolean validated;
    private Boolean processed;
}