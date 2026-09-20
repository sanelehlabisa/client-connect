import Keycloak from "keycloak-js";

import { keycloakUrl } from "../config";

/** Shared Keycloak adapter configured for the browser application. */
export const keycloak = new Keycloak({
  url: keycloakUrl,
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? "client-connect",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "client-connect-frontend",
});
