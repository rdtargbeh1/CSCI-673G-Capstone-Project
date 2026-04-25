package election.ems_backend.mapper;


import election.ems_backend.dto.ContestOptionDto;
import election.ems_backend.entity.ContestOption;
import org.springframework.stereotype.Component;

@Component
public class ContestOptionMapper {

    public ContestOptionDto toDto(ContestOption o) {
        if (o == null) return null;

        ContestOptionDto d = new ContestOptionDto();
        d.setOptionId(o.getOptionId());
        d.setContestId(o.getContestId());
        d.setElectionId(o.getElectionId());

        d.setOptionType(o.getOptionType());

        // ✅ election-scoped candidate link
        d.setElectId(o.getElectId());

        d.setOptionLabel(o.getOptionLabel());
        d.setOptionOrder(o.getOptionOrder());
        d.setIsActive(o.isActive());

        d.setDateCreated(o.getDateCreated());
        d.setDateUpdated(o.getDateUpdated());

        // optional UI convenience (safe; won't load unless accessed)
        if (o.getElectionCandidate() != null) {
            var ec = o.getElectionCandidate();

            // Candidate details (master candidate referenced by ElectionCandidate)
            if (ec.getCandidate() != null) {
                var c = ec.getCandidate();

                d.setElectionCandidate(c.getFullName()); // (your DTO field name)

                // ✅ Party comes from Candidate (based on your Candidate model)
                if (c.getParty() != null) {
                    d.setPartyName(c.getParty().getPartyName());
                    d.setAbbreviation(c.getParty().getAbbreviation());
                }
            }

            // NOTE:
            // Your posted ElectionCandidate entity DOES NOT have getParty().
            // So we DO NOT use: ec.getParty()
            // If you later add party to ElectionCandidate, you can switch to that.
        }

        return d;
    }


}
