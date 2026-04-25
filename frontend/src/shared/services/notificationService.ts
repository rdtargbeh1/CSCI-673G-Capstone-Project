

import { apiClient } from "../lib/apiClient";

/** ===== Enums match backend ===== */
export type DeliveryMethod = "IN_APP" | "EMAIL" | "SMS" | "SYSTEM";
export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

/**
 * NotificationType is an enum in backend.
 * If you have the exact list in Java, replace this with a strict union.
 * For now keep it flexible while still typed.
 */
export type NotificationType = string;

/** ===== DTOs match backend ===== */
export type NotificationDto = {
  notificationId: string;
  orgId: string;
  userId: string;

  type: NotificationType;
  title: string;
  message?: string | null;

  relatedTable?: string | null;
  relatedId?: string | null;

  isRead: boolean;
  isSeen: boolean;

  dateCreated: string; // LocalDateTime serialized as ISO string
  dateRead?: string | null;
  dateExpires?: string | null;

  priority: NotificationPriority;
  deliveryMethod: DeliveryMethod;

  createdBy?: string | null;
  idempotencyKey?: string | null;
};

export type NotificationCreateRequest = {
  orgId: string;
  userId: string;

  type: NotificationType;
  title: string;

  message?: string | null;
  relatedTable?: string | null;
  relatedId?: string | null;

  priority?: NotificationPriority; // defaults NORMAL in backend :contentReference[oaicite:3]{index=3}
  deliveryMethod?: DeliveryMethod; // defaults IN_APP in backend :contentReference[oaicite:4]{index=4}

  /**
   * If provided, backend will dispatch EMAIL/SMS as side-effect
   * while still persisting a single IN_APP row. :contentReference[oaicite:5]{index=5}
   */
  channels?: DeliveryMethod[];

  dateExpires?: string | null; // LocalDateTime as ISO string
  createdBy?: string | null;

  /** Optional idempotency key */
  idempotencyKey?: string | null;
};

/** ===== Spring Page shape (Page<NotificationDto>) ===== */
export type SpringPage<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number; // current page index
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
};

/** ===== API functions ===== */

export async function publishNotification(req: NotificationCreateRequest) {
  const { data } = await apiClient.post<NotificationDto[]>("/notifications", req);
  return data;
}

export type SearchNotificationsParams = {
  orgId?: string;
  userId?: string;
  type?: NotificationType;
  method?: DeliveryMethod;
  unread?: boolean;

  page?: number;
  size?: number;
  sort?: string; // e.g. "dateCreated,desc"
};

export async function searchNotifications(params: SearchNotificationsParams) {
  const { data } = await apiClient.get<SpringPage<NotificationDto>>("/notifications", {
    params: {
      orgId: params.orgId || undefined,
      userId: params.userId || undefined,
      type: params.type || undefined,
      method: params.method || undefined,
      unread: typeof params.unread === "boolean" ? params.unread : undefined,

      page: params.page ?? 0,
      size: params.size ?? 20,
      sort: params.sort ?? "dateCreated,desc",
    },
  });
  return data;
}

/**
 * NOTE: Your backend controller currently has a small bug:
 * it maps "/unread-count/{userId}" but uses @RequestParam in the method. :contentReference[oaicite:6]{index=6}
 *
 * If you have applied the fix I gave earlier (use @PathVariable),
 * this endpoint works as written below.
 */
export async function getUnreadCount(userId: string) {
  const { data } = await apiClient.get<number>(`/notifications/unread-count/${userId}`);
  return data;
}

export async function markNotificationsRead(userId: string, ids: string[]) {
  const { data } = await apiClient.post<number>(
    `/notifications/mark-read/${userId}`,
    ids
  );
  return data; // number updated
}

export async function markNotificationsSeen(userId: string, ids: string[]) {
  const { data } = await apiClient.post<number>(
    `/notifications/mark-seen/${userId}`,
    ids
  );
  return data; // number updated
}
