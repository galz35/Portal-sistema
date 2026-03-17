export function logUiEvent(level: "info" | "warn" | "error", message: string, extra?: Record<string, unknown>) {
  console[level]("[portal-web]", message, extra ?? {});
}
