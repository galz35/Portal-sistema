import { useEffect, useMemo, useState, type FormEvent } from "react";
import { loginEmpleado } from "../../../shared/api/coreApi";
import { appPath, apiUrl } from "../../../shared/config/runtime";
import "./LoginEmpleadoPage.css";

function currentReturnUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("returnUrl") ?? appPath("/");
}

function normalizePath(value: string) {
  try {
    const pathname = new URL(value, window.location.origin).pathname;
    return pathname.replace(/\/+$/, "") || "/";
  } catch {
    return value.replace(/\/+$/, "") || "/";
  }
}

export default function LoginEmpleadoPage() {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => usuario.trim().length >= 3 && clave.trim().length >= 6, [usuario, clave]);

  useEffect(() => {
    const checkExistingSession = async () => {
      const returnUrl = currentReturnUrl();
      const portalUrl = normalizePath(appPath("/"));
      if (normalizePath(returnUrl) === portalUrl) return;

      try {
        const response = await fetch(apiUrl("/auth/session-state"), { credentials: "include" });
        const state = await response.json();

        if (state.authenticated) {
          console.log("🚀 Sesión activa detectada, generando ticket automático...");
          const ssoRes = await fetch(apiUrl("/sso/ticket"), { method: "POST", credentials: "include" });
          const ssoData = await ssoRes.json();

          if (ssoData.ticket) {
            const urlObj = new URL(returnUrl, window.location.origin);
            urlObj.searchParams.set("token", ssoData.ticket);
            window.location.href = urlObj.toString();
          }
        }
      } catch (e) {
        console.warn("No se pudo verificar sesión previa segura");
      }
    };
    checkExistingSession();
  }, []);

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setError("");

    try {
      const returnUrl = currentReturnUrl();
      const response = await loginEmpleado({
        usuario: usuario.trim(),
        clave,
        tipo_login: "empleado",
        returnUrl,
      });

      if (!response.ok) {
        let msg = "Error de conexión con el servidor central";
        if (response.status === 401) msg = "Credenciales corporativas incorrectas";
        if (response.status === 500) msg = "Error interno del servidor central (500)";
        if (response.status === 403) msg = "Cuenta bloqueada o sin permisos";

        throw new Error(msg);
      }

      let finalUrl = returnUrl;
      const ticket = (response.data as any)?.ticket;

      const portalUrl = normalizePath(appPath("/"));
      if (ticket && normalizePath(returnUrl) !== portalUrl) {
        const urlObj = new URL(returnUrl, window.location.origin);
        urlObj.searchParams.set("token", ticket);
        finalUrl = urlObj.toString();
      }

      window.location.href = finalUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falla crítica en la autenticación");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <aside className="login-hero">
        <div className="hero-overlay">
          <div className="hero-content">
            <div className="hero-logo">Claro</div>
            <h2 className="hero-headline">
              Donde la conexión<br />empieza aquí.
            </h2>
            <p className="hero-tagline">
              Portal del Colaborador · Claro Nicaragua
            </p>
          </div>
        </div>
      </aside>

      <main className="login-panel">
        <div className="login-card">
          <header className="login-header">
            <h1 className="login-title">Bienvenido</h1>
          </header>

          <form onSubmit={submitLogin} className="login-form">
            <div className="input-group">
              <label className="input-label">Correo</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-user input-icon"></i>
                <input
                  id="login-usuario"
                  className="login-input"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="tu.correo@claro.com.ni"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Contraseña</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-lock input-icon"></i>
                <input
                  id="login-clave"
                  className="login-input"
                  type="password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="error-banner" role="alert">
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>{error}</span>
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={!canSubmit || loading}
              className="submit-btn"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <i className="fa-solid fa-arrow-right"></i>
                </>
              )}
            </button>
          </form>
        </div>

        <footer className="copyright">
          © {new Date().getFullYear()} Claro Nicaragua · Dirección de Sistemas
        </footer>
      </main>
    </div>
  );
}
