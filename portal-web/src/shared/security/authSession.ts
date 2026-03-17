import { getMe, getSessionState } from "../api/coreApi";

export async function fetchSessionState() {
  const session = await getSessionState();

  if (!session || !session.authenticated) {
    return { authenticated: false, apps: [] as string[] };
  }

  const me = await getMe();

  return {
    authenticated: !!session.authenticated,
    idSesionPortal: session.idSesionPortal ?? null,
    idCuentaPortal: session.idCuentaPortal ?? null,
    apps: me?.apps ?? [],
    permisos: me?.permisos ?? [],
    nombre: me?.nombre ?? me?.usuario ?? "Usuario Portal",
  };
}
