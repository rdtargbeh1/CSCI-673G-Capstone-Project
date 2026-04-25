package election.ems_backend.mapper;

import election.ems_backend.dto.VoteTallyCreateRequest;
import election.ems_backend.dto.VoteTallyDto;
import election.ems_backend.dto.VoteTallyUpdateRequest;
import election.ems_backend.entity.*;
import org.springframework.stereotype.Component;

import java.util.UUID;


@Component
public class VoteTallyMapper {

    private static String safe(String s) {
        return s == null ? "" : s;
    }

    private static String displayUser(SystemUser u) {
        if (u == null) return null;

        String full = (safe(u.getFirstName()) + " " + safe(u.getLastName())).trim();
        if (!full.isBlank()) return full;

        if (u.getUserName() != null && !u.getUserName().isBlank()) return u.getUserName();
        return u.getEmail();
    }

    public VoteTallyDto toDTO(VoteTally v) {
        Organization o = v.getOrganization();
        Election e = v.getElection();

        ElectionParty ep = v.getElectionParty();
        ElectionCandidate ec = v.getElectionCandidate();
        Contest c = v.getContest();

        UUID partyId = (ep != null && ep.getId() != null) ? ep.getId().getPartyId() : v.getPartyId();
        String partyName = (ep != null && ep.getParty() != null) ? ep.getParty().getPartyName() : null;
        String abbr = (ep != null && ep.getParty() != null) ? ep.getParty().getAbbreviation() : null;

        // ✅ party null -> INDEPENDENT
        if (partyName == null || partyName.isBlank()) {
            partyName = "INDEPENDENT";
            abbr = null;
        }

        UUID electId = (ec != null) ? ec.getElectId() : v.getElectId();

        // ✅ Candidate name comes from Candidate entity
        String fullName = null;
        if (ec != null && ec.getCandidate() != null) {
            // If Candidate has getFullName()
            fullName = ec.getCandidate().getFullName();

            // If your Candidate uses firstName/lastName instead, use this instead:
            // fullName = (safe(ec.getCandidate().getFirstName()) + " " + safe(ec.getCandidate().getLastName())).trim();
        }

        UUID recomputedById = v.getRecomputedBy() != null ? v.getRecomputedBy().getUserId() : null;
        String recomputedByName = displayUser(v.getRecomputedBy());

        return VoteTallyDto.builder()
                .tallyId(v.getTallyId())

                .orgId(o != null ? o.getOrgId() : null)
                .orgName(o != null ? o.getOrgName() : null)

                .electionId(e != null ? e.getElectionId() : null)
                .electionName(e != null ? e.getElectionName() : null)

                .partyId(partyId)
                .partyName(partyName)
                .abbreviation(abbr)

                .electId(electId)
                .fullName(fullName)

                .contestId(v.getContestId())
                .contestName(c != null ? c.getContestName() : null)

                .voteCount(v.getVoteCount())

                .lastRecomputedAt(v.getLastRecomputedAt())
                .recomputedByUserId(recomputedById)
                .recomputedByUserName(recomputedByName)

                .lastUpdated(v.getLastUpdated())
                .build();
    }
}




//@Component
//public class VoteTallyMapper {
//
//    public VoteTallyDto toDTO(VoteTally v) {
//        Organization o = v.getOrganization();
//        Election e = v.getElection();
//
//        ElectionParty ep = v.getElectionParty();
//        ElectionCandidate ec = v.getElectionCandidate();
//        Contest c = v.getContest();
//
//        UUID partyId = (ep != null && ep.getId() != null) ? ep.getId().getPartyId() : v.getPartyId();
//        String partyName = (ep != null && ep.getParty() != null) ? ep.getParty().getPartyName() : null;
//        String abbr = (ep != null && ep.getParty() != null) ? ep.getParty().getAbbreviation() : null;
//
//        UUID electId = (ec != null) ? ec.getElectId() : v.getElectId();
//        String fullName = null;
//        // If ElectionCandidate has a name/person field, use it. Otherwise keep null.
//        // Example common patterns:
//        // fullName = ec != null ? ec.getFullName() : null;
//        // fullName = (ec != null && ec.getCandidate() != null) ? ec.getCandidate().getFullName() : null;
//
//        UUID recomputedById = v.getRecomputedBy() != null ? v.getRecomputedBy().getUserId() : null;
//
//        return VoteTallyDto.builder()
//                .tallyId(v.getTallyId())
//                .orgId(o != null ? o.getOrgId() : null)
//                .orgName(o != null ? o.getOrgName() : null)
//                .electionId(e != null ? e.getElectionId() : null)
//                .electionName(e != null ? e.getElectionName() : null)
//                .partyId(partyId)
//                .partyName(partyName)
//                .abbreviation(abbr)
//                .electId(electId)
//                .fullName(fullName)
//                .contestId(v.getContestId())
//                .contestName(c != null ? c.getContestName() : null)
//                .voteCount(v.getVoteCount())
//                .lastRecomputedAt(v.getLastRecomputedAt())
//                .recomputedByUserId(recomputedById)
//                .lastUpdated(v.getLastUpdated())
//                .build();
//    }
//
//    public VoteTally toEntity(VoteTallyCreateRequest req,
//                              Organization org,
//                              Election election,
//                              Contest contest) {
//
//        VoteTally v = new VoteTally();
//        v.setOrganization(org);
//        v.setElection(election);
//
//        // Store IDs (works even before DB FK migration)
//        v.setContestId(req.getContestId());
//        v.setPartyId(req.getPartyId());
//        v.setElectId(req.getElectId());
//
//
//        v.setVoteCount(req.getVoteCount());
//        v.setLastRecomputedAt(java.time.LocalDateTime.now());
//        return v;
//    }
//
//    public void apply(VoteTallyUpdateRequest req, VoteTally v) {
//        if (req.getVoteCount() != null) v.setVoteCount(req.getVoteCount());
//        if (req.getPartyId() != null) v.setPartyId(req.getPartyId());
//        if (req.getElectId() != null) v.setElectId(req.getElectId());
//        v.setLastUpdated(java.time.LocalDateTime.now());
//    }
//
//
//}
