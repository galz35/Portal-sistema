import { getCsrfTokenFromCookie } from "./csrf";
import { apiUrl } from "../config/runtime";

export async function logoutGlobal() {
  const csrf = getCsrfTokenFromCookie();
  await fetch(apiUrl("/auth/logout"), {
    method: "POST",
    credentials: "include",
    headers: csrf
      ? {
          "X-CSRF-Token": csrf,
        }
      : undefined,
  });
}
