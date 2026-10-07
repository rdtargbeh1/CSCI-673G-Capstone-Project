package election.ems_backend.dto;

import lombok.Data;

import java.util.UUID;

/**
 * DTO for creating or updating a chat room member.
 * Used when an admin or supervisor adds a user to a chat room.
 */
@Data
public class ChatRoomMemberCreateRequest {

    /** ID of the user being added to the room */
    private UUID userId;

    /** Role of the user in the chat room: "MEMBER" or "ADMIN" */
    private String roleName;

    /** Whether the user is muted (no notifications) */
    private boolean muted = false;

    /** Whether the membership is enabled */
    private boolean enabled = true;
}
