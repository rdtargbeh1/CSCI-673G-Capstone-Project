package election.ems_backend.mapper;

import election.ems_backend.dto.UserCreateRequest;
import election.ems_backend.dto.UserDto;
import election.ems_backend.dto.UserUpdateRequest;
import election.ems_backend.entity.FileUpload;
import election.ems_backend.entity.*;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserDto toDTO(SystemUser user){

        if (user == null) return  null;

        UserDto dto = new UserDto();
        dto.setUserId(user.getUserId());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setUserName(user.getUserName());
        dto.setPosition(user.getPosition());
        dto.setEmail(user.getEmail());
        dto.setPhoneNumber(user.getPhoneNumber());
        dto.setActive(user.isActive());
        dto.setVerified(user.isVerified());

        // role enum -> String
        dto.setRoleName(user.getRole() != null ? user.getRole().getRoleName().name() :null);
        dto.setPartyId(user.getParty() != null ? user.getParty().getPartyId() : null);
        dto.setAssignedCountyId(user.getAssignedCounty() != null ? user.getAssignedCounty().getCountyId() : null);
        dto.setDefaultOrgId(user.getDefaultOrg() != null ? user.getDefaultOrg().getOrgId() : null);

        dto.setLastLogin(user.getLastLogin());
        dto.setDateCreated(user.getDateCreated());
        dto.setDateUpdated(user.getDateUpdated());

        dto.setSigningKeyId(user.getSigningKeyId());

        dto.setFailedLoginAttempts(user.getFailedLoginAttempts());
        dto.setLockedUntil(user.getLockedUntil());
        dto.setLastPasswordChange(user.getLastPasswordChange());

        // Profile photo fields
        dto.setProfileImageUrl(user.getProfileImageUrl());
        dto.setProfileImageUploadId(user.getProfileImageUpload() != null ? user.getProfileImageUpload().getFileId() : null);

        return dto;
    }


    /**
     * Create a new SystemUser from CreateUserRequest.
     * NOTE: Does NOT set relations (role/party/county/org) and does NOT set passwordHash.
     * The service should attach those after lookups and encode the password.
     */
    public SystemUser toEntity(UserCreateRequest req) {
        if (req == null) return null;

        SystemUser u = new SystemUser();
        u.setFirstName(req.getFirstName());
        u.setLastName(req.getLastName());
        u.setUserName(req.getUserName());
        u.setPosition(req.getPosition());
        u.setEmail(req.getEmail());
        u.setPhoneNumber(req.getPhoneNumber());
        u.setProfileImageUrl(req.getProfileImageUrl());

        return u;
    }

    /**
     * Fully-hydrating toEntity for "create" when the service has already
     * loaded references and encoded the password.
     *
     * Overload that accepts an optional resolved FileUpload for profile image.
     * If profileImageUpload is provided we attach it and, if profileImageUrl is not set,
     * copy the upload's file URL into the user's profileImageUrl for convenience.
     */
    public SystemUser toEntity(UserCreateRequest req,
                               UserRole role,
                               Party party,
                               County county,
                               Organization defaultOrg,
                               String encodedPassword,
                               FileUpload profileImageUpload) {
        if (req == null) return null;
        SystemUser u = toEntity(req);
        u.setPassword(encodedPassword); // already encoded by service
        u.setRole(role);
        u.setParty(party);
        u.setAssignedCounty(county);
        u.setDefaultOrg(defaultOrg);

        if (profileImageUpload != null) {
            u.setProfileImageUpload(profileImageUpload);
            if (u.getProfileImageUrl() == null || u.getProfileImageUrl().isBlank()) {
                // copy file url to convenience column if not provided explicitly
                u.setProfileImageUrl(profileImageUpload.getFileUrl());
            }
        }

        return u;
    }


    /**
     * Backwards-compatible overload without FileUpload param.
     */
    public SystemUser toEntity(UserCreateRequest req,
                               UserRole role,
                               Party party,
                               County county,
                               Organization defaultOrg,
                               String encodedPassword) {
        return toEntity(req, role, party, county, defaultOrg, encodedPassword, null);
    }

    /**
     * Apply scalar updates from UpdateUserRequest to an existing entity.
     * Relationships (role/party/county/org) should be set in the service after lookups.
     *
     * Use the overload that accepts a resolved FileUpload when the service resolved profileImageUploadId.
     */
    public void applyUpdate(UserUpdateRequest req, SystemUser user) {
        applyUpdate(req, user, null);
    }

    public void applyUpdate(UserUpdateRequest req, SystemUser user, FileUpload profileImageUpload) {
        if (req == null || user == null) return;

        user.setFirstName(req.getFirstName());
        user.setLastName(req.getLastName());
        user.setUserName(req.getUserName());
        user.setEmail(req.getEmail());
        user.setPhoneNumber(req.getPhoneNumber());

        if (req.getPosition() != null) {
            user.setPosition(req.getPosition());
        }
        // Profile image URL update (explicit)
        if (req.getProfileImageUrl() != null) {
            user.setProfileImageUrl(req.getProfileImageUrl());
        }
        // If a resolved FileUpload is provided, attach it and copy URL if necessary
        if (profileImageUpload != null) {
            user.setProfileImageUpload(profileImageUpload);
            if (user.getProfileImageUrl() == null || user.getProfileImageUrl().isBlank()) {
                user.setProfileImageUrl(profileImageUpload.getFileUrl());
            }
        }
        if (Boolean.TRUE.equals(req.getActive()) || Boolean.FALSE.equals(req.getActive())) {
            user.setActive(req.getActive());
        }
        if (Boolean.TRUE.equals(req.getVerified()) || Boolean.FALSE.equals(req.getVerified())) {
            user.setVerified(req.getVerified());
            if (Boolean.TRUE.equals(req.getVerified())) {
                user.setFailedLoginAttempts(0);
            }
        }
    }


    // ✅ platform-safe DTO mapper (no org-scoped fields)
    public UserDto toDtoPlatform(SystemUser u) {
        if (u == null) return null;

        UserDto dto = new UserDto();
        dto.setUserId(u.getUserId());
        dto.setFirstName(u.getFirstName());
        dto.setLastName(u.getLastName());
        dto.setUserName(u.getUserName());
        dto.setEmail(u.getEmail());

        // ✅ ADD THESE (missing today)
        dto.setPhoneNumber(u.getPhoneNumber());
        dto.setPosition(u.getPosition());
        dto.setRoleName(u.getRole() != null ? u.getRole().getRoleName().name() : null);
        dto.setActive(u.isActive());
        dto.setVerified(u.isVerified());
        dto.setProfileImageUrl(u.getProfileImageUrl());
        dto.setProfileImageUploadId(u.getProfileImageUpload() != null ? u.getProfileImageUpload().getFileId() : null);

        return dto;
    }


}
