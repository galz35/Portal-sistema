export async function trackApiCall<T>(label: string, request: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();
  try {
    const response = await request();
    console.info("[portal-web][api]", label, { durationMs: performance.now() - startedAt });
    return response;
  } catch (error) {
    console.error("[portal-web][api]", label, { durationMs: performance.now() - startedAt, error });
    throw error;
  }
}
