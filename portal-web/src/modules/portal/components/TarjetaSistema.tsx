import { type CSSProperties } from "react";

type TarjetaSistemaProps = {
  nombre: string;
  icono: string;
  ruta: string;
  descripcion?: string;
  estado?: string;
  onLaunch?: (ruta: string) => void;
};

export default function TarjetaSistema({
  nombre,
  icono,
  ruta,
  onLaunch
}: TarjetaSistemaProps) {
  const handleClick = (e: React.MouseEvent) => {
      if (onLaunch) {
          e.preventDefault();
          onLaunch(ruta);
      }
  };

  return (
    <a href={ruta} onClick={handleClick} style={buttonCardStyle} className="app-button-card">
      <div style={iconBoxStyle}>
        <i className={`fa-solid ${getIcon(icono)}`} style={{ fontSize: 32 }}></i>
      </div>
      <span style={appTitleStyle}>{nombre}</span>
      
      <style>{`
        .app-button-card {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .app-button-card:hover {
            transform: translateY(-5px);
            background: #fff;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);
            border-color: #DA291C40;
        }
        .app-button-card:hover span {
            color: #DA291C;
        }
        .app-button-card:active {
            transform: translateY(0) scale(0.95);
        }
      `}</style>
    </a>
  );
}

function getIcon(name: string) {
    const n = name.toLowerCase();
    if (n.includes('vacante')) return 'fa-briefcase';
    if (n.includes('hub')) return 'fa-hubspot';
    if (n.includes('inventario')) return 'fa-boxes-stacked';
    if (n.includes('nomina')) return 'fa-money-check-dollar';
    if (n.includes('planer')) return 'fa-calendar-days';
    if (n.includes('portal')) return 'fa-house-chimney';
    return 'fa-rocket';
}

const buttonCardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #f1f5f9",
  borderRadius: "24px",
  width: "160px",
  height: "160px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
  textDecoration: "none",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)",
  cursor: "pointer",
  flexShrink: 0,
};

const iconBoxStyle: CSSProperties = {
    width: 64,
    height: 64,
    background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
    borderRadius: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#DA291C",
    transition: "all 0.2s",
};

const appTitleStyle: CSSProperties = {
    fontSize: 14,
    fontWeight: 800,
    color: "#334155",
    textAlign: "center",
    transition: "color 0.2s",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
};
