package election.ems_backend.entity;


import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Internal NEC voter registration record (authoritative, PII-protected).
 *
 * Notes:
 * - This is the internal table used by NEC staff/systems. It contains encrypted PII fields
 *   (application is responsible for encryption/decryption).
 * - Only NEC actors should be allowed to read/write this entity. Public access is through
 *   the voter_registration_public snapshot which is populated by the publish workflow.
 */

@Entity
@Table(name = "voter_registration",
        indexes = {
                @Index(name = "idx_voter_lookup_hash", columnList = "lookup_hash"),
                @Index(name = "idx_voter_center", columnList = "assigned_center_id"),
                @Index(name = "idx_voter_org", columnList = "org_id")
        })
@Getter
@Setter
public class VoterRegistration {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "voter_id", nullable = false, updatable = false)
    private UUID voterId; // internal UUID PK (DB default/gen_random_uuid for new rows)

    @Column(name = "voter_card_id", length = 100, unique = true)
    private String voterCardId; // NEC assigned human-readable voter id (string)

    @Column(name = "encrypted_full_name")
    private byte[] encryptedFullName;

    @Column(name = "encrypted_national_id")
    private byte[] encryptedNationalId;

    @Column(name = "encrypted_dob")
    private byte[] encryptedDob;

    @Column(name = "lookup_hash", nullable = false, unique = true)
    private String lookupHash;

    @Column(name = "assigned_center_id")
    private UUID assignedCenterId;

    @Column(name = "county_id")
    private UUID countyId;

    @Column(name = "district_id")
    private UUID districtId;

    @Column(name = "precinct_id")
    private UUID centerId;

    @Column(name = "polling_place", length = 200)
    private String pollingPlace;

    @Column(name = "election_id")
    private UUID electionId;

    @Column(name = "geo_lat")
    private Double geoLat;

    @Column(name = "geo_lon")
    private Double geoLon;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registered_by", foreignKey = @ForeignKey(name = "fk_voter_registered_by"))
    private SystemUser registeredBy;

    @Column(name = "registration_source", length = 64)
    private String registrationSource;

    @Column(name = "effective_from")
    private LocalDateTime effectiveFrom;

    @Column(name = "effective_to")
    private LocalDateTime effectiveTo;

    @Column(name = "registration_status", length = 30)
    private String registrationStatus;

    @Column(name = "picture_url", length = 1000)
    private String pictureUrl;

    // Organization that owns/controls this registration (NEC org)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", foreignKey = @ForeignKey(name = "fk_voter_org"))
    private Organization org;


    @Column(name = "date_registered")
    private LocalDateTime dateRegistered;

    @Column(name = "date_updated")
    private LocalDateTime dateUpdated;

    @PrePersist
    public void prePersist() {
        if (voterId == null) {
            throw new IllegalStateException("voterId must be set by application before persisting VoterRegistration");
        }
        if (dateRegistered == null) dateRegistered = LocalDateTime.now();
        if (dateUpdated == null) dateUpdated = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        dateUpdated = LocalDateTime.now();
    }
}