import type { ReactNode } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";

import { useAuth } from "./auth/AuthContext";
import { ClientPage } from "./pages/ClientPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoadingPage } from "./pages/LoadingPage";
import { LoginPage } from "./pages/LoginPage";
import { NotificationsPage } from "./pages/NotificationsPage";

/** Send the root URL to the correct first screen. */
function HomeRedirect() {
  const auth = useAuth();

  if (!auth.initialized) {
    return <LoadingPage />;
  }

  const homePath = auth.roles.includes("adviser")
    ? "/dashboard"
    : auth.roles.includes("client")
      ? "/clients/me"
      : "/dashboard";
  return <Navigate replace to={auth.authenticated ? homePath : "/login"} />;
}

/** Keep old proof-of-concept Client links working after the route rename. */
function LegacyClientRedirect() {
  const { clientId } = useParams<{ clientId: string }>();
  return (
    <Navigate
      replace
      to={clientId ? `/clients/${clientId}` : "/dashboard"}
    />
  );
}

/** Require a valid Keycloak session before rendering a private page. */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (!auth.initialized) {
    return <LoadingPage />;
  }

  if (!auth.authenticated) {
    return <Navigate replace to="/login" />;
  }

  return children;
}

/** Define the small route set used by the proof of concept. */
export default function App() {
  return (
    <Routes>
      <Route element={<HomeRedirect />} path="/" />
      <Route element={<LoginPage />} path="/login" />
      <Route
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
        path="/notifications"
      />
      <Route
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
        path="/dashboard"
      />
      <Route
        element={
          <ProtectedRoute>
            <ClientPage />
          </ProtectedRoute>
        }
        path="/clients/:clientId"
      />
      <Route
        element={
          <ProtectedRoute>
            <ClientPage />
          </ProtectedRoute>
        }
        path="/clients/:clientId/products/:productId"
      />
      <Route
        element={
          <ProtectedRoute>
            <LegacyClientRedirect />
          </ProtectedRoute>
        }
        path="/client/:clientId"
      />
      <Route element={<HomeRedirect />} path="*" />
    </Routes>
  );
}
