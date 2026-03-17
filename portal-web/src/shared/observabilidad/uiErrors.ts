export function reportUiError(error: unknown, context?: Record<string, unknown>) {
  console.error("[portal-web][ui-error]", error, context ?? {});
}
