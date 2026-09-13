package election.ems_backend.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminResetPasswordRequest(

        @NotBlank
        String newPassword,
        Boolean sendEmail
) {}