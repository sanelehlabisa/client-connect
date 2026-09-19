import { Box, Container } from "@mui/material";
import { Navigate, useParams } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { ClientOverviewPanel } from "../components/ClientOverviewPanel";

/** Show an owned or assigned Client through the shared financial view. */
export function ClientPage() {
  const auth = useAuth();
  const { clientId } = useParams<{ clientId: string }>();

  if (!clientId) {
    return <Navigate replace to="/dashboard" />;
  }

  return (
    <Box component="main" minHeight="100vh">
      <AppHeader
        backLabel={
          auth.roles.includes("adviser")
            ? "Back to clients"
            : "Back to dashboard"
        }
        backTo="/dashboard"
      />
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <ClientOverviewPanel
          clientId={clientId}
          getAccessToken={auth.getAccessToken}
        />
      </Container>
    </Box>
  );
}
