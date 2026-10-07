package election.ems_backend.dto;


import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CountyRequest(
        @NotBlank
        @Size(max = 100)
        String countyName
) {}
