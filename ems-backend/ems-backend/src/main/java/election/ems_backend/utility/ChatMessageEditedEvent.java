package election.ems_backend.utility;

import java.time.Instant;
import java.util.UUID;

public record ChatMessageEditedEvent(
        UUID roomId,
        UUID messageId,
        UUID editorUserId,
        UUID organizationId,
        String roomDisplayName,
        Instant occurredAt
) {}
