import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Navigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { LoadingPage } from "./LoadingPage";

/** Let a Client or Adviser continue to the secure Keycloak login screen. */
export function LoginPage() {
  const auth = useAuth();

  if (!auth.initialized) {
    return <LoadingPage />;
  }

  if (auth.authenticated) {
    return <Navigate replace to="/dashboard" />;
  }

  return (
    <Box component="main" sx={{ minHeight: "100vh", py: { xs: 5, md: 9 } }}>
      <Container maxWidth="sm">
        <Stack spacing={4}>
          <Box textAlign="center">
            <Typography color="primary" fontWeight={700} gutterBottom>
              ClientConnect
            </Typography>
            <Typography component="h1" variant="h1" gutterBottom>
              Your finances and adviser, in one place.
            </Typography>
            <Typography color="text.secondary" fontSize="1.05rem">
              Sign in securely to view products, contact your adviser, and
              track requests.
            </Typography>
          </Box>

          <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 } }}>
            <Stack spacing={2.5}>
              <Typography component="h2" fontWeight={700} variant="h6">
                Continue to ClientConnect
              </Typography>

              {auth.error && (
                <Alert severity="warning">
                  Keycloak is unavailable. Check that the development services
                  are running, then refresh this page.
                </Alert>
              )}

              <Button
                disabled={auth.error}
                onClick={() => void auth.login()}
                size="large"
                variant="contained"
              >
                Log in
              </Button>
              <Button
                disabled={auth.error}
                onClick={() => void auth.register()}
                size="large"
                variant="outlined"
              >
                Create client account
              </Button>
              <Typography color="text.secondary" variant="body2">
                Adviser access is assigned by Royal Square. New registrations
                receive Client access only.
              </Typography>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
