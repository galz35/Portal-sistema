import { useState, useEffect, type CSSProperties, ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logoutGlobal } from "../../../shared/api/coreApi";
import { appPath } from "../../../shared/config/runtime";

/* ---------- SHARED STYLES ---------- */
export const panelStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #f1f5f9",
  borderRadius: "24px",
  padding: "32px",
  boxShadow: "0 10px 30px -5px rgba(0,0,0,0.03)",
};

/* ---------- INTERNAL STYLES ---------- */
const rootStyle: CSSProperties = { display: "flex", height: "100vh", background: "#f8fafc", fontFamily: "'Inter', sans-serif", overflow: "hidden" };
const mobileOverlayStyle: CSSProperties = { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", zIndex: 999 };
const sidebarStyle: CSSProperties = { background: "#0f172a", color: "#f8fafc", display: "flex", flexDirection: "column", padding: "24px 16px", transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s ease", flexShrink: 0, position: "relative" };
const sidebarHeaderStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40, padding: "0 8px" };
const logoContainerStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 12 };
const logoIconStyle: CSSProperties = { width: 40, height: 40, background: "linear-gradient(135deg, #DA291C 0%, #a51d14 100%)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#fff", boxShadow: "0 8px 15px -3px rgba(218, 41, 28, 0.3)" };
const logoTextStyle: CSSProperties = { fontSize: 18, fontWeight: 900, letterSpacing: "-0.5px" };
const logoSubtextStyle: CSSProperties = { fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px" };
const toggleBtnStyle: CSSProperties = { background: "rgba(255,255,255,0.05)", border: "none", color: "#fff", width: 28, height: 28, borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 };
const sideNavStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 6, flex: 1 };
const dividerStyle: CSSProperties = { height: "1px", background: "rgba(255,255,255,0.05)", margin: "12px 8px" };
const sectionLabelStyle: CSSProperties = { padding: "0 16px", fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,0.3)", letterSpacing: "2px", marginBottom: 8 };
const navItemStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 16, padding: "12px 14px", borderRadius: "14px", color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 14, fontWeight: 600, transition: "all 0.2s", position: "relative" };
const navItemActiveStyle: CSSProperties = { background: "rgba(255,255,255,0.08)", color: "#fff" };
const navIconStyle: CSSProperties = { width: 22, fontSize: 16, textAlign: "center" };
const navLabelStyle: CSSProperties = { flex: 1 };
const activeIndicatorStyle: CSSProperties = { position: "absolute", right: 0, width: 4, height: 18, background: "#DA291C", borderRadius: "4px 0 0 4px", boxShadow: "0 0 10px rgba(218, 41, 28, 0.6)" };
const sidebarFooterStyle: CSSProperties = { marginTop: "auto", display: "grid", gap: 16, padding: "16px 8px 0", borderTop: "1px solid rgba(255,255,255,0.05)" };
const userBadgeStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "16px" };
const avatarStyle: CSSProperties = { width: 36, height: 36, background: "#DA291C", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900 };
const userNameStyle: CSSProperties = { fontSize: 13, fontWeight: 700 };
const userRoleStyle: CSSProperties = { fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 800, textTransform: "uppercase" };
const exitLinkStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 10, fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.3)", textDecoration: "none", padding: "4px 8px", border: "none", background: "none", cursor: "pointer", transition: "color 0.2s" };
const mainContentStyle: CSSProperties = { flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" };
const topHeaderStyle: CSSProperties = { background: "#fff", height: 90, padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", flexShrink: 0 };
const headerLeftStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 24 };
const hamburgerStyle: CSSProperties = { background: "none", border: "none", fontSize: 20, color: "#1e293b", cursor: "pointer", display: "none" };
const headerTextStack: CSSProperties = { display: "grid", gap: 2 };
const eyebrowStyle: CSSProperties = { fontSize: 11, fontWeight: 900, color: "#DA291C", textTransform: "uppercase", letterSpacing: "1.5px" };
const titleStyle: CSSProperties = { margin: 0, fontSize: 26, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.5px" };
const headerActionsContainer: CSSProperties = { display: "flex", alignItems: "center", gap: 24 };
const notifIconStyle: CSSProperties = { position: "relative", fontSize: 18, color: "#64748b", cursor: "pointer" };
const badgeCountStyle: CSSProperties = { position: "absolute", top: -5, right: -8, width: 16, height: 16, background: "#DA291C", color: "#fff", fontSize: 9, fontWeight: 900, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" };
const scrollAreaStyle: CSSProperties = { flex: 1, overflowY: "auto", padding: "0 40px 40px" };
const descriptionRowStyle: CSSProperties = { padding: "24px 0", borderBottom: "1px solid #f1f5f9", marginBottom: 32 };
const descriptionTextStyle: CSSProperties = { margin: 0, fontSize: 15, color: "#64748b", lineHeight: 1.6, maxWidth: 800 };
const contentBodyStyle: CSSProperties = { display: "grid", gap: 32 };

type PortalShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  user?: { nombre: string; rol: string; carnet?: string };
  children: ReactNode;
};

const MENU_ITEMS = [
  { label: "Mis Aplicaciones", path: "/portal/dashboard", icon: "fa-grid-2" },
  { label: "Mi Perfil", path: "/portal/perfil", icon: "fa-user-circle" },
];

const ADMIN_ITEMS = [
  { label: "Administración", path: "/portal/admin", icon: "fa-user-gear" },
];

export default function PortalShell({ eyebrow, title, description, actions, user, children }: PortalShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutGlobal();
      // Forzamos un reload o navegación limpia al login de empleado
      window.location.href = appPath("/login-empleado");
    } catch (err) {
      console.error("Error logging out:", err);
      window.location.href = appPath("/login-empleado");
    }
  };

  useEffect(() => {
    const listener = () => handleLogout();
    window.addEventListener('portal-logout', listener);
    return () => window.removeEventListener('portal-logout', listener);
  }, []);

  return (
    <div style={rootStyle}>
      {mobileOpen && <div style={mobileOverlayStyle} onClick={() => setMobileOpen(false)} />}

      <aside
        style={{
          ...sidebarStyle,
          width: collapsed ? 80 : 280,
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
        }}
        className="portal-sidebar"
      >
        <header style={sidebarHeaderStyle}>
          <div style={logoContainerStyle}>
            <div style={logoIconStyle}>C</div>
            {!collapsed && (
              <div style={{ display: "grid" }}>
                <span style={logoTextStyle}>Claro</span>
                <span style={logoSubtextStyle}>Portal</span>
              </div>
            )}
          </div>
          <button style={toggleBtnStyle} onClick={() => setCollapsed(!collapsed)}>
            <i className={`fa-solid ${collapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
          </button>
        </header>

        <nav style={sideNavStyle}>
          {MENU_ITEMS.map((item) => (
            <MenuItem key={item.path} item={item} active={location.pathname === item.path} collapsed={collapsed} />
          ))}

          {user?.carnet === "500708" && (
            <>
              <div style={dividerStyle} />
              <span style={sectionLabelStyle}>{!collapsed && "SISTEMA"}</span>
              {ADMIN_ITEMS.map((item) => (
                <MenuItem key={item.path} item={item} active={location.pathname === item.path} collapsed={collapsed} />
              ))}
            </>
          )}
        </nav>

        <div style={sidebarFooterStyle}>
          <div style={{ ...userBadgeStyle, padding: collapsed ? "12px 0" : "12px", justifyContent: collapsed ? "center" : "flex-start" }}>
            <div style={avatarStyle}>{user?.nombre?.slice(0, 2).toUpperCase() || "US"}</div>
            {!collapsed && (
              <div style={{ display: "grid", gap: 1 }}>
                <span style={userNameStyle}>{user?.nombre || "Usuario"}</span>
                <span style={userRoleStyle}>{user?.rol || "Colaborador"}</span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button onClick={handleLogout} style={exitLinkStyle}>
              <i className="fa-solid fa-arrow-right-from-bracket"></i> CERRAR SESIÓN
            </button>
          )}
        </div>
      </aside>

      <main style={mainContentStyle}>
        <header style={topHeaderStyle}>
          <div style={headerLeftStyle}>
            <button style={hamburgerStyle} onClick={() => setMobileOpen(true)} className="portal-hamburger">
              <i className="fa-solid fa-bars"></i>
            </button>
            <div style={headerTextStack}>
              <span style={eyebrowStyle}>{eyebrow}</span>
              <h1 style={titleStyle}>{title}</h1>
            </div>
          </div>

          <div style={headerActionsContainer}>
            {actions}
          </div>
        </header>

        <div style={scrollAreaStyle}>
          {description && (
            <div style={descriptionRowStyle}>
              <p style={descriptionTextStyle}>{description}</p>
            </div>
          )}
          <div style={contentBodyStyle}>
            {children}
          </div>
        </div>
      </main>

      <style>{`
        @media (max-width: 1024px) {
          .portal-sidebar { position: fixed !important; z-index: 1000; }
          .portal-hamburger { display: block !important; }
        }
        @media (min-width: 1025px) {
          .portal-sidebar { transform: none !important; }
        }
      `}</style>
    </div>
  );
}

function MenuItem({ item, active, collapsed }: { item: any, active: boolean, collapsed: boolean }) {
  const icon = item.icon === "fa-grid-2" ? "fa-table-cells-large" : item.icon;
  return (
    <Link
      to={item.path}
      style={{
        ...navItemStyle,
        ...(active ? navItemActiveStyle : {}),
        justifyContent: collapsed ? "center" : "flex-start"
      }}
      title={collapsed ? item.label : ""}
    >
      <i className={`fa-solid ${icon}`} style={navIconStyle}></i>
      {!collapsed && <span style={navLabelStyle}>{item.label}</span>}
      {!collapsed && active && <div style={activeIndicatorStyle} />}
    </Link>
  );
}
