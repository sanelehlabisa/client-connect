const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type AccidentReport = {
  incident_at: string;
  location: string;
  description: string;
  police_notified: boolean;
  police_case_number: string;
  driver_name: string;
  vehicle_use: "Personal" | "Business";
  witness_details: string;
  other_vehicle_or_property: string;
  third_party_details: string;
  file_names: string[];
};

export type InsuranceRequest = {
  id: string;
  client_id: string;
  client_name: string;
  product_id: string;
  product_name: string;
  request_type: string;
  details: string;
  status: InsuranceRequestStatus;
  provider_claim_number: string | null;
  claims_handler: string | null;
  progress_stage: InsuranceRequestProgressStage;
  progress_updated_at: string;
  created_at: string;
};

export type InsuranceRequestStatus =
  | "Submitted"
  | "Under Review"
  | "Approved"
  | "Changes Required"
  | "Rejected";

export type InsuranceRequestProgressStage =
  | "Provider Acknowledged"
  | "Assessment Scheduled"
  | "Assessment Complete"
  | "Repairs Authorized"
  | "Repair In Progress"
  | "Car Hire Arranged"
  | "Ready for Collection"
  | "Closed";

/** Submit a structured motor-accident report through the protected API. */
export async function submitAccidentReport(
  accessToken: string,
  clientId: string,
  productId: string,
  report: AccidentReport,
): Promise<InsuranceRequest> {
  const response = await fetch(
    `${apiUrl}/clients/${clientId}/insurance-requests`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: productId,
        request_type: "Motor accident claim",
        details: JSON.stringify(report),
      }),
    },
  );

  if (!response.ok) {
    throw new Error("The accident report could not be submitted.");
  }

  return (await response.json()) as InsuranceRequest;
}

/** Load active claims assigned to the authenticated Adviser. */
export async function getAdviserReviewQueue(
  accessToken: string,
  signal?: AbortSignal,
): Promise<InsuranceRequest[]> {
  const response = await fetch(`${apiUrl}/insurance-requests`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error("The claim review queue could not be loaded.");
  }

  return (await response.json()) as InsuranceRequest[];
}

/** Load claim history for the owning Client or assigned Adviser. */
export async function getClientInsuranceRequests(
  accessToken: string,
  clientId: string,
  signal?: AbortSignal,
): Promise<InsuranceRequest[]> {
  const response = await fetch(
    `${apiUrl}/clients/${clientId}/insurance-requests`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    },
  );

  if (!response.ok) {
    throw new Error("Claim progress could not be loaded.");
  }

  return (await response.json()) as InsuranceRequest[];
}

/** Apply one allowed Adviser status transition to a claim. */
export async function updateInsuranceRequestStatus(
  accessToken: string,
  requestId: string,
  status: Exclude<InsuranceRequestStatus, "Submitted">,
): Promise<InsuranceRequest> {
  const response = await fetch(`${apiUrl}/insurance-requests/${requestId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(body?.detail ?? "The claim status could not be updated.");
  }

  return (await response.json()) as InsuranceRequest;
}

/** Advance an approved claim to its next operational milestone. */
export async function updateInsuranceRequestProgress(
  accessToken: string,
  requestId: string,
  stage: InsuranceRequestProgressStage,
): Promise<InsuranceRequest> {
  const response = await fetch(
    `${apiUrl}/insurance-requests/${requestId}/progress`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ stage }),
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(body?.detail ?? "Claim progress could not be updated.");
  }

  return (await response.json()) as InsuranceRequest;
}
