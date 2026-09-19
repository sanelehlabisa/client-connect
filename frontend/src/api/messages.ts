const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type ChatMessage = {
  id: string;
  client_id: string;
  sender_name: string;
  sender_role: "Client" | "Adviser";
  body: string;
  sent_by_me: boolean;
  created_at: string;
};

/** Load one protected Client-Adviser conversation oldest-first. */
export async function getMessages(
  accessToken: string,
  clientId: string,
  signal?: AbortSignal,
): Promise<ChatMessage[]> {
  const response = await fetch(`${apiUrl}/clients/${clientId}/messages`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error("The conversation could not be loaded.");
  }

  return (await response.json()) as ChatMessage[];
}

/** Send one text message in an allowed Client-Adviser conversation. */
export async function sendMessage(
  accessToken: string,
  clientId: string,
  body: string,
): Promise<ChatMessage> {
  const response = await fetch(`${apiUrl}/clients/${clientId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body }),
  });

  if (!response.ok) {
    throw new Error("Your message could not be sent.");
  }

  return (await response.json()) as ChatMessage;
}
