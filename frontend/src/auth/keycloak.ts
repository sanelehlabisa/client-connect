import Keycloak from "keycloak-js";

/** Shared Keycloak adapter configured for the browser application. */
export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:8080",
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? "rsf-clientconnect",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "rsf-frontend",
});
