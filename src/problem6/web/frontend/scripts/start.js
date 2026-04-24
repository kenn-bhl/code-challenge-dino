import {
  getBaseUrl,
  setToken,
  validatePassword,
  validateUsername,
} from "./common.js";

const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginResultEl = document.getElementById("loginResult");

/**
 * Sends login request and redirects to scoreboard on success.
 *
 * @returns Promise resolved after UI is updated or redirect starts.
 * @behavior Performs client-side validation before calling backend auth API.
 */
async function login() {
  const baseUrl = getBaseUrl();
  const username = usernameEl.value.trim();
  const password = passwordEl.value;

  const usernameErr = validateUsername(username);
  if (usernameErr) {
    loginResultEl.textContent = usernameErr;
    return;
  }

  const passwordErr = validatePassword(password);
  if (passwordErr) {
    loginResultEl.textContent = passwordErr;
    return;
  }

  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const payload = await res.json();

  if (!payload.success) {
    loginResultEl.textContent = JSON.stringify(payload, null, 2);
    return;
  }

  setToken(payload.data.token);
  window.location.href = "./scoreboard.html";
}

loginBtn.addEventListener("click", () => void login());
