package election.ems_backend.entity;


import election.ems_backend.enums.AnomalyKind;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder

@Entity
@Table(name = "anomaly_event")
public class AnomalyEvent {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "anomaly_id", nullable = false, updatable = false)
    private UUID anomalyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false,
            foreignKey = @ForeignKey(name = "anomaly_event_org_id_fkey"))
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "election_id", nullable = false,
            foreignKey = @ForeignKey(name = "anomaly_event_election_id_fkey"))
    private Election election;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "center_id",
            foreignKey = @ForeignKey(name = "anomaly_event_center_id_fkey"))
    private PollingCenter pollingCenter; // nullable per SQL

    // Use enum or String; enum shown here
    @Enumerated(EnumType.STRING)
    @Column(name = "kind", length = 40)
    private AnomalyKind kind;

    // Store JSONB as raw JSON string (can switch to Map later)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "details", columnDefinition = "jsonb")
    private Map<String, Object> details;
//    private String details;


    @Column(name = "date_created")
    private LocalDateTime dateCreated;

    @PrePersist
    void stamp() {
        if (dateCreated == null) dateCreated = LocalDateTime.now();
    }
}
