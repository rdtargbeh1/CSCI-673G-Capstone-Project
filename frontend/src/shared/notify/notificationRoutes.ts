

import type { NotificationDto } from "../services/notificationService";

export type NotificationLink = { href: string; label?: string };

function clean(v?: string | null) {
  return (v ?? "").trim();
}

/**
 * IMPORTANT:
 * Your router paths are:
 * - /operations/submissions
 * - /operations/notifications
 * - /elections/:electionId/submissions
 * - /elections/:electionId/nec-workflow/...
 * - /elections/:electionId/results/...
 *
 * Since notifications only provide relatedTable + relatedId (no electionId),
 * we must route to a page that exists WITHOUT electionId:
 * ✅ /operations/submissions is the best generic landing page for vote submissions.
 *
 * Later, if backend includes electionId, you can route to /elections/:electionId/submissions.
 */
export function resolveNotificationLink(n: NotificationDto): NotificationLink | null {
  const table = clean(n.relatedTable);
  const id = clean(n.relatedId);

  if (!table) return null;

  // ✅ vote submissions: go to operations submissions queue
  if (table === "vote_submission") {
    const qs = id ? `?focus=${encodeURIComponent(id)}` : "";
    return { href: `/operations/submissions${qs}`, label: "Open submission queue" };
  }

  // ✅ tally sheet uploads (you have /operations/tally-sheets)
  if (table === "tally_sheet") {
    const qs = id ? `?focus=${encodeURIComponent(id)}` : "";
    return { href: `/operations/tally-sheets${qs}`, label: "Open tally sheets" };
  }

  // ✅ audit log (you have /admin-security/audit-logs)
  if (table === "audit_log") {
    const qs = id ? `?focus=${encodeURIComponent(id)}` : "";
    return { href: `/admin-security/audit-logs${qs}`, label: "Open audit logs" };
  }

  // ✅ file uploads (you have /admin-security/file-uploads)
  if (table === "file_upload") {
    const qs = id ? `?focus=${encodeURIComponent(id)}` : "";
    return { href: `/admin-security/file-uploads${qs}`, label: "Open file uploads" };
  }

  // ✅ default: show notifications page (never 404)
  // This is better than returning null if you want a predictable route
  return { href: `/operations/notifications`, label: "Open notifications" };
}
