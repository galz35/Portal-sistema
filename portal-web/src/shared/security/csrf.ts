export function getCsrfTokenFromCookie(cookieName = "portal_csrf"): string | null {
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${cookieName}=`));

  return cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
}
