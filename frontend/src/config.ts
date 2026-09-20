/** Return a required browser environment value with a useful startup error. */
function requireEnvironmentValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} must be set by the development environment.`);
  }

  return value;
}

export const apiUrl = requireEnvironmentValue(
  "VITE_API_URL",
  import.meta.env.VITE_API_URL,
);

export const keycloakUrl = requireEnvironmentValue(
  "VITE_KEYCLOAK_URL",
  import.meta.env.VITE_KEYCLOAK_URL,
);
