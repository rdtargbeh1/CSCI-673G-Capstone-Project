package election.ems_backend.entity;


import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Entity
@Table(
        name = "polling_place",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_place_center_number",
                        columnNames = {"center_id", "place_number"}
                ),
                @UniqueConstraint(
                        name = "uq_place_code",
                        columnNames = {"code"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PollingPlace {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "place_id", nullable = false, updatable = false)
    private UUID placeId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "center_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_place_center")
    )
    private PollingCenter pollingCenter;

    /** Sequential number within the center: 1, 2, 3, ... */
    @Column(name = "place_number", nullable = false)
    private Integer placeNumber;

    /** Stable code for place, e.g. "33018-1" or "PC-XYZ-01" */
    @Column(name = "code", nullable = false, length = 50)
    private String code;

    /** Optional label like "Room 1", "Hall A" */
    @Column(name = "label", length = 100, unique = true)
    private String label;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
