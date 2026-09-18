package election.ems_backend.dto;

import election.ems_backend.enums.AssignmentScope;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Read-only operational directory projection.
 *
 * Deliberately excludes password/security/MFA/session/signing-key/account-
 * control fields. Administrative user management must continue using its own
 * DTOs and services.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OperationalContactDto {

    private UUID userId;
    private String fullName;
    private String userName;
    private String position;
    private String roleName;
    private String email;
    private String phoneNumber;
    private String profileImageUrl;

    private AssignmentScope scopeType;

    private UUID countyId;
    private String countyName;

    private UUID districtId;
    private String districtName;

    private UUID centerId;
    private String centerName;

    private UUID placeId;
    private String placeName;
}
