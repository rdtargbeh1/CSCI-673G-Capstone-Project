package election.ems_backend.dto;

import lombok.Data;

import java.util.UUID;

/**
 * Minimal create request for registering a voter at a center.
 * nationalId is required (used to compute a deterministic lookup hash).
 * Note: sensitive fields should be sent over TLS and handled server-side (encrypted).
 */
@Data
public class VoterRegistrationCreateRequest {
    // optional: allow client to supply voterCardId, otherwise server will accept null
    private String voterCardId;

    // optional: allow client to supply voterId (internal) but normally server will generate
    private UUID voterId;

    private String fullName;     // plaintext in request; server will store encrypted bytes (or use KMS)
    private String nationalId;   // plaintext in request; used to compute lookup_hash (HMAC)
    private String dob;          // optional date-of-birth string; server may store encrypted bytes

    // assigned center should be supplied as assignedCenterId
    private UUID assignedCenterId;
    private String pollingPlace;
    private UUID electionId;
    private Double geoLat;
    private Double geoLon;
    private UUID registeredBy;       // actor id (optional; server can set from authenticated user)
    private String registrationSource;
    private String effectiveFrom;    // ISO datetime string optional
    private String effectiveTo;
}