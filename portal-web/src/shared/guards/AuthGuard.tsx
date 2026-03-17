import { useEffect, useState, type ReactNode } from "react";

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
        window.location.href = `/login-empleado?returnUrl=${returnUrl}`;
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
