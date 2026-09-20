import Keycloak from "keycloak-js";

import { keycloakUrl } from "../config";

/** Shared Keycloak adapter configured for the browser application. */
export const keycloak = new Keycloak({
  url: keycloakUrl,
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? "rsf-clientconnect",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "rsf-frontend",
});
