import { appPath } from "../../../shared/config/runtime";

export default function SinAccesoPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(180deg, #ffffff 0%, #fff1f2 100%)",
        color: "#111111",
        fontFamily: '"Segoe UI", sans-serif',
        padding: 24,
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 560,
          background: "#ffffff",
          border: "1px solid #fecaca",
          borderRadius: 28,
          boxShadow: "0 24px 60px rgba(17, 24, 39, 0.08)",
          padding: 32,
          display: "grid",
          gap: 16,
          textAlign: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 38, fontWeight: 900 }}>Sin acceso</h1>
        <p style={{ margin: 0, color: "#57534e", lineHeight: 1.6 }}>
          La sesion es valida, pero el usuario actual no tiene autorizacion para entrar a este recurso.
        </p>
        <a
          href={appPath("/")}
          style={{
            textDecoration: "none",
            borderRadius: 14,
            padding: "14px 18px",
            background: "#111111",
            color: "#ffffff",
            fontWeight: 800,
          }}
        >
          Volver al portal
        </a>
      </section>
    </main>
  );
}
