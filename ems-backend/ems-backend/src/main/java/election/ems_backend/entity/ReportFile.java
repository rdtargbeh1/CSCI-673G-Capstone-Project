package election.ems_backend.entity;


import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Stored artifact produced by a report job.
 */
@Entity
@Table(name = "report_file")
@Getter
@Setter
@NoArgsConstructor
public class ReportFile {

    @Id
    @Column(name = "file_id", nullable = false)
    private UUID fileId;

    @Column(name = "snapshot_id", nullable = false)
    private UUID snapshotId;

    @Column(name = "generated_at")
    private OffsetDateTime generatedAt;

    @Column(name = "format")
    private String format;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "storage_uri")
    private String storageUri;

    @Lob
    @Column(name = "file_blob")
    private byte[] fileBlob;

    @Column(name = "checksum")
    private String checksum;

    @Column(name = "status")
    private String status;
}