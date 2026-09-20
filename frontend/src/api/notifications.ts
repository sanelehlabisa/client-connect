import { apiUrl } from "../config";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  client_id: string | null;
  client_name: string | null;
  product_id: string | null;
  product_name: string | null;
  created_at: string;
};

/** Load newest-first notifications owned by the current user. */
export async function getNotifications(
  accessToken: string,
  signal?: AbortSignal,
): Promise<NotificationItem[]> {
  const response = await fetch(`${apiUrl}/notifications`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });

  if (!response.ok) {
    throw new Error("Notifications could not be loaded.");
  }

  return (await response.json()) as NotificationItem[];
}

/** Mark one notification belonging to the current user as read. */
export async function markNotificationRead(
  accessToken: string,
  notificationId: string,
): Promise<NotificationItem> {
  const response = await fetch(
    `${apiUrl}/notifications/${notificationId}/read`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error("The notification could not be updated.");
  }

  return (await response.json()) as NotificationItem;
}
