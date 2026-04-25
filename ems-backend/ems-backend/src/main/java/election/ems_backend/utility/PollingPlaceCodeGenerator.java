package election.ems_backend.utility;

import election.ems_backend.entity.District;
import election.ems_backend.entity.PollingCenter;

import java.util.UUID;

/**
 * Generates human-readable, semi-structured codes for Polling Places.
 *
 * -------------------------------------------------------------------------
 *  POLLING PLACE CODE FORMAT
 * -------------------------------------------------------------------------
 *      PP-DDD-CCC-RRRRR
 *
 *  Where:
 *      "PP"      = Fixed prefix meaning "Polling Place"
 *      "DDD"     = First 3 alphabetic characters of the District name
 *      "CCC"     = First 3 alphabetic characters of the Center name
 *      "RRRRR"   = 5-character random segment from a UUID
 *
 *  Example:
 *      District: "Clara Town"
 *      Center:   "Clara Town Community School"
 *      => PP-CLA-CLA-A91F2
 *
 *  NOTE:
 *  - The random part ensures global uniqueness even if district/center names repeat.
 *  - We rely on DB UNIQUE(code) + a small retry loop in the service for safety.
 */
public final class PollingPlaceCodeGenerator {

    private PollingPlaceCodeGenerator() { }

    /**
     * Generate a polling place code based on district + center names.
     *
     * @param district The district of the center (for the first 3 letters).
     * @param center   The polling center (for the next 3 letters).
     * @return Code formatted as "PP-DDD-CCC-RRRRR".
     */
    public static String generateCode(District district, PollingCenter center) {
        String districtPart = extractPrefix(district.getDistrictName(), 3);
        String centerPart   = extractPrefix(center.getCenterName(), 3);

        String randomPart = UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 5)
                .toUpperCase();

        return String.format("PP-%s-%s-%s", districtPart, centerPart, randomPart);
    }

    /**
     * Normalize a name to an uppercase alphabetic prefix of fixed length.
     * - Removes non-letters
     * - Uppercases
     * - Pads with 'X' if too short
     */
    private static String extractPrefix(String value, int length) {
        if (value == null || value.isBlank()) {
            return "XXX".substring(0, length);
        }

        String cleaned = value.replaceAll("[^A-Za-z]", "").toUpperCase();

        if (cleaned.length() < length) {
            cleaned = (cleaned + "XXX").substring(0, length);
        }

        return cleaned.substring(0, length);
    }
}
