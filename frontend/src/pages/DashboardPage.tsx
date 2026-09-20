import { Alert, Box, Container } from "@mui/material";
import { Navigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { AssignedClientsTable } from "../components/AssignedClientsTable";
import { AppHeader } from "../components/AppHeader";
import { ClientOverviewPanel } from "../components/ClientOverviewPanel";

/** Show the correct dashboard shell for the authenticated demo role. */
export function DashboardPage() {
  const auth = useAuth();
  const isAdviser = auth.roles.includes("adviser");
  const isClient = auth.roles.includes("client");

  if (isClient && !isAdviser) {
    return <Navigate replace to="/clients/me" />;
  }

  return (
    <Box component="main" minHeight="100vh">
      <AppHeader />

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        {!isAdviser && !isClient ? (
          <Alert severity="error">
            This account does not have a ClientConnect role. Contact Royal
            Square for access.
          </Alert>
        ) : isAdviser ? (
          <AssignedClientsTable getAccessToken={auth.getAccessToken} />
        ) : (
          <ClientOverviewPanel getAccessToken={auth.getAccessToken} />
        )}
      </Container>
    </Box>
  );
}
