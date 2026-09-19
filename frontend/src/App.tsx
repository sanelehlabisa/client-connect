import { useEffect, useState } from "react";
import {
  Box,
  Alert,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { useAuth } from "./auth/AuthContext";

type HealthResponse = {
  status: "ok" | "degraded";
  database: "connected" | "unavailable";
};

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/** Display the small landing screen used to verify the development stack. */
export default function App() {
  const auth = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHealth(): Promise<void> {
      try {
        const response = await fetch(`${apiUrl}/health`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("The API health request failed.");
        }
        const result: HealthResponse = await response.json();
        setHealth(result);
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== "AbortError") {
          setHasError(true);
        }
      }
    }

    void loadHealth();
    return () => controller.abort();
  }, []);

  const stackIsReady = health?.status === "ok" && !hasError;
  const adviser = auth.roles.includes("adviser");

  return (
    <Box component="main" sx={{ minHeight: "100vh", py: { xs: 6, md: 10 } }}>
      <Container maxWidth="md">
        <Stack spacing={4}>
          <Box>
            <Typography color="primary" fontWeight={700} gutterBottom>
              RSF ClientConnect
            </Typography>
            <Typography component="h1" variant="h1" gutterBottom>
              Your financial picture, made simple.
            </Typography>
            <Typography color="text.secondary" fontSize="1.1rem" maxWidth={620}>
              A simple workspace for clients to understand their position and
              for advisers to help with goals and insurance requests.
            </Typography>
          </Box>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack
              alignItems={{ xs: "flex-start", sm: "center" }}
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              spacing={2}
            >
              <Box>
                <Typography fontWeight={700}>Development stack</Typography>
                <Typography color="text.secondary">
                  React, FastAPI, PostgreSQL, and MailHog
                </Typography>
              </Box>
              <Chip
                color={stackIsReady ? "success" : "default"}
                label={stackIsReady ? "Ready" : "Connecting..."}
                variant={stackIsReady ? "filled" : "outlined"}
              />
            </Stack>
          </Paper>

          {auth.error && (
            <Alert severity="warning">
              Keycloak is not available yet. Refresh after it has started.
            </Alert>
          )}

          {auth.authenticated ? (
            <Stack alignItems="flex-start" spacing={2}>
              <Typography>
                Signed in as <strong>{auth.displayName}</strong>
              </Typography>
              <Chip
                color="primary"
                label={adviser ? "Adviser" : "Client"}
                variant="outlined"
              />
              <Button onClick={() => void auth.logout()} variant="outlined">
                Log out
              </Button>
            </Stack>
          ) : (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Button
                disabled={!stackIsReady || !auth.initialized}
                onClick={() => void auth.login()}
                size="large"
                variant="contained"
              >
                Log in
              </Button>
              <Button
                disabled={!stackIsReady || !auth.initialized}
                onClick={() => void auth.register()}
                size="large"
                variant="outlined"
              >
                Create client account
              </Button>
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
