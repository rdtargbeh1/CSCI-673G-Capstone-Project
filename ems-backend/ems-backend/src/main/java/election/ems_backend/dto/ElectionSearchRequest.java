package election.ems_backend.dto;

import election.ems_backend.enums.ElectionType;

public record ElectionSearchRequest(
        String q,                // matches name contains (case-insensitive)
        Integer year,            // exact year
        ElectionType type,       // by type
        Boolean active           // isActive filter
) {
    public static ElectionSearchRequest of(String q, Integer year, ElectionType type, Boolean active) {
        return new ElectionSearchRequest(q, year, type, active);
    }
}