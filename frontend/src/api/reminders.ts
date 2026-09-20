import { apiUrl } from "../config";

export type Reminder = {
  id: string;
  client_id: string;
  client_name: string;
  title: string;
  due_date: string;
  audience: "Client" | "Adviser" | "Both";
  is_completed: boolean;
};

export type ReminderCreate = {
  client_id: string;
  title: string;
  due_date: string;
  audience: Reminder["audience"];
};

/** Load due-date ordered reminders for the current role. */
export async function getReminders(
  accessToken: string,
  signal?: AbortSignal,
): Promise<Reminder[]> {
  const response = await fetch(`${apiUrl}/reminders`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });

  if (!response.ok) {
    throw new Error("Reminders could not be loaded.");
  }

  return (await response.json()) as Reminder[];
}

/** Let an Adviser schedule a reminder for an assigned Client. */
export async function createReminder(
  accessToken: string,
  reminder: ReminderCreate,
): Promise<Reminder> {
  const response = await fetch(`${apiUrl}/reminders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reminder),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(body?.detail ?? "The reminder could not be scheduled.");
  }

  return (await response.json()) as Reminder;
}

/** Mark a reminder visible to the current user as complete. */
export async function completeReminder(
  accessToken: string,
  reminderId: string,
): Promise<Reminder> {
  const response = await fetch(
    `${apiUrl}/reminders/${encodeURIComponent(reminderId)}/complete`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error("The reminder could not be completed.");
  }

  return (await response.json()) as Reminder;
}
