package election.ems_backend.entity;

import election.ems_backend.enums.RegistrationStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;


/**
 * Snapshot table entity for published voter rolls.
 * Populated by NEC publish workflow from internal voter_registration.
 *
 * Note: DB table has PRIMARY KEY (voter_id, election_id) for uniqueness per election,
 * but this JPA mapping uses voterId as @Id for simplicity. If you require strict JPA composite mapping,
 * convert this to @IdClass or @EmbeddedId.
 */
@Entity
@Table(name = "voter_registration_public",
        indexes = {
                @Index(name = "idx_vrp_election", columnList = "election_id"),
                @Index(name = "idx_vrp_county", columnList = "county_id"),
                @Index(name = "idx_vrp_district", columnList = "district_id"),
                @Index(name = "idx_vrp_center", columnList = "assigned_center_id")
        })
@Getter
@Setter
@NoArgsConstructor
public class VoterRegistrationPublic {

    @Id
    @Column(name = "voter_id", nullable = false)
    private UUID voterId;

    @Column(name = "election_id", nullable = false)
    private UUID electionId;

    @Column(name = "voter_card_id", length = 100)
    private String voterCardId; // NEC-assigned string ID to show on card

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "picture_url", length = 1000)
    private String pictureUrl;

    @Column(name = "county_id")
    private UUID countyId;

    @Column(name = "district_id")
    private UUID districtId;

    @Column(name = "assigned_center_id")
    private UUID assignedCenterId;

    @Column(name = "polling_place", length = 200)
    private String pollingPlace;

    @Column(name = "registration_status", length = 30)
    private RegistrationStatus registrationStatus = RegistrationStatus.REGISTERED;


    @Column(name = "date_published")
    private LocalDateTime datePublished;
}