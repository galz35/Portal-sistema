import { useEffect, useState, type CSSProperties } from "react";
import TarjetaSistema from "../components/TarjetaSistema";
import PortalShell, { panelStyle } from "../components/PortalShell";
import { getApps, getMe, logoutGlobal, getCsrfTokenFromCookie, type CurrentUserMe, type PortalApp } from "../../../shared/api/coreApi";
import { appPath, apiUrl } from "../../../shared/config/runtime";

export default function PortalDashboardPage() {
  const [apps, setApps] = useState<PortalApp[]>([]);
  const [user, setUser] = useState<CurrentUserMe | null>(null);

  useEffect(() => {
    void getApps().then((items) => setApps(items));
    void getMe().then((profile) => setUser(profile));

    const logoutListener = async () => {
        await logoutGlobal();
        // Construir la URL de login respetando la subruta (ej: /portal/login-empleado)
        window.location.href = appPath("/login-empleado");
    };

    window.addEventListener('portal-logout', logoutListener);
    return () => window.removeEventListener('portal-logout', logoutListener);
  }, []);

  const handleLaunchApp = async (app: PortalApp) => {
    const popup = window.open('about:blank', '_blank');

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

      // Abrimos la pestaña dentro del gesto del usuario para evitar bloqueo por popup.
      if (popup && !popup.closed) {
        popup.document.title = `Abriendo ${app.nombre}...`;
        popup.document.body.innerHTML = '<div style="font-family: Arial, sans-serif; padding: 24px; color: #0f172a;">Conectando con el acceso seguro de la aplicacion...</div>';
      }

      // 1. Obtener ticket de intercambio del backend del portal
      const response = await fetch(apiUrl('/sso/ticket'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrf ? { 'X-CSRF-Token': csrf } : {})
        },
        credentials: "include",
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(`SSO Ticket request failed with status: ${response.status}`);
      }

      const data = await response.json();

      if (data.ticket) {
        // 2. Construir URL de destino con el ticket
        const ssoPath = app.ruta.endsWith('/') ? 'auth/sso' : '/auth/sso';
        const finalUrl = `${app.ruta}${ssoPath}?token=${encodeURIComponent(data.ticket)}`;

        console.log(`🎯 Redirigiendo con ticket a: ${app.nombre}`);
        navigateToTarget(finalUrl);
      } else {
        console.warn(`⚠️ No se recibió ticket SSO para ${app.nombre}. Usando ruta directa.`);
        navigateToTarget(app.ruta);
      }
    } catch (error) {
      console.error('❌ Error crítico en handshake SSO:', error);
      // Fallback seguro a la ruta base
      navigateToTarget(app.ruta);
    }
  };

  return (
    <PortalShell
      eyebrow="Bienvenido"
      title={`Hola, ${user?.nombre?.split(' ')[0] || 'Usuario'}`}
      description="Este es tu panel central de aplicaciones autorizadas. Desde aquí puedes navegar de forma segura por todo el Claro Portal."
      user={{ nombre: user?.nombre || "Cargando...", rol: user?.usuario || "Empleado", carnet: user?.carnet }}
    >
      <div style={dashboardGridStyle}>
        {/* STATS ROW */}
        <section style={statsRowStyle}>
          <div style={panelStyle}>
            <span style={statLabelStyle}>APLICACIONES AUTORIZADAS</span>
            <div style={statValueRowStyle}>
              <span style={statValueStyle}>{apps.filter(a => a.codigo !== "portal").length}</span>
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

        {/* APPS LIST */}
        <section style={{ display: "grid", gap: 24 }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ display: "grid", gap: 4 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#0f172a" }}>Mis Aplicaciones</h2>
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", fontWeight: 600 }}>Selecciona un sistema para ingresar con tu sesión única.</p>
            </div>
          </header>

          <div style={appsGridStyle}>
            {apps.filter(app => app.codigo !== "portal").map((app) => (
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
            
            {/* PLACEHOLDER CARD FOR FUTURE APPS */}
            <div style={placeholderCardStyle}>
               <i className="fa-solid fa-plus-circle" style={{ fontSize: 32, color: "#cbd5e1" }}></i>
               <span style={{ fontSize: 13, fontWeight: 800, color: "#94a3b8", letterSpacing: "1px" }}>PRÓXIMAMENTE</span>
            </div>
          </div>
        </section>
      </div>
    </PortalShell>
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
