package election.ems_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(
        name = "party",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_party_name", columnNames = "party_name"),
                @UniqueConstraint(name = "uq_party_abbreviation", columnNames = "abbreviation")
        }
)
public class Party {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "party_id", nullable = false, updatable = false)
    private UUID partyId;

    @Column(name = "party_name", nullable = false, length = 100)
    private String partyName;

    @Column(name = "abbreviation", nullable = false, length = 10)
    private String abbreviation;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "date_created", updatable = false)
    private LocalDateTime dateCreated;

    @Column(name = "date_updated")
    private LocalDateTime dateUpdated;

    @PrePersist
    void prePersist() {
        if (dateCreated == null) dateCreated = LocalDateTime.now();
        if (dateUpdated == null) dateUpdated = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        dateUpdated = LocalDateTime.now();
    }

    // GETTER & SETTER

}
