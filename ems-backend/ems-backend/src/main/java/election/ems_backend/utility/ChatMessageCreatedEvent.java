package election.ems_backend.utility;

import election.ems_backend.entity.Organization;

import java.util.UUID;

public record ChatMessageCreatedEvent(
        UUID roomId,
        UUID messageId,
        UUID senderUserId,
        Organization organization,
        String roomDisplayName // may be null for DMs
) {}