import { getCsrfTokenFromCookie } from "./csrf";

export async function logoutGlobal() {
  const csrf = getCsrfTokenFromCookie();
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: csrf
      ? {
          "X-CSRF-Token": csrf,
        }
      : undefined,
  });
}
