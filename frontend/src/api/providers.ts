const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type ProviderRecommendation = {
  id: string;
  name: string;
  provider_type:
    | "Financial Adviser"
    | "Financial Institution"
    | "Assessor"
    | "Repairer";
  services: string[];
  rating: number | string;
  location: string;
  is_available: boolean;
  adviser_user_id: string | null;
  distance_km: number | null;
};

/** Return the two best seeded Financial Advisers for the Client. */
export async function matchFinancialAdvisers(
  accessToken: string,
  signal?: AbortSignal,
): Promise<ProviderRecommendation[]> {
  const response = await fetch(`${apiUrl}/providers/match`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider_type: "Financial Adviser",
      required_service: "Financial Planning",
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error("Adviser recommendations could not be loaded.");
  }
  return (await response.json()) as ProviderRecommendation[];
}

/** Confirm a chat-enabled matched Adviser for the owning Client. */
export async function selectFinancialAdviser(
  accessToken: string,
  clientId: string,
  providerId: string,
): Promise<void> {
  const response = await fetch(`${apiUrl}/providers/${providerId}/select`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ client_id: clientId }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(body?.detail ?? "The Adviser could not be selected.");
  }
}
