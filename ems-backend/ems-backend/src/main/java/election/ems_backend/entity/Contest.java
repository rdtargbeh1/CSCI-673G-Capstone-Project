package election.ems_backend.entity;


import election.ems_backend.enums.ContestCategory;
import election.ems_backend.enums.ContestScopeType;
import election.ems_backend.enums.ContestStatus;
import election.ems_backend.enums.ContestVoteMethod;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * JPA mapping for contest table.
 */
@Entity
@Table(name = "contest")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Contest {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "contest_id", nullable = false, updatable = false)
    private UUID contestId;

    // ---- required parent ----
    @Column(name = "election_id", nullable = false)
    private UUID electionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "election_id", insertable = false, updatable = false)
    private Election election;

    // ---- display ----
    @Column(name = "contest_name", nullable = false, length = 255)
    private String contestName;

    // ---- structured classification ----
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private ContestCategory category = ContestCategory.OTHER;

    // ---- scope ----
    @Enumerated(EnumType.STRING)
    @Column(name = "scope_type", nullable = false, length = 30)
    private ContestScopeType scopeType = ContestScopeType.NATIONAL;

    @Column(name = "county_id")
    private UUID countyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "county_id", insertable = false, updatable = false)
    private County county;

    @Column(name = "district_id")
    private UUID districtId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "district_id", insertable = false, updatable = false)
    private District district;

    // ---- voting method + rules ----
    @Enumerated(EnumType.STRING)
    @Column(name = "vote_method", nullable = false, length = 30)
    private ContestVoteMethod voteMethod = ContestVoteMethod.SINGLE_CHOICE;

    @Column(name = "seats", nullable = false)
    private int seats = 1;

    @Column(name = "max_selections", nullable = false)
    private int maxSelections = 1;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    // ---- lifecycle ----
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ContestStatus status = ContestStatus.DRAFT;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @CreationTimestamp
    @Column(name = "date_created", nullable = false, updatable = false)
    private LocalDateTime dateCreated;

    @UpdateTimestamp
    @Column(name = "date_updated", nullable = false)
    private LocalDateTime dateUpdated;

    @PrePersist
    public void prePersist() {
        if (category == null) category = ContestCategory.OTHER;
        if (scopeType == null) scopeType = ContestScopeType.NATIONAL;
        if (voteMethod == null) voteMethod = ContestVoteMethod.SINGLE_CHOICE;
        if (status == null) status = ContestStatus.DRAFT;

        if (seats <= 0) seats = 1;
        if (maxSelections <= 0) maxSelections = 1;

        // Keep your DB CHECK happy; DB will still enforce as the final gate.
        if (maxSelections < seats) maxSelections = seats;
    }

}