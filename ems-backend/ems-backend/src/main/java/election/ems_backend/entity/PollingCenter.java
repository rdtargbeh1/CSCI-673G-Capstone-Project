package election.ems_backend.entity;


import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;


/**
 * PollingCenter entity.
 * Added latitude / longitude fields and Lombok getters/setters to support DTO enrichment.
 *
 * Make sure your DB schema has columns "latitude" and "longitude" (DOUBLE PRECISION / numeric).
 * If not, apply a migration such as:
 *
 * ALTER TABLE polling_center ADD COLUMN latitude DOUBLE PRECISION;
 * ALTER TABLE polling_center ADD COLUMN longitude DOUBLE PRECISION;
 */


@Entity
@Table(
        name = "polling_center",
        uniqueConstraints = @UniqueConstraint(name = "uq_center_code", columnNames = "code"),
        indexes = {
                @Index(name = "idx_center_district", columnList = "district_id"),
                @Index(name = "idx_center_name_ci", columnList = "center_name") // optional, helps LIKE
        }
)

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PollingCenter {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "center_id", nullable = false, updatable = false)
    private UUID centerId;

    @Column(name = "center_name", nullable = false, length = 150)
    private String centerName;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "district_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_center_district"))
    private District district;

    // Optional geolocation columns used by frontend map/enrichment
    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

}


