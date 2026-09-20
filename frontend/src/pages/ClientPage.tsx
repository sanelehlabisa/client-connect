import { Box, Container } from "@mui/material";
import { Navigate, useParams } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { ClientOverviewPanel } from "../components/ClientOverviewPanel";

/** Show an owned or assigned Client and optional Product-by-ID detail. */
export function ClientPage() {
  const auth = useAuth();
  const { clientId, productId } = useParams<{
    clientId: string;
    productId?: string;
  }>();

  if (!clientId) {
    return <Navigate replace to="/dashboard" />;
  }

  return (
    <Box component="main" minHeight="100vh">
      <AppHeader
        backLabel={
          auth.roles.includes("adviser") ? "Back to clients" : undefined
        }
        backTo={auth.roles.includes("adviser") ? "/dashboard" : undefined}
      />
      <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 4 } }}>
        <ClientOverviewPanel
          clientId={clientId}
          getAccessToken={auth.getAccessToken}
          productId={productId}
        />
      </Container>
    </Box>
  );
}
