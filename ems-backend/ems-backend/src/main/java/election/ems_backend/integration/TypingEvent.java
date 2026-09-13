package election.ems_backend.integration;

import java.time.Instant;
import java.util.UUID;

public record TypingEvent(
        String type,
        UUID roomId,
        UUID userId,
        boolean typing,
        Instant occurredAt
) {}