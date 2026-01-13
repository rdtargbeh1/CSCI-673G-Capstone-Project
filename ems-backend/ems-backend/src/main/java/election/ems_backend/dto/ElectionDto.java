package election.ems_backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import election.ems_backend.enums.ElectionType;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class ElectionDto {
    private UUID electionId;
    private String electionName;
    private int year;
    private ElectionType electionType;
    private boolean isActive;
    private LocalDateTime dateCreated;
    private LocalDateTime dateUpdated;

    @JsonProperty("isActive")
    public boolean getIsActive() {
        return isActive;
    }

    @JsonProperty("isActive")
    public void setIsActive(boolean isActive) {
        this.isActive = isActive;
    }


}