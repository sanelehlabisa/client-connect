const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type MoneyValue = number | string;

export type FinancialPosition = {
  assets: MoneyValue;
  liabilities: MoneyValue;
  net_worth: MoneyValue;
  monthly_income: MoneyValue;
  monthly_expenses: MoneyValue;
};

export type ClientSummary = {
  id: string;
  name: string;
  financial_position: FinancialPosition;
  product_count: number;
  pending_actions: number;
};

/** Load the clients assigned to the Adviser represented by the access token. */
export async function getAssignedClients(
  accessToken: string,
  signal?: AbortSignal,
): Promise<ClientSummary[]> {
  const response = await fetch(`${apiUrl}/clients`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error("Assigned clients could not be loaded.");
  }

  return (await response.json()) as ClientSummary[];
}
