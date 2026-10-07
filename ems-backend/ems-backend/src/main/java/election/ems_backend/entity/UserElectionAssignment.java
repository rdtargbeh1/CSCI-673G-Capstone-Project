package election.ems_backend.entity;

import election.ems_backend.enums.AssignmentScope;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
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
        name = "user_election_assignment",
        indexes = {
                @Index(name = "idx_user_election_assignment_user", columnList = "user_id"),
                @Index(name = "idx_user_election_assignment_org", columnList = "org_id"),
                @Index(name = "idx_user_election_assignment_election", columnList = "election_id"),
                @Index(name = "idx_user_election_assignment_scope", columnList = "scope_type"),
                @Index(name = "idx_user_election_assignment_county", columnList = "county_id"),
                @Index(name = "idx_user_election_assignment_district", columnList = "district_id"),
                @Index(name = "idx_user_election_assignment_center", columnList = "center_id"),
                @Index(name = "idx_user_election_assignment_place", columnList = "place_id"),
                @Index(name = "idx_user_election_assignment_user_election", columnList = "user_id,election_id"),
                @Index(name = "idx_user_election_assignment_org_election", columnList = "org_id,election_id")
        }
)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(
        exclude = {
                "user",
                "organization",
                "election",
                "county",
                "district",
                "center",
                "place"
        }
)
public class UserElectionAssignment {

    @Id
    @GeneratedValue
    @UuidGenerator
    @EqualsAndHashCode.Include
    @Column(name = "assignment_id", nullable = false, updatable = false)
    private UUID assignmentId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_user_election_assignment_user"))
    private SystemUser user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "org_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_user_election_assignment_org"))
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "election_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_user_election_assignment_election"))
    private Election election;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope_type", nullable = false, length = 20)
    private AssignmentScope scopeType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "county_id",
            foreignKey = @ForeignKey(name = "fk_user_election_assignment_county"))
    private County county;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "district_id",
            foreignKey = @ForeignKey(name = "fk_user_election_assignment_district"))
    private District district;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "center_id",
            foreignKey = @ForeignKey(name = "fk_user_election_assignment_center"))
    private PollingCenter center;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id",
            foreignKey = @ForeignKey(name = "fk_user_election_assignment_place"))
    private PollingPlace place;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @CreationTimestamp
    @Column(name = "date_created", nullable = false, updatable = false)
    private LocalDateTime dateCreated;

    @UpdateTimestamp
    @Column(name = "date_updated")
    private LocalDateTime dateUpdated;


}