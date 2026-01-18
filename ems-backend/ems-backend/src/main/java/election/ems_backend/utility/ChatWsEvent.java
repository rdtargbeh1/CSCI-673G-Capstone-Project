package election.ems_backend.utility;

import java.time.Instant;
import java.util.UUID;

public record ChatWsEvent(
        String type,
        UUID roomId,
        UUID messageId,
        UUID actorId,
        UUID organizationId,
        String roomDisplayName,
        Instant occurredAt
) {}
