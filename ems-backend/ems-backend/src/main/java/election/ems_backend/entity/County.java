package election.ems_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Entity
@Table(
        name = "county",
        uniqueConstraints = @UniqueConstraint(name = "uq_county_name", columnNames = "county_name")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class County {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "county_id", nullable = false, updatable = false)
    private UUID countyId;

    @Column(name = "county_name", nullable = false, unique = true, length = 100)
    private String countyName;
}