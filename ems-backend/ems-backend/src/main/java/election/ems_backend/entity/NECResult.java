package election.ems_backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Iterator;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(
        name = "nec_result",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_nec_election_contest_center", columnNames = {"election_id", "contest_id", "center_id"})
        },
        indexes = {
                @Index(name = "idx_nec_result_election", columnList = "election_id"),
                @Index(name = "idx_nec_result_center", columnList = "center_id"),
                @Index(name = "idx_nec_result_upload_time", columnList = "upload_time")
        }
)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class NECResult {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "result_id", updatable = false, nullable = false)
    private UUID resultId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "election_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_nec_election"))
    private Election election;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contest_id", nullable = false)
    private Contest contest;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "center_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_nec_center"))
    private PollingCenter pollingCenter;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "candidate_votes", columnDefinition = "jsonb", nullable = false)
    private JsonNode candidateVotes;

    @Column(name = "total_registered_voters", nullable = false)
    private Integer totalRegisteredVoters;

    @Column(name = "ballots_cast", nullable = false)
    private Integer ballotsInBox;

    @Column(name = "invalid_ballots", nullable = false)
    private Integer invalidBallots = 0;

    @Column(name = "unmarked_ballots", nullable = false)
    private Integer unmarkedBallots = 0;

    @Column(name = "unused_ballots", nullable = false)
    private Integer unusedBallots = 0;

    @Column(name = "rejected_ballots", nullable = false)
    private Integer rejectedBallots = 0;

    @Column(name = "spoiled_ballots", nullable = false)
    private Integer spoiledBallots = 0;

    @Column(name = "source", nullable = false, length = 100)
    private String source;

    @Column(name = "upload_time")
    private LocalDateTime uploadTime = LocalDateTime.now();

    // ✅ Keep DB column name is_published, but force JSON field to "isPublished"
    @JsonProperty("isPublished")
    @Column(name = "is_published", nullable = false)
    private boolean isPublished = false;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "published_until")
    private LocalDateTime publishedUntil;

    // cryptographic
    @Column(name = "result_signature")
    private String resultSignature;

    @Column(name = "result_signer_key_id")
    private UUID resultSignerKeyId;

    @Column(name = "chain_hash")
    private String chainHash;

    /**
     * ✅ Computed Valid Votes:
     * Sum(candidateVotes) and expose as JSON field "validVotes"
     *
     * This fixes frontend "Valid Votes = 0" when admin endpoint returns raw rows.
     */
    @JsonProperty("validVotes")
    public int getValidVotes() {
        return sumVotes(candidateVotes);
    }

    private static int sumVotes(JsonNode node) {
        if (node == null || node.isNull() || node.isMissingNode()) return 0;

        int total = 0;

        // Most common: {"candId": 10, "candId2": 5}
        if (node.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> it = node.fields();
            while (it.hasNext()) {
                Map.Entry<String, JsonNode> e = it.next();
                total += safeInt(e.getValue());
            }
            return total;
        }

        // Safety: [[candId,10], ...] OR [{candidateId:..., votes:...}, ...]
        if (node.isArray()) {
            for (JsonNode item : node) {
                if (item == null || item.isNull()) continue;

                if (item.isArray() && item.size() >= 2) {
                    total += safeInt(item.get(1));
                    continue;
                }

                if (item.isObject()) {
                    JsonNode vv =
                            item.get("votes") != null ? item.get("votes") :
                                    item.get("totalVotes") != null ? item.get("totalVotes") :
                                            item.get("voteTotal") != null ? item.get("voteTotal") :
                                                    item.get("count");
                    total += safeInt(vv);
                }
            }
            return total;
        }

        // Scalar fallback
        return safeInt(node);
    }

    private static int safeInt(JsonNode v) {
        if (v == null || v.isNull() || v.isMissingNode()) return 0;
        if (v.isInt() || v.isLong()) return v.asInt(0);
        if (v.isNumber()) return (int) Math.round(v.asDouble(0));
        if (v.isTextual()) {
            try {
                return Integer.parseInt(v.asText().trim());
            } catch (Exception ignore) {
                return 0;
            }
        }
        return 0;
    }

    @PrePersist
    public void prePersist() {
        if (uploadTime == null) uploadTime = LocalDateTime.now();
        if (invalidBallots == null) invalidBallots = 0;
        if (unmarkedBallots == null) unmarkedBallots = 0;
        if (rejectedBallots == null) rejectedBallots = 0;
        if (spoiledBallots == null) spoiledBallots = 0;
        if (unusedBallots == null) unusedBallots = 0;
        if (totalRegisteredVoters == null) totalRegisteredVoters = 0;
        if (ballotsInBox == null) ballotsInBox = 0;
    }


}

