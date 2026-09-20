import { AppBar, Button, Toolbar, Typography } from "@mui/material";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

type AppHeaderProps = {
  backLabel?: string;
  backTo?: string;
};

/** Show the shared application header and optional back navigation. */
export function AppHeader({ backLabel, backTo }: AppHeaderProps) {
  const auth = useAuth();

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
        <Button onClick={() => void auth.logout()} variant="outlined">
          Log out
        </Button>
      </Toolbar>
    </AppBar>
  );
}
