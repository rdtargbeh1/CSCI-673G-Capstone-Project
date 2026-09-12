package election.ems_backend.utility;

import election.ems_backend.entity.Organization;

import java.time.Instant;
import java.util.UUID;

public record ChatMessageCreatedEvent(
        UUID roomId,
        UUID messageId,
        UUID senderUserId,
        UUID organizationId,
        String roomDisplayName, // may be null for DMs
        Instant occurredAt
) {}