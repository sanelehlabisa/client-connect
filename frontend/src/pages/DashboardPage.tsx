import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";

import { useAuth } from "../auth/AuthContext";
import { AssignedClientsTable } from "../components/AssignedClientsTable";

/** Show the correct dashboard shell for the authenticated Keycloak role. */
export function DashboardPage() {
  const auth = useAuth();
  const isAdviser = auth.roles.includes("adviser");
  const isClient = auth.roles.includes("client");

  return (
    <Box component="main" minHeight="100vh">
      <AppBar color="inherit" elevation={0} position="static">
        <Toolbar>
          <Typography color="primary" fontWeight={700} sx={{ flexGrow: 1 }}>
            RSF ClientConnect
          </Typography>
          <Button onClick={() => void auth.logout()} variant="outlined">
            Log out
          </Button>
        </Toolbar>
      </AppBar>

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
              <AssignedClientsTable getAccessToken={auth.getAccessToken} />
            ) : (
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography fontWeight={700} gutterBottom>
                  Financial overview
                </Typography>
                <Typography color="text.secondary">
                  Your financial position and products will appear here in the
                  next ticket.
                </Typography>
              </Paper>
            )}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
