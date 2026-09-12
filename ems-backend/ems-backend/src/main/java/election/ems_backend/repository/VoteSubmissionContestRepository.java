package election.ems_backend.repository;


import election.ems_backend.dto.VoteSubmissionContestVoteDetailView;
import election.ems_backend.entity.VoteSubmissionContest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VoteSubmissionContestRepository extends JpaRepository<VoteSubmissionContest, UUID> {

    List<VoteSubmissionContest> findBySubmissionId(UUID submissionId);
    List<VoteSubmissionContest> findByElectionIdAndContestId(UUID electionId, UUID contestId);

    @Modifying
    @Query("delete from VoteSubmissionContest v where v.submissionId = :submissionId")
    int deleteBySubmissionId(@Param("submissionId") UUID submissionId);


    List<VoteSubmissionContest> findBySubmissionIdOrderByDateCreatedAsc(UUID submissionId);

    List<VoteSubmissionContest> findBySubmissionIdAndContestIdOrderByDateCreatedAsc(UUID submissionId, UUID contestId);

    @Query("""
        select v
        from VoteSubmissionContest v
        where v.submissionId = :submissionId
          and v.contestId = :contestId
          and v.optionId = :optionId
          and coalesce(v.rank, 0) = coalesce(:rank, 0)
    """)
    Optional<VoteSubmissionContest> findUnique(
            @Param("submissionId") UUID submissionId,
            @Param("contestId") UUID contestId,
            @Param("optionId") UUID optionId,
            @Param("rank") Integer rank
    );

    @Modifying
    @Query("""
        delete from VoteSubmissionContest v
        where v.submissionId = :submissionId
          and v.contestId = :contestId
    """)
    int deleteBySubmissionAndContest(@Param("submissionId") UUID submissionId,
                                     @Param("contestId") UUID contestId);

    List<VoteSubmissionContest> findBySubmissionIdAndContestIdAndRankIsNotNullOrderByRankAsc(
            UUID submissionId, UUID contestId
    );


    @Query("""
    select
      v.scvId as scvId,
      v.submissionId as submissionId,
      v.orgId as orgId,
      v.electionId as electionId,
      v.contestId as contestId,
      v.optionId as optionId,
      v.voteValue as voteValue,
      v.rank as rank,

      co.electId as electId,
      cand.candidateId as candidateId,
      cand.fullName as candidateFullName,

      p.partyId as partyId,
      p.partyName as partyName,
      p.abbreviation as partyAbbreviation

    from VoteSubmissionContest v
      join v.option co
      join co.electionCandidate ec
      join ec.candidate cand
      left join cand.party p
    where v.submissionId = :submissionId
    order by v.dateCreated asc
""")
    List<VoteSubmissionContestVoteDetailView> listDetailBySubmission(@Param("submissionId") UUID submissionId);


    @Query("""
    select
      v.scvId as scvId,
      v.submissionId as submissionId,
      v.orgId as orgId,
      v.electionId as electionId,
      v.contestId as contestId,
      v.optionId as optionId,
      v.voteValue as voteValue,
      v.rank as rank,

      co.electId as electId,
      cand.candidateId as candidateId,
      cand.fullName as candidateFullName,

      p.partyId as partyId,
      p.partyName as partyName,
      p.abbreviation as partyAbbreviation

    from VoteSubmissionContest v
      join v.option co
      join co.electionCandidate ec
      join ec.candidate cand
      left join cand.party p
    where v.submissionId = :submissionId
      and v.contestId = :contestId
    order by v.dateCreated asc
""")
    List<VoteSubmissionContestVoteDetailView> listDetailBySubmissionAndContest(
            @Param("submissionId") UUID submissionId,
            @Param("contestId") UUID contestId
    );


    @Query("""
    select
      scv.scvId as scvId,
      scv.submissionId as submissionId,
      scv.orgId as orgId,
      scv.electionId as electionId,
      scv.contestId as contestId,
      ct.contestName as contestName,
      scv.optionId as optionId,
      co.optionLabel as optionLabel,
      scv.voteValue as voteValue,
      scv.rank as rank,
      coalesce(cnt.countyId, null) as countyId,
      coalesce(cnt.countyName, null) as countyName,
      coalesce(dist.districtId, null) as districtId,
      coalesce(dist.districtName, null) as districtName,
      coalesce(pc.centerId, null) as centerId,
      coalesce(pc.centerName, null) as centerName,
      ec.electId as electId,
      cand.candidateId as candidateId,
      cand.fullName as candidateFullName,
      p.partyId as partyId,
      p.abbreviation as partyAbbreviation,
      scv.dateCreated as dateCreated
    from VoteSubmissionContest scv
      join Contest ct on ct.contestId = scv.contestId
      join ContestOption co on co.optionId = scv.optionId

      join VoteSubmission vs on vs.submissionId = scv.submissionId
      join PollingCenter pc on pc.centerId = vs.pollingCenter.centerId

      join District dist on dist.districtId = pc.district.districtId
      join County cnt on cnt.countyId = pc.district.county.countyId

      /* ✅ Option → ElectionCandidate → Candidate → Party
         IMPORTANT: replace "co.electId" if your ContestOption uses another FK
      */
      join ElectionCandidate ec on ec.electId = co.electId
      join Candidate cand on cand.candidateId = ec.candidate.candidateId
      left join Party p on p.partyId = cand.party.partyId

    where scv.orgId = :orgId
      and scv.electionId = :electionId

      and (:contestId is null or scv.contestId = :contestId)
      and (:countyId is null or cnt.countyId = :countyId)
      and (:districtId is null or dist.districtId = :districtId)
      and (:centerId is null or pc.centerId = :centerId)

      and (:candidateId is null or cand.candidateId = :candidateId)
    """)
    Page<SubmissionContestRowView> search(
            @Param("orgId") UUID orgId,
            @Param("electionId") UUID electionId,
            @Param("countyId") UUID countyId,
            @Param("districtId") UUID districtId,
            @Param("centerId") UUID centerId,
            @Param("contestId") UUID contestId,
            @Param("candidateId") UUID candidateId,
            Pageable pageable
    );


    interface SubmissionContestRowView {
        UUID getScvId();
        UUID getSubmissionId();
        UUID getOrgId();
        UUID getElectionId();

        UUID getContestId();
        String getContestName();

        UUID getOptionId();
        String getOptionLabel();

        Integer getVoteValue();
        Integer getRank();

        UUID getCountyId();
        String getCountyName();

        UUID getDistrictId();
        String getDistrictName();

        UUID getCenterId();
        String getCenterName();

        UUID getElectId();
        UUID getCandidateId();
        String getCandidateFullName();

        UUID getPartyId();
        String getPartyAbbreviation();

        java.time.LocalDateTime getDateCreated();
    }

}