import { getCsrfTokenFromCookie } from "../security/csrf";
import { apiUrl } from "../config/runtime";
export { getCsrfTokenFromCookie };

export type PortalApp = {
  codigo: string;
  nombre: string;
  ruta: string;
  icono?: string;
  descripcion?: string;
};

export type CurrentSessionState = {
  authenticated: boolean;
  idSesionPortal?: number | null;
  idCuentaPortal?: number | null;
  mustChangePassword?: boolean;
};

export type CurrentUserMe = {
  usuario?: string;
  nombre?: string;
  correo?: string;
  carnet?: string;
  apps?: string[];
  permisos?: string[];
  esInterno?: boolean;
  mustChangePassword?: boolean;
};

export type LoginEmpleadoRequest = {
  usuario: string;
  clave: string;
  tipo_login?: string;
  returnUrl?: string;
};

async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getSessionState(): Promise<CurrentSessionState | null> {
  const response = await fetch(apiUrl("/auth/session-state"), {
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  return parseJson<CurrentSessionState>(response);
}

export async function getMe(): Promise<CurrentUserMe | null> {
  const response = await fetch(apiUrl("/auth/me"), {
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  return parseJson<CurrentUserMe>(response);
}

export async function getApps(): Promise<PortalApp[]> {
  const response = await fetch(apiUrl("/core/apps"), {
    credentials: "include",
  });

  if (!response.ok) {
    return [];
  }

  const data = await parseJson<{ items?: PortalApp[] } | PortalApp[]>(response);
  if (Array.isArray(data)) {
    return data;
  }
  return data?.items ?? [];
}

export async function logoutGlobal() {
  const csrf = getCsrfTokenFromCookie();
  return fetch(apiUrl("/auth/logout"), {
    method: "POST",
    credentials: "include",
    headers: csrf
      ? {
          "X-CSRF-Token": csrf,
        }
      : undefined,
  });
}

export async function loginEmpleado(payload: LoginEmpleadoRequest) {
  const response = await fetch(apiUrl("/auth/login-empleado"), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}
