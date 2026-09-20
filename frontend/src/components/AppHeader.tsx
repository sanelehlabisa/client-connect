import {
  AppBar,
  Box,
  Button,
  Stack,
  SvgIcon,
  Toolbar,
  Typography,
} from "@mui/material";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

type AppHeaderProps = {
  backLabel?: string;
  backTo?: string;
};

/** Small inline icon used by the destructive-looking logout action. */
function LogoutIcon() {
  return (
    <SvgIcon fontSize="small" viewBox="0 0 24 24">
      <path d="M10 17v-2h4V9h-4V7l5 5-5 5Zm-6 4V3h9v2H6v14h7v2H4Z" />
    </SvgIcon>
  );
}

/** Show the shared application header and optional back navigation. */
export function AppHeader({ backLabel, backTo }: AppHeaderProps) {
  const auth = useAuth();
  const roleLabel = auth.roles.includes("adviser")
    ? "Adviser"
    : auth.roles.includes("client")
      ? "Client"
      : "User";
  const homePath = auth.roles.includes("adviser")
    ? "/dashboard"
    : "/clients/me";

  return (
    <AppBar color="inherit" elevation={0} position="static">
      <Toolbar sx={{ flexWrap: "wrap", gap: 2, py: 1 }}>
        {backLabel && backTo && (
          <Button component={Link} to={backTo}>
            {backLabel}
          </Button>
        )}
        <Stack
          alignItems="center"
          component={Link}
          direction="row"
          spacing={1}
          sx={{ color: "inherit", flexGrow: 1, textDecoration: "none" }}
          to={homePath}
        >
          <Box
            aria-hidden="true"
            sx={{
              alignItems: "center",
              bgcolor: "primary.main",
              borderRadius: 1.5,
              color: "primary.contrastText",
              display: "flex",
              fontSize: 13,
              fontWeight: 800,
              height: 32,
              justifyContent: "center",
              width: 32,
            }}
          >
            CC
          </Box>
          <Typography color="primary" fontWeight={800}>
            ClientConnect
          </Typography>
        </Stack>
        <Button component={Link} to="/notifications">
          Notifications
        </Button>
        <Stack alignItems="flex-end" spacing={0}>
          <Typography
            fontWeight={700}
            noWrap
            sx={{ maxWidth: { xs: 100, sm: 180 } }}
            variant="body2"
          >
            {auth.displayName ?? "ClientConnect user"}
          </Typography>
          <Typography color="text.secondary" variant="caption">
            {roleLabel}
          </Typography>
        </Stack>
        <Button
          color="error"
          onClick={() => void auth.logout()}
          startIcon={<LogoutIcon />}
          variant="contained"
        >
          Log out
        </Button>
      </Toolbar>
    </AppBar>
  );
}
