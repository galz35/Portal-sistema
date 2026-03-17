import React, { useState, useEffect, CSSProperties } from 'react';
import { getMe, getCsrfTokenFromCookie } from "../../../shared/api/coreApi";
import PortalShell, { panelStyle } from "../components/PortalShell";

type MeProfile = {
  idCuentaPortal?: number;
  nombre?: string;
  usuario?: string;
  correo?: string;
  carnet?: string;
  esInterno?: boolean;
};

export default function PerfilBasePage() {
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [showPassModal, setShowPassModal] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    void getMe().then((data) => setProfile(data));
  }, []);

  const handleChangePassword = async () => {
    if (!newPass) return alert("Por favor ingresa una nueva contraseña");
    setUpdating(true);
    const csrf = getCsrfTokenFromCookie();
    console.log("🔐 CSRF Token detected:", csrf ? "YES (present)" : "NO (missing)");

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(csrf ? { 'X-CSRF-Token': csrf } : {})
        },
        body: JSON.stringify({ nuevaClave: newPass }),
        credentials: "include"
      });
      if (res.ok) {
        alert("¡Éxito! Tu contraseña ha sido actualizada.");
        setNewPass("");
        setShowPassModal(false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.message || "Error al actualizar la contraseña.");
      }
    } catch (err) {
      alert("Error de conexión con el servidor.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <PortalShell
      eyebrow="Configuración"
      title="Mi Perfil Base"
      description="Gestiona tu identidad digital dentro del ecosistema Claro. Los cambios realizados aquí se reflejarán en todos los sistemas autorizados."
      user={{ nombre: profile?.nombre || "Cargando...", rol: profile?.usuario || "Empleado", carnet: profile?.carnet }}
    >
      <div style={profileGridStyle}>
        <section style={panelStyle}>
          <div style={profileHeaderStyle}>
             <div style={bigAvatarStyle}>{profile?.nombre?.slice(0, 2).toUpperCase() || "US"}</div>
             <div style={{ display: "grid", gap: 4 }}>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>{profile?.nombre || "Cargando..."}</h2>
                <span style={roleBadgeStyle}>{profile?.esInterno ? "COLABORADOR INTERNO" : "USUARIO PORTAL"}</span>
             </div>
          </div>

          <div style={statsDividerStyle} />

          <div style={infoGridStyle}>
            <ProfileItem label="Usuario Sistema" value={profile?.usuario ?? "--"} icon="fa-user-gear" />
            <ProfileItem label="Correo Corporativo" value={profile?.correo ?? "--"} icon="fa-envelope" />
            <ProfileItem label="Número de Carnet" value={profile?.carnet ?? "--"} icon="fa-id-card" />
            <ProfileItem label="Estado de Cuenta" value="Activo" icon="fa-circle-check" />
          </div>
        </section>

        <section style={{ ...panelStyle, background: "#f8fafc" }}>
           <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 900 }}>Seguridad de la Cuenta</h3>
           <p style={{ margin: "0 0 24px", color: "#64748b", fontSize: 14 }}>Mantén tu cuenta protegida y revisa los accesos recientes.</p>
           <div style={{ display: "flex", gap: 16 }}>
              <button 
                style={primaryActionButtonStyle} 
                onClick={() => setShowPassModal(true)}
              >
                Cambiar Contraseña
              </button>
              <button style={secondaryButtonStyle} onClick={() => alert("Próximamente: Historial de sesiones activas")}>
                Historial de Accesos
              </button>
           </div>
        </section>
      </div>

      {showPassModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <header style={{ marginBottom: 24 }}>
                <div style={modalIconStyle}>
                    <i className="fa-solid fa-shield-halved"></i>
                </div>
                <h3 style={{ margin: "16px 0 8px", fontSize: 22, fontWeight: 900, color: "#0f172a" }}>Seguridad de Acceso</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                    Ingresa tu nueva contraseña para el ecosistema Claro. 
                    Usamos <strong>Argon2id</strong> para proteger tus datos.
                </p>
            </header>

            <div style={{ position: 'relative' }}>
                <i className="fa-solid fa-key" style={inputIconStyle}></i>
                <input 
                  type="password" 
                  placeholder="Nueva contraseña robusta..." 
                  style={modalInputStyle}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  autoFocus
                />
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "stretch", marginTop: 32 }}>
              <button style={{ ...secondaryButtonStyle, flex: 1 }} onClick={() => { setShowPassModal(false); setNewPass(""); }}>CANCELAR</button>
              <button 
                style={{ ...primaryActionButtonStyle, flex: 1.5, boxShadow: "0 10px 20px -5px rgba(218, 41, 28, 0.4)" }} 
                onClick={handleChangePassword}
                disabled={updating}
              >
                {updating ? (
                    <><i className="fa-solid fa-circle-notch fa-spin"></i> GUARDANDO...</>
                ) : "ACTUALIZAR CLAVE"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}

function ProfileItem({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <article style={profileItemStyle}>
      <div style={itemIconBoxStyle}>
          <i className={`fa-solid ${icon}`}></i>
      </div>
      <div style={{ display: "grid", gap: 2 }}>
        <span style={itemLabelStyle}>{label}</span>
        <strong style={itemValueStyle}>{value}</strong>
      </div>
    </article>
  );
}

const profileGridStyle: CSSProperties = {
  display: "grid",
  gap: 32,
  maxWidth: 1000,
};

const profileHeaderStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 24,
    marginBottom: 32,
};

const bigAvatarStyle: CSSProperties = {
    width: 80,
    height: 80,
    background: "linear-gradient(135deg, #DA291C 0%, #a51d14 100%)",
    borderRadius: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    fontWeight: 900,
    color: "#fff",
    boxShadow: "0 15px 30px -5px rgba(218, 41, 28, 0.3)",
};

const roleBadgeStyle: CSSProperties = {
    fontSize: 11,
    fontWeight: 800,
    color: "#DA291C",
    background: "#fff1f2",
    padding: "4px 12px",
    borderRadius: "6px",
    display: "inline-block",
};

const statsDividerStyle: CSSProperties = {
    height: 1,
    background: "#f1f5f9",
    margin: "0 -32px 32px",
};

const infoGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 32,
};

const profileItemStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 16,
};

const itemIconBoxStyle: CSSProperties = {
    width: 44,
    height: 44,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
};

const itemLabelStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
};

const itemValueStyle: CSSProperties = {
    fontSize: 16,
    color: "#0f172a",
    fontWeight: 700,
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

const secondaryButtonStyle: CSSProperties = {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "10px 20px",
    fontSize: 13,
    fontWeight: 700,
    color: "#475569",
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

const modalContentStyle: CSSProperties = {
    background: "#fff",
    padding: 32,
    borderRadius: 24,
    maxWidth: 450,
    width: "90%",
    boxShadow: "0 20px 40px -10px rgba(0,0,0,0.3)",
};

const modalInputStyle: CSSProperties = {
    width: "100%",
    padding: "16px 16px 16px 48px",
    borderRadius: "14px",
    border: "2px solid #f1f5f9",
    background: "#f8fafc",
    fontSize: 15,
    fontWeight: 600,
    outline: "none",
    boxSizing: 'border-box',
    transition: "all 0.2s linear",
};

const modalIconStyle: CSSProperties = {
    width: 56,
    height: 56,
    background: "#fff1f2",
    color: "#DA291C",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
};

const inputIconStyle: CSSProperties = {
    position: "absolute",
    left: 18,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#94a3b8",
    fontSize: 16,
};
