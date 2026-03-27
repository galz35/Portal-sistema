import { useEffect, useState, type CSSProperties } from "react";
import TarjetaSistema from "../components/TarjetaSistema";
import PortalShell, { panelStyle } from "../components/PortalShell";
import { getApps, getMe, logoutGlobal, getCsrfTokenFromCookie, type CurrentUserMe, type PortalApp } from "../../../shared/api/coreApi";
import { appPath, apiUrl } from "../../../shared/config/runtime";

type LaunchNotice = {
  title: string;
  message: string;
};

export default function PortalDashboardPage() {
  const [apps, setApps] = useState<PortalApp[]>([]);
  const [user, setUser] = useState<CurrentUserMe | null>(null);
  const [launchNotice, setLaunchNotice] = useState<LaunchNotice | null>(null);

  useEffect(() => {
    void getApps().then((items) => setApps(items));
    void getMe().then((profile) => setUser(profile));

    const logoutListener = async () => {
      await logoutGlobal();
      window.location.href = appPath("/login-empleado");
    };

    window.addEventListener("portal-logout", logoutListener);
    return () => window.removeEventListener("portal-logout", logoutListener);
  }, []);

  const openPasswordRequiredNotice = (message?: string) => {
    setLaunchNotice({
      title: "Cambio de contraseña requerido",
      message: message || "Debes cambiar tu contraseña temporal antes de ingresar a otras aplicaciones.",
    });
  };

  const closeLaunchNotice = () => {
    setLaunchNotice(null);
    window.location.href = `${appPath("/perfil")}?forcePasswordChange=1`;
  };

  const handleLaunchApp = async (app: PortalApp) => {
    if (user?.mustChangePassword) {
      openPasswordRequiredNotice();
      return;
    }

    const popup = window.open("about:blank", "_blank");

    const navigateToTarget = (targetUrl: string) => {
      if (popup && !popup.closed) {
        popup.location.replace(targetUrl);
        popup.focus();
        return;
      }

      window.location.href = targetUrl;
    };

    try {
      console.log(`🚀 Iniciando lanzamiento de: ${app.nombre}`);
      const csrf = getCsrfTokenFromCookie();
      console.log("🔐 CSRF Token detected for SSO:", csrf ? "YES" : "NO");

      if (popup && !popup.closed) {
        popup.document.title = `Abriendo ${app.nombre}...`;
        popup.document.body.innerHTML = '<div style="font-family: Arial, sans-serif; padding: 24px; color: #0f172a;">Conectando con el acceso seguro de la aplicacion...</div>';
      }

      const response = await fetch(apiUrl("/sso/ticket"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        },
        credentials: "include",
        body: JSON.stringify({}),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 403) {
          if (popup && !popup.closed) {
            popup.close();
          }
          openPasswordRequiredNotice(data?.message);
          return;
        }

        throw new Error(`SSO Ticket request failed with status: ${response.status}`);
      }

      if (data.ticket) {
        const ssoPath = app.ruta.endsWith("/") ? "auth/sso" : "/auth/sso";
        const finalUrl = `${app.ruta}${ssoPath}?token=${encodeURIComponent(data.ticket)}`;

        console.log(`🎯 Redirigiendo con ticket a: ${app.nombre}`);
        navigateToTarget(finalUrl);
      } else {
        console.warn(`⚠️ No se recibió ticket SSO para ${app.nombre}. Usando ruta directa.`);
        navigateToTarget(app.ruta);
      }
    } catch (error) {
      console.error("❌ Error crítico en handshake SSO:", error);
      navigateToTarget(app.ruta);
    }
  };

  return (
    <>
      <PortalShell
        eyebrow="Bienvenido"
        title={`Hola, ${user?.nombre?.split(" ")[0] || "Usuario"}`}
        description="Este es tu panel central de aplicaciones autorizadas. Desde aquí puedes navegar de forma segura por todo el Claro Portal."
        user={{ nombre: user?.nombre || "Cargando...", rol: user?.usuario || "Empleado", carnet: user?.carnet }}
      >
        <div style={dashboardGridStyle}>
          <section style={statsRowStyle}>
            <div style={panelStyle}>
              <span style={statLabelStyle}>APLICACIONES AUTORIZADAS</span>
              <div style={statValueRowStyle}>
                <span style={statValueStyle}>{apps.filter((a) => a.codigo !== "portal").length}</span>
                <div style={statTrendStyle}>
                  <i className="fa-solid fa-check-circle"></i> VIGENTES
                </div>
              </div>
            </div>
            <div style={panelStyle}>
              <span style={statLabelStyle}>SESIÓN ACTUAL</span>
              <div style={statValueRowStyle}>
                <span style={statValueStyle}>Activa</span>
                <div style={statTrendStyle}>
                  <i className="fa-solid fa-shield-check"></i> PROTEGIDA
                </div>
              </div>
            </div>
            <div style={panelStyle}>
              <span style={statLabelStyle}>PAÍS</span>
              <div style={statValueRowStyle}>
                <span style={statValueStyle}>Nicaragua</span>
                <div style={statTrendStyle}>
                  <i className="fa-solid fa-location-dot"></i> REGIONAL
                </div>
              </div>
            </div>
          </section>

          <section style={{ display: "grid", gap: 24 }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ display: "grid", gap: 4 }}>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#0f172a" }}>Mis Aplicaciones</h2>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b", fontWeight: 600 }}>Selecciona un sistema para ingresar con tu sesión única.</p>
              </div>
            </header>

            <div style={appsGridStyle}>
              {apps.filter((app) => app.codigo !== "portal").map((app) => (
                <TarjetaSistema
                  key={app.codigo}
                  nombre={app.nombre}
                  icono={app.icono ?? app.nombre}
                  ruta={app.ruta}
                  descripcion={app.descripcion}
                  estado="Autorizado"
                  onLaunch={() => handleLaunchApp(app)}
                />
              ))}

              <div style={placeholderCardStyle}>
                <i className="fa-solid fa-plus-circle" style={{ fontSize: 32, color: "#cbd5e1" }}></i>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#94a3b8", letterSpacing: "1px" }}>PRÓXIMAMENTE</span>
              </div>
            </div>
          </section>
        </div>
      </PortalShell>

      {launchNotice && (
        <div style={modalOverlayStyle}>
          <div style={dialogContentStyle}>
            <div style={dialogIconStyle}>
              <i className="fa-solid fa-shield"></i>
            </div>
            <h3 style={dialogTitleStyle}>{launchNotice.title}</h3>
            <p style={dialogMessageStyle}>{launchNotice.message}</p>
            <div style={dialogActionRowStyle}>
              <button type="button" style={{ ...primaryActionButtonStyle, minWidth: 180 }} onClick={closeLaunchNotice}>
                Ir a perfil
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const dashboardGridStyle: CSSProperties = {
  display: "grid",
  gap: 40,
};

const statsRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 24,
};

const statLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  color: "#DA291C",
  letterSpacing: "1.5px",
  display: "block",
  marginBottom: 12,
};

const statValueRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 16,
};

const statValueStyle: CSSProperties = {
  fontSize: 42,
  fontWeight: 900,
  color: "#0f172a",
  letterSpacing: "-1px",
};

const statTrendStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: "#10b981",
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  background: "#f0fdf4",
  borderRadius: "8px",
};

const appsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, 160px)",
  gap: 32,
};

const placeholderCardStyle: CSSProperties = {
  border: "2px dashed #e2e8f0",
  borderRadius: "24px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  width: 160,
  height: 160,
};

const primaryActionButtonStyle: CSSProperties = {
  background: "#DA291C",
  border: "none",
  borderRadius: "12px",
  padding: "10px 24px",
  fontSize: 13,
  fontWeight: 700,
  color: "#fff",
  cursor: "pointer",
};

const modalOverlayStyle: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(15, 23, 42, 0.6)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const dialogContentStyle: CSSProperties = {
  background: "#fff",
  padding: 32,
  borderRadius: 24,
  maxWidth: 420,
  width: "90%",
  boxShadow: "0 20px 40px -10px rgba(0,0,0,0.3)",
  textAlign: "center",
};

const dialogIconStyle: CSSProperties = {
  width: 60,
  height: 60,
  borderRadius: "18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 24,
  margin: "0 auto 16px",
  background: "#fff7ed",
  color: "#c2410c",
};

const dialogTitleStyle: CSSProperties = {
  margin: "0 0 10px",
  fontSize: 22,
  fontWeight: 900,
  color: "#0f172a",
};

const dialogMessageStyle: CSSProperties = {
  margin: 0,
  color: "#475569",
  lineHeight: 1.6,
  fontSize: 14,
};

const dialogActionRowStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  justifyContent: "center",
  marginTop: 28,
};
