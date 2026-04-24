import {
  authHeaders,
  clearSession,
  getBaseUrl,
  getToken,
} from "./common.js";

const MISSION_ID_KEY = "problem6_current_action_id";
const MISSION_EXPIRES_KEY = "problem6_current_action_expires_at";

const logoutBtn = document.getElementById("logoutBtn");
const startMissionBtn = document.getElementById("startMission");
const completeMissionBtn = document.getElementById("completeMission");
const currentExpiresAtEl = document.getElementById("currentExpiresAt");
const actionResultEl = document.getElementById("actionResult");
const refreshBtn = document.getElementById("refresh");
const leaderboardEl = document.getElementById("leaderboard");

const token = getToken();
if (!token) {
  window.location.href = "./start.html";
}

const baseUrl = getBaseUrl();

let stream;

/**
 * Reads current mission state from browser storage.
 *
 * @returns Object containing mission action id and expiration string.
 */
function getMissionState() {
  return {
    actionId: sessionStorage.getItem(MISSION_ID_KEY) || "",
    expiresAt: sessionStorage.getItem(MISSION_EXPIRES_KEY) || "",
  };
}

/**
 * Persists mission state and refreshes mission expiry display.
 *
 * @param actionId - Current mission identifier.
 * @param expiresAt - Mission expiration timestamp in ISO format.
 * @returns void.
 * @behavior Clears storage keys when `actionId` is empty.
 */
function setMissionState(actionId, expiresAt) {
  if (!actionId) {
    sessionStorage.removeItem(MISSION_ID_KEY);
    sessionStorage.removeItem(MISSION_EXPIRES_KEY);
  } else {
    sessionStorage.setItem(MISSION_ID_KEY, actionId);
    sessionStorage.setItem(MISSION_EXPIRES_KEY, expiresAt);
  }
  const state = getMissionState();
  currentExpiresAtEl.textContent = state.expiresAt || "(none)";
}

/**
 * Renders leaderboard items into the UI list.
 *
 * @param items - Leaderboard rows from backend API.
 * @returns void.
 */
function renderLeaderboard(items = []) {
  leaderboardEl.innerHTML = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.textContent = "No data";
    leaderboardEl.appendChild(li);
    return;
  }

  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = `#${item.rank} ${item.username} - ${item.score}`;
    leaderboardEl.appendChild(li);
  }
}

/**
 * Fetches leaderboard snapshot from backend API.
 *
 * @returns Promise resolved after UI list is rendered or error is shown.
 * @behavior Redirects to login page when session is unauthorized.
 */
async function fetchLeaderboard() {
  const res = await fetch(`${baseUrl}/api/v1/leaderboard?limit=10`, {
    headers: authHeaders(),
  });
  const payload = await res.json();
  if (!payload.success) {
    actionResultEl.textContent = JSON.stringify(payload, null, 2);
    if (res.status === 401) {
      clearSession();
      window.location.href = "./start.html";
    }
    return;
  }
  renderLeaderboard(payload.data.items);
}

/**
 * Opens SSE stream and subscribes to live leaderboard updates.
 *
 * @returns void.
 * @behavior Closes previous stream before creating a new one.
 */
function openStream() {
  if (stream) {
    stream.close();
  }
  stream = new EventSource(`${baseUrl}/api/v1/leaderboard/stream?t=${encodeURIComponent(getToken())}`);
  stream.addEventListener("leaderboard.updated", (event) => {
    const payload = JSON.parse(event.data);
    if (payload.success) {
      renderLeaderboard(payload.data.items);
    }
  });
}

/**
 * Logs out current user and redirects to login page.
 *
 * @returns Promise resolved after logout request completes.
 */
async function logout() {
  await fetch(`${baseUrl}/api/v1/auth/logout`, {
    method: "POST",
    headers: authHeaders(),
  });
  clearSession();
  setMissionState("", "");
  window.location.href = "./start.html";
}

/**
 * Starts a new mission for current user.
 *
 * @returns Promise resolved after API response is rendered.
 * @behavior Stores mission action id and expiration when start succeeds.
 */
async function startMission() {
  const res = await fetch(`${baseUrl}/api/v1/missions/start`, {
    method: "POST",
    headers: authHeaders(),
  });
  const payload = await res.json();
  actionResultEl.textContent = JSON.stringify(payload, null, 2);
  if (!payload.success) {
    return;
  }
  setMissionState(payload.data.actionId, payload.data.expiresAt);
}

/**
 * Completes the currently tracked mission.
 *
 * @returns Promise resolved after mission completion attempt.
 * @behavior Shows "Mission Failed" when no mission exists in local state.
 */
async function completeMission() {
  const state = getMissionState();
  if (!state.actionId) {
    actionResultEl.textContent = JSON.stringify(
      { success: false, data: {}, message: "Mission Failed" },
      null,
      2,
    );
    return;
  }

  const res = await fetch(`${baseUrl}/api/v1/missions/complete`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      actionId: state.actionId,
    }),
  });
  const payload = await res.json();
  actionResultEl.textContent = JSON.stringify(payload, null, 2);
  if (payload.success) {
    setMissionState("", "");
  }
  await fetchLeaderboard();
}

logoutBtn.addEventListener("click", () => void logout());
startMissionBtn.addEventListener("click", () => void startMission());
completeMissionBtn.addEventListener("click", () => void completeMission());
refreshBtn.addEventListener("click", () => void fetchLeaderboard());

setMissionState(getMissionState().actionId, getMissionState().expiresAt);
openStream();
void fetchLeaderboard();
