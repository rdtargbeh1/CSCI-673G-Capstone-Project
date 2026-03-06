

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { Badge, Card, Note, OpsPageShell, Table } from "./shared/ops-ui";
import { useAuth } from "../../auth/useAuth";

import {
  searchNotifications,
  markNotificationsRead,
  markNotificationsSeen,
  getUnreadCount,
  type NotificationDto,
} from "../../shared/services/notificationService";

import { resolveNotificationLink } from "../../shared/notify/notificationRoutes";

function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}
function buildTargetLabel(n: NotificationDto): string {
  const rt = safeStr(n.relatedTable).trim();
  const rid = safeStr(n.relatedId).trim();
  if (!rt && !rid) return "—";
  if (rt && rid) return `${rt}:${rid}`;
  return rt || rid;
}

function ModalShell({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/35" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6">
        <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
            <div className="text-base font-extrabold text-slate-900">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-xl border border-slate-200 hover:bg-slate-50"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="px-4 py-4">{children}</div>
        </div>
      </div>
    </>
  );
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { tenant, user } = useAuth();

  const orgId = safeStr(tenant?.orgId).trim();
  const userId = safeStr(user?.userId).trim();

  const [page, setPage] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<NotificationDto | null>(null);

  const canUsePage = !!orgId && !!userId;

  const notificationsQ = useQuery({
    queryKey: ["notifications", "inbox", orgId, userId, page, unreadOnly],
    queryFn: async () => {
      if (!canUsePage) {
        return {
          content: [],
          totalPages: 0,
          totalElements: 0,
          number: 0,
          size: 20,
          first: true,
          last: true,
          numberOfElements: 0,
        };
      }

      return await searchNotifications({
        orgId,
        userId,
        unread: unreadOnly ? true : undefined,
        page,
        size: 20,
        sort: "dateCreated,desc",
      });
    },
    enabled: canUsePage,
    staleTime: 10_000,
    retry: 1,
  });

  const items = notificationsQ.data?.content ?? [];
  const totalPages = notificationsQ.data?.totalPages ?? 0;

  const unreadCountQ = useQuery({
    queryKey: ["notifications", "unreadCount", userId],
    queryFn: async () => {
      if (!userId) return 0;
      return await getUnreadCount(userId);
    },
    enabled: !!userId,
    staleTime: 5_000,
    retry: 1,
  });

  const markSeenM = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!userId || ids.length === 0) return 0;
      return await markNotificationsSeen(userId, ids);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["notifications", "unreadCount", userId] });
    },
  });

  useEffect(() => {
    if (!userId) return;
    if (!items.length) return;

    const unseenIds = items.filter((n) => !n.isSeen).map((n) => n.notificationId);
    if (unseenIds.length > 0) markSeenM.mutate(unseenIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, items.map((x) => `${x.notificationId}:${x.isSeen}`).join("|")]);

  const markReadM = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!userId || ids.length === 0) return 0;
      return await markNotificationsRead(userId, ids);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["notifications", "inbox"] });
      await qc.invalidateQueries({ queryKey: ["notifications", "unreadCount", userId] });
      await notificationsQ.refetch();
      await unreadCountQ.refetch();
    },
  });

  const markAllVisibleRead = () => {
    const unreadIds = items.filter((n) => !n.isRead).map((n) => n.notificationId);
    if (unreadIds.length === 0) return;
    markReadM.mutate(unreadIds);
  };

  function openNotification(n: NotificationDto) {
    // mark as read immediately
    if (!n.isRead) markReadM.mutate([n.notificationId]);

    const link = resolveNotificationLink(n);
    if (link?.href) {
      navigate(link.href);
      return;
    }

    // fallback: details modal (still counts as "read")
    setSelected(n);
    setDetailsOpen(true);
  }

  const headerBadgeText = useMemo(() => {
    const c = unreadCountQ.data ?? 0;
    return c === 1 ? "1 unread" : `${c} unread`;
  }, [unreadCountQ.data]);

  const rows = useMemo(() => {
    return items.map((n) => {
      const msg = n.message?.trim() ? n.message : n.title;
      const target = buildTargetLabel(n);
      const source = safeStr(n.type || "notification");

      const link = resolveNotificationLink(n);

      return [
        <div key={`st-${n.notificationId}`} className="flex items-center gap-2">
          {!n.isRead ? <span className="h-2 w-2 rounded-full bg-blue-600" /> : <span className="h-2 w-2" />}
          <Badge>{n.isRead ? "Read" : "Unread"}</Badge>
        </div>,
        <button
          key={`msg-${n.notificationId}`}
          type="button"
          onClick={() => openNotification(n)}
          className={[
            "w-full text-left hover:underline",
            !n.isRead ? "font-semibold text-slate-900" : "text-slate-700",
          ].join(" ")}
          title={link?.href ? "Open related item" : "Open details"}
        >
          {msg || "—"}
          <div className="mt-1 text-sm text-slate-500">
            {fmtDate(n.dateCreated)} • {safeStr(n.priority)}
            {link?.href ? " • Open" : ""}
          </div>
        </button>,
        <span key={`t-${n.notificationId}`} className="text-base text-slate-600">
          {target}
        </span>,
        <span key={`src-${n.notificationId}`} className="text-base text-slate-700">
          {source}
        </span>,
      ];
    });
  }, [items]);

  return (
    <OpsPageShell
      title="Operations • Notifications"
      subtitle={`Tenant: ${tenant?.orgName ?? "—"} • Alerts and actionable messages`}
      right={<Badge>{headerBadgeText}</Badge>}
    >
      <Card
        title="Inbox"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={markAllVisibleRead}
              disabled={!canUsePage || markReadM.isPending}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
              title="Mark all visible notifications as read"
            >
              Mark visible read
            </button>

            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => {
                  setUnreadOnly(e.target.checked);
                  setPage(0);
                }}
                className="h-4 w-4 accent-(--org-primary)"
                disabled={!canUsePage || notificationsQ.isFetching}
              />
              Unread only
            </label>

            <button
              type="button"
              onClick={() => notificationsQ.refetch()}
              disabled={!canUsePage || notificationsQ.isFetching}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        }
      >
        {!canUsePage ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-base text-amber-800">
            Missing org/user context. Please log in and select a tenant.
          </div>
        ) : notificationsQ.isLoading ? (
          <div className="text-sm text-slate-600">Loading notifications…</div>
        ) : notificationsQ.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {(notificationsQ.error as any)?.message ?? "Failed to load notifications."}
          </div>
        ) : (
          <>
            <Table
              columns={["State", "Message", "Target", "Source"]}
              rows={rows.length ? rows : [[<Badge key="st">—</Badge>, "No notifications.", "—", "—"]]}
            />

            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Page <span className="font-bold">{page + 1}</span> of{" "}
                <span className="font-bold">{Math.max(totalPages, 1)}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                  disabled={page <= 0 || notificationsQ.isFetching}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                  disabled={totalPages === 0 || page >= totalPages - 1 || notificationsQ.isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Note
            title="How users read notifications"
            bullets={[
              "Unread is visually highlighted (dot + bold).",
              "Clicking a notification marks it as Read.",
              "If the entity route exists, it navigates to that page.",
              "If no route exists yet, it opens a details modal instead.",
            ]}
          />
          <Note
            title="Multi-entity support"
            bullets={[
              "Notification routing is centralized in notificationRoutes.ts.",
              "Add mappings per relatedTable as you add new entity pages.",
              "Unknown tables still work via details modal.",
            ]}
          />
        </div>
      </Card>

      {/* Details fallback */}
      <ModalShell
        open={detailsOpen}
        title="Notification"
        onClose={() => {
          setDetailsOpen(false);
          setSelected(null);
        }}
      >
        {!selected ? null : (
          <div className="space-y-3">
            <div>
              <div className="text-sm font-extrabold text-slate-900">{selected.title}</div>
              <div className="mt-1 text-base text-slate-500">
                {fmtDate(selected.dateCreated)} • {safeStr(selected.priority)} • {safeStr(selected.type)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-base text-slate-700">
              {selected.message?.trim() ? selected.message : "—"}
            </div>

            <div className="text-base text-slate-600">
              <span className="font-semibold">Target:</span> {buildTargetLabel(selected)}
            </div>

            {resolveNotificationLink(selected)?.href ? (
              <button
                type="button"
                className="rounded-xl bg-(--org-primary) px-4 py-2 text-base font-semibold text-white"
                onClick={() => navigate(resolveNotificationLink(selected)!.href)}
              >
                Open related item
              </button>
            ) : (
              <div className="text-xs text-slate-500">
                No route mapping exists yet for this notification type.
              </div>
            )}
          </div>
        )}
      </ModalShell>
    </OpsPageShell>
  );
}
