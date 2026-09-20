import {
  Alert,
  Box,
  Chip,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import { Navigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { AssignedClientsTable } from "../components/AssignedClientsTable";
import { AppHeader } from "../components/AppHeader";
import { ClientOverviewPanel } from "../components/ClientOverviewPanel";
import { InsuranceReviewQueue } from "../components/InsuranceReviewQueue";

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
        ) : (
          <Stack spacing={3}>
            <Stack alignItems="flex-start" spacing={1}>
              <Chip
                color="primary"
                label={isAdviser ? "Adviser" : "Client"}
                variant="outlined"
              />
              <Typography component="h1" variant="h1">
                {isAdviser ? "Your clients" : "Your financial dashboard"}
              </Typography>
              <Typography color="text.secondary">
                Welcome, {auth.displayName ?? "ClientConnect user"}.
              </Typography>
            </Stack>

            {isAdviser ? (
              <>
                <AssignedClientsTable getAccessToken={auth.getAccessToken} />
                <InsuranceReviewQueue getAccessToken={auth.getAccessToken} />
              </>
            ) : (
              <ClientOverviewPanel getAccessToken={auth.getAccessToken} />
            )}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
