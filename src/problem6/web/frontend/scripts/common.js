export const TOKEN_KEY = "problem6_session_token";

/**
 * Returns frontend-configured backend base URL.
 *
 * @returns Base URL string for API requests.
 * @behavior Uses runtime config first, then falls back to localhost default.
 */
export function getBaseUrl() {
  const configured = window.APP_CONFIG?.BASE_URL;
  if (typeof configured === "string" && configured.trim().length > 0) {
    return configured.trim();
  }
  return "http://localhost:4000";
}

/**
 * Reads session token from browser storage.
 *
 * @returns Session token string, or empty string when missing.
 */
export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || "";
}

/**
 * Persists or removes session token in browser storage.
 *
 * @param token - Session token value.
 * @returns void.
 * @behavior Removes key when token is empty.
 */
export function setToken(token) {
  if (!token) {
    sessionStorage.removeItem(TOKEN_KEY);
    return;
  }
  sessionStorage.setItem(TOKEN_KEY, token);
}

/**
 * Clears current authentication state from browser storage.
 *
 * @returns void.
 */
export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
}

/**
 * Builds request headers for authenticated API calls.
 *
 * @returns Headers object with JSON content type and optional bearer token.
 */
export function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Validates username input on frontend.
 *
 * @param username - Username candidate.
 * @returns Error message or `null` when valid.
 */
export function validateUsername(username) {
  if (username.trim().length < 3) {
    return "username must be at least 3 characters";
  }
  if (!/^[a-zA-Z0-9_\-.]+$/.test(username.trim())) {
    return "username contains invalid characters";
  }
  return null;
}

/**
 * Validates password input on frontend.
 *
 * @param password - Password candidate.
 * @returns Error message or `null` when valid.
 */
export function validatePassword(password) {
  if (password.length < 8) {
    return "password must be at least 8 characters";
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "password must include letters and numbers";
  }
  return null;
}
