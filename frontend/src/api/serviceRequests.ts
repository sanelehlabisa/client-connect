const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type ServiceRequestType =
  | "Policy Document"
  | "Border Letter"
  | "Investment IRP5"
  | "Consultation";

export type ServiceRequest = {
  id: string;
  client_id: string;
  client_name: string;
  request_type: ServiceRequestType;
  details: string;
  status: "Submitted";
  created_at: string;
};

/** Load service requests for an owned or assigned Client. */
export async function getServiceRequests(
  accessToken: string,
  clientId: string,
  signal?: AbortSignal,
): Promise<ServiceRequest[]> {
  const response = await fetch(
    `${apiUrl}/clients/${clientId}/service-requests`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    },
  );

  if (!response.ok) {
    throw new Error("Service requests could not be loaded.");
  }
  return (await response.json()) as ServiceRequest[];
}

/** Submit a document or consultation request for the owning Client. */
export async function createServiceRequest(
  accessToken: string,
  clientId: string,
  requestType: ServiceRequestType,
  details: string,
): Promise<ServiceRequest> {
  const response = await fetch(
    `${apiUrl}/clients/${clientId}/service-requests`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ request_type: requestType, details }),
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(body?.detail ?? "The service request could not be sent.");
  }
  return (await response.json()) as ServiceRequest;
}
