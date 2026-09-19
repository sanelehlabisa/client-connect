const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type Reminder = {
  id: string;
  client_id: string;
  client_name: string;
  title: string;
  due_date: string;
  audience: "Client" | "Adviser" | "Both";
  is_completed: boolean;
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
