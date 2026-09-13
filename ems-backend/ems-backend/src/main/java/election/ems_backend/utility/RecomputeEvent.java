package election.ems_backend.utility;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.UUID;

/**
 * Event published after a submission is verified to trigger async recompute.
 */
@Getter
public class RecomputeEvent extends ApplicationEvent {
    private final UUID orgId;
    private final UUID electionId;
    private final UUID actorUserId;

    public RecomputeEvent(Object source, UUID orgId, UUID electionId, UUID actorUserId) {
        super(source);
        this.orgId = orgId;
        this.electionId = electionId;
        this.actorUserId = actorUserId;
    }

    public UUID getOrgId() { return orgId; }
    public UUID getElectionId() { return electionId; }
    public UUID getActorUserId() { return actorUserId; }
}