package election.ems_backend.utility;

public final class QueryUtils {
    private QueryUtils() {}
    public static String normalize(String q) {
        return (q == null || q.isBlank()) ? null : q.trim();
    }
}
