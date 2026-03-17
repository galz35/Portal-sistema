import type { CSSProperties } from "react";

const panelStyle: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(180deg, #fff5f5 0%, #ffffff 100%)",
  color: "#111111",
  fontFamily: "\"Segoe UI\", sans-serif",
  padding: 24,
};

const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: 460,
  background: "#ffffff",
  border: "1px solid #fecaca",
  borderRadius: 28,
  padding: 32,
  boxShadow: "0 24px 60px rgba(17, 24, 39, 0.08)",
  display: "grid",
  gap: 18,
};

export default function LoginPage() {
  return (
    <main style={panelStyle}>
      <section style={cardStyle}>
        <span style={{ color: "#b91c1c", fontWeight: 800, textTransform: "uppercase" }}>
          Portal Central
        </span>
        <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1, fontWeight: 900 }}>
          Acceso general
        </h1>
        <p style={{ margin: 0, color: "#57534e", lineHeight: 1.6 }}>
          Usa este acceso para flujos generales. Para colaboradores internos, el flujo recomendado es login empleado.
        </p>
        <a
          href="/login-empleado"
          style={{
            textDecoration: "none",
            textAlign: "center",
            background: "#b91c1c",
            color: "#ffffff",
            padding: "14px 18px",
            borderRadius: 14,
            fontWeight: 800,
          }}
        >
          Ir a login empleado
        </a>
      </section>
    </main>
  );
}
