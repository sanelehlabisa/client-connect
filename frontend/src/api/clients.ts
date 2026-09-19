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

export type ClientProfile = {
  id: string;
  name: string;
  email: string;
};

export type ClientCreate = {
  name: string;
  email: string;
};

export type Product = {
  id: string;
  product_type: "GOAL" | "INSURANCE";
  name: string;
  provider: string;
  status: string;
  details: Record<string, unknown>;
};

export type ClientOverview = {
  id: string;
  name: string;
  financial_position: FinancialPosition;
  products: Product[];
};

export type GoalCreate = {
  name: string;
  starting_balance: number;
  target_amount: number;
  start_date: string;
  target_date: string;
};

/** Load one Client when the token owns or is assigned to that profile. */
export async function getClientOverview(
  accessToken: string,
  clientId: string,
  signal?: AbortSignal,
): Promise<ClientOverview> {
  const response = await fetch(`${apiUrl}/clients/${clientId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error("The Client could not be loaded.");
  }

  return (await response.json()) as ClientOverview;
}

/** Load the Client profile linked to the current Keycloak identity. */
export async function getOwnClientOverview(
  accessToken: string,
  signal?: AbortSignal,
): Promise<ClientOverview> {
  const response = await fetch(`${apiUrl}/clients/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error("Your Client profile could not be loaded.");
  }

  return (await response.json()) as ClientOverview;
}

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

/** Create a Client profile assigned to the authenticated Adviser. */
export async function createClientProfile(
  accessToken: string,
  client: ClientCreate,
): Promise<ClientProfile> {
  const response = await fetch(`${apiUrl}/clients`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(client),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(body?.detail ?? "The Client profile could not be created.");
  }

  return (await response.json()) as ClientProfile;
}

/** Add a financial Goal to the current Client's own dashboard. */
export async function createGoal(
  accessToken: string,
  clientId: string,
  goal: GoalCreate,
): Promise<Product> {
  const response = await fetch(`${apiUrl}/clients/${clientId}/goals`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(goal),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(body?.detail ?? "The Goal could not be created.");
  }

  return (await response.json()) as Product;
}
