package election.ems_backend.utility;

import java.time.Instant;
import java.util.UUID;

public record ChatMessageDeletedEvent(
        UUID roomId,
        UUID messageId,
        UUID deleterUserId,
        UUID organizationId,
        String roomDisplayName,
        Instant occurredAt
) {}