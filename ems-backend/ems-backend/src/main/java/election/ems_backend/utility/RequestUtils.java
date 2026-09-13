package election.ems_backend.utility;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Small request helper to extract client IP and user agent in a consistent way.
 */
public final class RequestUtils {

    private RequestUtils() {}

    /**
     * Get the client IP using X-Forwarded-For (could be a comma list) then fallback to remoteAddr.
     * If you are behind a proxy/load balancer ensure it sets X-Forwarded-For and your gateway is trusted.
     */
    public static String getClientIp(HttpServletRequest req) {
        if (req == null) return null;
        String xf = req.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }

    public static String getUserAgent(HttpServletRequest req) {
        if (req == null) return null;
        String ua = req.getHeader("User-Agent");
        return ua != null ? ua : "";
    }
}