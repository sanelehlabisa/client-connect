import {
  AppBar,
  Box,
  Button,
  Stack,
  SvgIcon,
  Toolbar,
  Typography,
} from "@mui/material";
import { keyframes } from "@mui/material/styles";
import type { MouseEvent } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

type AppHeaderProps = {
  backLabel?: string;
  backTo?: string;
};

const questionPulse = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-2px) rotate(8deg); }
`;

/** Small inline icon used by the destructive-looking logout action. */
function LogoutIcon() {
  return (
    <SvgIcon fontSize="small" viewBox="0 0 24 24">
      <path d="M17 7 15.59 8.41 18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5-5-5ZM4 5h8V3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8v-2H4V5Z" />
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

  function scrollToChat(event: MouseEvent<HTMLAnchorElement>): void {
    const chat = document.getElementById("client-chat");
    if (chat) {
      event.preventDefault();
      chat.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <AppBar color="inherit" elevation={1} position="sticky" sx={{ top: 0 }}>
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
        {auth.roles.includes("client") && (
          <Button
            color="primary"
            component="a"
            href="#client-chat"
            onClick={scrollToChat}
            size="small"
            startIcon={
              <Box
                component="span"
                sx={{
                  alignItems: "center",
                  animation: `${questionPulse} 1.6s ease-in-out infinite`,
                  bgcolor: "primary.main",
                  borderRadius: "50%",
                  color: "primary.contrastText",
                  display: "inline-flex",
                  fontSize: 13,
                  fontWeight: 900,
                  height: 22,
                  justifyContent: "center",
                  width: 22,
                }}
              >
                ?
              </Box>
            }
            sx={{ fontWeight: 800, textTransform: "none" }}
            variant="outlined"
          >
            Need Financial Advice?
          </Button>
        )}
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
