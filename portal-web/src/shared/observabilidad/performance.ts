export function trackNavigation(route: string) {
  console.info("[portal-web][navigation]", route, { ts: Date.now() });
}
