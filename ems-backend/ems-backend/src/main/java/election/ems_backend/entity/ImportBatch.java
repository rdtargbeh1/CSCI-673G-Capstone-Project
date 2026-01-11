package election.ems_backend.entity;


import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Tracks a bulk import session grouping staging rows for validation/processing.
 * Mirrors the import_batch table in the canonical SQL.
 */
@Entity
@Table(name = "import_batch")
@Getter
@Setter
@NoArgsConstructor
public class ImportBatch {

    @Id
    @Column(name = "batch_id", nullable = false)
    private UUID batchId;

    @Column(name = "name")
    private String name;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "row_count")
    private Integer rowCount;

    @Column(name = "validated")
    private Boolean validated;

    @Column(name = "processed")
    private Boolean processed;

    @PrePersist
    public void prePersist() {
        if (batchId == null) batchId = UUID.randomUUID();
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (rowCount == null) rowCount = 0;
        if (validated == null) validated = Boolean.FALSE;
        if (processed == null) processed = Boolean.FALSE;
    }
}