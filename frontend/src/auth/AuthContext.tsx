import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { keycloak } from "./keycloak";

type TokenDetails = {
  name?: string;
  preferred_username?: string;
};

type AuthContextValue = {
  initialized: boolean;
  authenticated: boolean;
  error: boolean;
  displayName: string | null;
  roles: string[];
  login: () => Promise<void>;
  register: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | undefined>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Initialize Keycloak once and share authentication state with React. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function initialize(): Promise<void> {
      try {
        // SHA-256 PKCE needs Web Crypto, which browsers withhold on plain HTTP
        // LAN origins. Keep PKCE everywhere a secure browser context exists.
        const pkceMethod = window.isSecureContext ? "S256" : false;
        const isAuthenticated = await keycloak.init({
          onLoad: "check-sso",
          pkceMethod,
          checkLoginIframe: false,
        });
        if (isMounted) {
          setAuthenticated(isAuthenticated);
        }
      } catch {
        if (isMounted) {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setInitialized(true);
        }
      }
    }

    keycloak.onAuthLogout = () => setAuthenticated(false);
    keycloak.onTokenExpired = () => {
      void keycloak.updateToken(30).catch(() => keycloak.clearToken());
    };

    void initialize();
    return () => {
      isMounted = false;
    };
  }, []);

  const tokenDetails = keycloak.tokenParsed as TokenDetails | undefined;
  const displayName =
    tokenDetails?.name ?? tokenDetails?.preferred_username ?? null;
  const roles = keycloak.realmAccess?.roles ?? [];

  async function login(): Promise<void> {
    await keycloak.login({
      redirectUri: `${window.location.origin}/dashboard`,
    });
  }

  async function register(): Promise<void> {
    await keycloak.register({
      redirectUri: `${window.location.origin}/dashboard`,
    });
  }

  async function logout(): Promise<void> {
    await keycloak.logout({
      redirectUri: `${window.location.origin}/login`,
    });
  }

  async function getAccessToken(): Promise<string | undefined> {
    await keycloak.updateToken(30);
    return keycloak.token;
  }

  return (
    <AuthContext.Provider
      value={{
        initialized,
        authenticated,
        error,
        displayName,
        roles,
        login,
        register,
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
