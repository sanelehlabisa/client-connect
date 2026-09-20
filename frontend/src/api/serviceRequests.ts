import { apiUrl } from "../config";

export type ServiceRequestType =
  | "Policy Document"
  | "Border Letter"
  | "Investment IRP5"
  | "Consultation";

export type ServiceRequestStatus =
  | "Submitted"
  | "In Progress"
  | "Completed";

export type ServiceRequest = {
  id: string;
  client_id: string;
  client_name: string;
  request_type: ServiceRequestType;
  details: string;
  status: ServiceRequestStatus;
  created_at: string;
  updated_at: string;
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

/** Apply the next Adviser-controlled status to a service request. */
export async function updateServiceRequestStatus(
  accessToken: string,
  clientId: string,
  requestId: string,
  status: Exclude<ServiceRequestStatus, "Submitted">,
): Promise<ServiceRequest> {
  const response = await fetch(
    `${apiUrl}/clients/${clientId}/service-requests/${requestId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(body?.detail ?? "The request status could not be updated.");
  }
  return (await response.json()) as ServiceRequest;
}
