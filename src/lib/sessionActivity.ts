export const SESSION_IDLE_TIMEOUT_MS = 60 * 60 * 1000;
export const SESSION_ACTIVITY_COOKIE = "syariahquest_last_activity";

export function writeSessionActivityCookie(timestamp = Date.now()) {
  if (typeof document === "undefined") return;

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SESSION_ACTIVITY_COOKIE}=${timestamp}; Path=/; Max-Age=86400; SameSite=Lax${secure}`;
}

export function clearSessionActivityCookie() {
  if (typeof document === "undefined") return;

  document.cookie = `${SESSION_ACTIVITY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
