import { useEffect, useState, type ReactNode } from "react";
import { appPath } from "../config/runtime";

import { fetchSessionState } from "../security/authSession";

type AuthGuardProps = {
  children: ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    void fetchSessionState().then((session) => {
      if (!session.authenticated) {
        const returnUrl = encodeURIComponent(window.location.pathname);
        const loginUrl = appPath("/login-empleado");
        window.location.href = `${loginUrl}?returnUrl=${returnUrl}`;
        return;
      }

      const profileUrl = appPath("/perfil");
      const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
      const profilePath = profileUrl.replace(/\/+$/, "") || "/";
      if (session.mustChangePassword && currentPath !== profilePath) {
        window.location.href = `${profileUrl}?forcePasswordChange=1`;
        return;
      }

      setAuthenticated(true);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div style={{ padding: 24 }}>Validando sesion...</div>;
  }

  if (!authenticated) {
    return null;
  }

  return <>{children}</>;
}
