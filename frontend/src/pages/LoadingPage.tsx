import { Box, CircularProgress, Typography } from "@mui/material";

/** Show a consistent full-page loading state while Keycloak initializes. */
export function LoadingPage() {
  return (
    <Box
      alignItems="center"
      component="main"
      display="flex"
      flexDirection="column"
      gap={2}
      justifyContent="center"
      minHeight="100vh"
    >
      <CircularProgress aria-label="Loading application" />
      <Typography color="text.secondary">Loading ClientConnect...</Typography>
    </Box>
  );
}
