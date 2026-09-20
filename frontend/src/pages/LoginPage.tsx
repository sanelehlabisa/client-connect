import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { type FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { LoadingPage } from "./LoadingPage";

/** Let a Client or Adviser sign in to the demo application. */
export function LoginPage() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    await auth.login(email.trim(), password);
    setIsSubmitting(false);
  }

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

          <Paper
            component="form"
            onSubmit={(event) => void handleSubmit(event)}
            variant="outlined"
            sx={{ p: { xs: 3, sm: 4 } }}
          >
            <Stack spacing={2.5}>
              <Typography component="h2" fontWeight={700} variant="h6">
                Log in to ClientConnect
              </Typography>

              {auth.error && <Alert severity="error">{auth.error}</Alert>}

              <TextField
                autoComplete="email"
                autoFocus
                label="Email address"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
              <TextField
                autoComplete="current-password"
                label="Password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
              <Button
                disabled={isSubmitting}
                size="large"
                type="submit"
                variant="contained"
              >
                {isSubmitting ? "Logging in..." : "Log in"}
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
