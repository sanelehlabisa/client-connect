import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "./auth/AuthContext";
import { DashboardPage } from "./pages/DashboardPage";
import { LoadingPage } from "./pages/LoadingPage";
import { LoginPage } from "./pages/LoginPage";

/** Send the root URL to the correct first screen. */
function HomeRedirect() {
  const auth = useAuth();

  if (!auth.initialized) {
    return <LoadingPage />;
  }

  return <Navigate replace to={auth.authenticated ? "/dashboard" : "/login"} />;
}

/** Require a valid Keycloak session before rendering private pages. */
function ProtectedDashboard() {
  const auth = useAuth();

  if (!auth.initialized) {
    return <LoadingPage />;
  }

  if (!auth.authenticated) {
    return <Navigate replace to="/login" />;
  }

  return <DashboardPage />;
}

/** Define the small route set used by the proof of concept. */
export default function App() {
  return (
    <Routes>
      <Route element={<HomeRedirect />} path="/" />
      <Route element={<LoginPage />} path="/login" />
      <Route element={<ProtectedDashboard />} path="/dashboard" />
      <Route element={<HomeRedirect />} path="*" />
    </Routes>
  );
}
