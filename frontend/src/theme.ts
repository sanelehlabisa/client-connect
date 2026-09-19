import { createTheme } from "@mui/material/styles";

/** Shared white-and-blue visual theme for the client and adviser views. */
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0B5CAD",
      dark: "#073F78",
      light: "#E7F1FC",
    },
    background: {
      default: "#F5F9FF",
      paper: "#FFFFFF",
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: 'Inter, "Segoe UI", Arial, sans-serif',
    h1: {
      fontSize: "clamp(2rem, 5vw, 3.25rem)",
      fontWeight: 700,
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
  },
});
