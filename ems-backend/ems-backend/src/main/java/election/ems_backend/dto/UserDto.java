package election.ems_backend.dto;

import lombok.*;
import org.springframework.core.SpringVersion;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDto {

    private UUID userId;
    private String firstName;
    private String lastName;
    private String userName;
    private String position;
    private String email;
    private  String phoneNumber;
    private boolean isActive;
    private boolean isVerified;
    private  String roleName;
    private UUID partyId;              // nullable
    private UUID assignedCountyId;     // nullable
    private UUID defaultOrgId;         // nullable
    private LocalDateTime lastLogin;   // nullable
    private LocalDateTime dateCreated;
    private LocalDateTime dateUpdated;
    private int failedLoginAttempts = 0;
    private LocalDateTime lockedUntil;
    private LocalDateTime lastPasswordChange;
    private UUID signingKeyId;         // NEW: optional signing key id associated with user

    // Profile photo data
    private String profileImageUrl;    // optional external or stored file URL
    private UUID profileImageUploadId; // optional upload id referencing file_u



}
