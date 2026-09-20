import {
  AppBar,
  Box,
  Button,
  Chip,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

type AppHeaderProps = {
  backLabel?: string;
  backTo?: string;
};

/** Show the shared application header and optional back navigation. */
export function AppHeader({ backLabel, backTo }: AppHeaderProps) {
  const auth = useAuth();
  const roleLabel = auth.roles.includes("adviser")
    ? "Adviser"
    : auth.roles.includes("client")
      ? "Client"
      : "User";

  return (
    <AppBar color="inherit" elevation={0} position="static">
      <Toolbar sx={{ gap: 2 }}>
        {backLabel && backTo && (
          <Button component={Link} to={backTo}>
            {backLabel}
          </Button>
        )}
        <Typography color="primary" fontWeight={700} sx={{ flexGrow: 1 }}>
          ClientConnect
        </Typography>
        <Button component={Link} to="/notifications">
          Notifications
        </Button>
        <Stack alignItems="center" direction="row" spacing={1}>
          <Box textAlign="right">
            <Typography
              fontWeight={700}
              noWrap
              sx={{ maxWidth: { xs: 90, sm: 180 } }}
              variant="body2"
            >
              {auth.displayName ?? "ClientConnect user"}
            </Typography>
          </Box>
          <Chip
            color="primary"
            label={roleLabel}
            size="small"
            variant="outlined"
          />
        </Stack>
        <Button onClick={() => void auth.logout()} variant="outlined">
          Log out
        </Button>
      </Toolbar>
    </AppBar>
  );
}
