import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";

import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { theme } from "./theme";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The root element was not found.");
}

createRoot(rootElement).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AuthProvider>
      <App />
    </AuthProvider>
  </ThemeProvider>,
);
