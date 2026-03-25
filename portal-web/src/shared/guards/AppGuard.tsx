import { useEffect, useState, type ReactNode } from "react";
import { appPath } from "../config/runtime";

import { fetchSessionState } from "../security/authSession";

type AppGuardProps = {
  requiredApp: string;
  children: ReactNode;
};

export default function AppGuard({ requiredApp, children }: AppGuardProps) {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchSessionState().then((session) => {
      if (!session.authenticated) {
        const returnUrl = encodeURIComponent(window.location.pathname);
        const loginUrl = appPath("/login-empleado");
        window.location.href = `${loginUrl}?returnUrl=${returnUrl}`;
        return;
      }

      if (!session.apps.includes(requiredApp)) {
        window.location.href = appPath("/sin-acceso");
        return;
      }

      setAllowed(true);
      setLoading(false);
    });
  }, [requiredApp]);

  if (loading) {
    return <div style={{ padding: 24 }}>Validando acceso...</div>;
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
