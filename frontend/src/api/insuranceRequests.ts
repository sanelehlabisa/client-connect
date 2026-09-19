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
  product_id: string;
  status: string;
};

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
