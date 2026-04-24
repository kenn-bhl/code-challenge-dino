import { getBaseUrl, validatePassword, validateUsername } from "./common.js";

const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");
const confirmPasswordEl = document.getElementById("confirmPassword");
const registerBtn = document.getElementById("registerBtn");
const registerResultEl = document.getElementById("registerResult");

/**
 * Sends register request after validating user input.
 *
 * @returns Promise resolved after UI feedback is updated.
 * @behavior Requires password confirmation and redirects to login page after success.
 */
async function register() {
  const baseUrl = getBaseUrl();
  const username = usernameEl.value.trim();
  const password = passwordEl.value;
  const confirmPassword = confirmPasswordEl.value;

  const usernameErr = validateUsername(username);
  if (usernameErr) {
    registerResultEl.textContent = usernameErr;
    return;
  }

  const passwordErr = validatePassword(password);
  if (passwordErr) {
    registerResultEl.textContent = passwordErr;
    return;
  }

  if (password !== confirmPassword) {
    registerResultEl.textContent = "confirm password does not match";
    return;
  }

  const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const payload = await res.json();

  if (!payload.success) {
    // Backend returns 409 when username already exists.
    registerResultEl.textContent = JSON.stringify(payload, null, 2);
    return;
  }

  registerResultEl.textContent = "register successful, redirecting to login page...";
  window.setTimeout(() => {
    window.location.href = "./start.html";
  }, 800);
}

registerBtn.addEventListener("click", () => void register());
