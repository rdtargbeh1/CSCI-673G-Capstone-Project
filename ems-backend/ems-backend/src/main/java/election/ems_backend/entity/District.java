package election.ems_backend.entity;


import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;


@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

@Entity
@Table(
        name = "district",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"district_name", "county_id"})
        }
)

public class District {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "district_id", nullable = false, updatable = false)
    private UUID districtId;

    @Column(name = "district_name", nullable = false, length =  50)
    private  String districtName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "county_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_district_county"))
    private County county;
}
