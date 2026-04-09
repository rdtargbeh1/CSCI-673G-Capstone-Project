package election.ems_backend.utility;

import election.ems_backend.entity.District;

import java.util.UUID;

/**
 * Utility class for generating human-friendly, semi-structured polling center codes.
 *
 * -------------------------------------------------------------------------
 *  POLLING CENTER CODE FORMAT
 * -------------------------------------------------------------------------
 *      PC-CCC-DDD-RRRR
 *
 *  Where:
 *      "PC"      = Fixed prefix meaning "Polling Center"
 *      "CCC"     = First 3 alphabetic characters of the County name
 *      "DDD"     = First 3 alphabetic characters of the District name
 *      "RRRR"    = 4-character random alphanumeric segment from a UUID
 *
 *  Examples:
 *      County: "Montserrado"   District: "Clara Town"
 *          => PC-MON-CLA-A82F
 *
 *      County: "Bomi"          District: "Klay"
 *          => PC-BOM-KLA-39F1
 *
 *      County: "Gb"            District: "Doe"
 *          => PC-GBX-DOE-92AF   (Short names are padded with 'X')
 *
 * -------------------------------------------------------------------------
 *  PURPOSE & BENEFITS
 * -------------------------------------------------------------------------
 *  • Prevent manual mis-coding during elections.
 *  • Makes codes self-describing: users can infer County & District.
 *  • More readable on tally sheets, mobile forms, backend logs, etc.
 *  • Still globally unique due to the random suffix.
 *
 * -------------------------------------------------------------------------
 *  FUTURE EXTENSIBILITY
 * -------------------------------------------------------------------------
 *  - County/district codes may later come from the database rather than names.
 *  - Prefix lengths can be adjusted (e.g., 2+2+4 pattern).
 *  - Random segment can be extended to 6–8 chars for national-scale elections.
 *
 * -------------------------------------------------------------------------
 */
public final class PollingCenterCodeGenerator {

    private PollingCenterCodeGenerator() { }

    /**
     * Generates a stable, human-readable polling center code using:
     *   - 3-letter County prefix
     *   - 3-letter District prefix
     *   - Random 4-character UUID suffix
     *
     * @param district The district entity, which must contain a reference to its county.
     * @return A polling center code formatted as "PC-CCC-DDD-RRRR".
     */
    public static String generateCode(District district) {

        // --- Extract County prefix (first 3 letters) ---
        String countyName = district.getCounty().getCountyName();
        String countyPart = extractPrefix(countyName, 3);

        // --- Extract District prefix (first 3 letters) ---
        String districtName = district.getDistrictName();
        String districtPart = extractPrefix(districtName, 3);

        // --- Generate 4-char random segment from UUID ---
        String randomPart = UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 5)
                .toUpperCase();

        return String.format("PC-%s-%s-%s", countyPart, districtPart, randomPart);
    }

    /**
     * Extracts a prefix (alphabetical only) from a name.
     *
     * Behavior:
     *   - Removes all non-letter characters (spaces, hyphens, numbers, etc.)
     *   - Uppercases the result
     *   - Pads with "X" if the result is shorter than required
     *   - Takes the first `length` characters
     *
     * @param value  The input name (county or district)
     * @param length Number of characters required
     * @return A cleaned, uppercase alphabetic prefix of exact length
     */
    private static String extractPrefix(String value, int length) {
        if (value == null || value.isBlank()) {
            // Fallback, should never happen if data is clean
            return "XXX".substring(0, length);
        }

        // Remove non-alphabetic characters
        String cleaned = value.replaceAll("[^A-Za-z]", "").toUpperCase();

        // If the cleaned name is too short, pad with 'X'
        if (cleaned.length() < length) {
            cleaned = (cleaned + "XXX").substring(0, length);
        }

        // Return exactly `length` chars
        return cleaned.substring(0, length);
    }
}
