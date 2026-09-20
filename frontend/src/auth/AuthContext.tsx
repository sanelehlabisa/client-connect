import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { apiUrl } from "../config";

const ACCESS_TOKEN_KEY = "client-connect-access-token";

type AuthenticatedUser = {
  subject: string;
  username: string;
  email: string | null;
  roles: string[];
};

type LoginResponse = {
  access_token: string;
  token_type: "bearer";
  user: AuthenticatedUser;
};

type AuthContextValue = {
  initialized: boolean;
  authenticated: boolean;
  error: string | null;
  displayName: string | null;
  roles: string[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | undefined>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Read a useful FastAPI error message without exposing response details. */
async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    return typeof body.detail === "string" ? body.detail : fallback;
  } catch {
    return fallback;
  }
}

/** Share the small demo authentication session with the React application. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const storedToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);

    async function restoreSession(token: string): Promise<void> {
      try {
        const response = await fetch(`${apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          window.localStorage.removeItem(ACCESS_TOKEN_KEY);
          if (response.status !== 401 && isMounted) {
            setError(
              "The saved session could not be checked. Please log in again.",
            );
          }
          return;
        }

        const currentUser = (await response.json()) as AuthenticatedUser;
        if (isMounted) {
          setAccessToken(token);
          setUser(currentUser);
        }
      } catch {
        if (isMounted) {
          setError("ClientConnect could not reach the server. Please try again.");
        }
      } finally {
        if (isMounted) {
          setInitialized(true);
        }
      }
    }

    if (storedToken) {
      void restoreSession(storedToken);
    } else {
      setInitialized(true);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch(`${apiUrl}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          setError(
            await readErrorMessage(
              response,
              "The email address or password is incorrect.",
            ),
          );
          return false;
        }

        const result = (await response.json()) as LoginResponse;
        window.localStorage.setItem(ACCESS_TOKEN_KEY, result.access_token);
        setAccessToken(result.access_token);
        setUser(result.user);
        return true;
      } catch {
        setError("ClientConnect could not reach the server. Please try again.");
        return false;
      }
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    setAccessToken(null);
    setUser(null);
    setError(null);
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | undefined> => {
    return accessToken ?? undefined;
  }, [accessToken]);

  return (
    <AuthContext.Provider
      value={{
        initialized,
        authenticated: Boolean(accessToken && user),
        error,
        displayName: user?.username ?? user?.email ?? null,
        roles: user?.roles ?? [],
        login,
        logout,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Return authentication state and actions from the nearest provider. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return value;
}
