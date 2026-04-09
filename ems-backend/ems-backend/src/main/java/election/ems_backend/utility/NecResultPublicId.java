package election.ems_backend.utility;


import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/**
 * Composite primary key type for nec_result_public: (election_id, assigned_center_id)
 */
public class NecResultPublicId implements Serializable {
    private UUID electionId;
    private UUID assignedCenterId;

    public NecResultPublicId() {}

    public NecResultPublicId(UUID electionId, UUID assignedCenterId) {
        this.electionId = electionId;
        this.assignedCenterId = assignedCenterId;
    }

    public UUID getElectionId() { return electionId; }
    public UUID getAssignedCenterId() { return assignedCenterId; }

    public void setElectionId(UUID electionId) { this.electionId = electionId; }
    public void setAssignedCenterId(UUID assignedCenterId) { this.assignedCenterId = assignedCenterId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof NecResultPublicId)) return false;
        NecResultPublicId that = (NecResultPublicId) o;
        return Objects.equals(electionId, that.electionId) &&
                Objects.equals(assignedCenterId, that.assignedCenterId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(electionId, assignedCenterId);
    }
}
