package election.ems_backend.utility;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Small utility to compute SHA-256 hex.
 */
public final class HashUtil {

    private HashUtil() {}

    public static String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input == null ? new byte[0] : input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to compute hash", ex);
        }
    }
}