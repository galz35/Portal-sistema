import { createBrowserRouter } from "react-router-dom";
import LoginPage from "../modules/auth/pages/LoginPage";
import LoginEmpleadoPage from "../modules/auth/pages/LoginEmpleadoPage";
import PortalDashboardPage from "../modules/portal/pages/PortalDashboardPage";
import PerfilBasePage from "../modules/portal/pages/PerfilBasePage";
import SinAccesoPage from "../modules/portal/pages/SinAccesoPage";
import AdminUsuariosPage from "../modules/portal/pages/AdminUsuariosPage";
import AuthGuard from "../shared/guards/AuthGuard";
import { APP_BASE } from "../shared/config/runtime";

const basename = APP_BASE === "/" ? undefined : APP_BASE.replace(/\/$/, "");

export const router = createBrowserRouter([
  { path: "/", element: <AuthGuard><PortalDashboardPage /></AuthGuard> },
  { path: "/login", element: <LoginPage /> },
  { path: "/login-empleado", element: <LoginEmpleadoPage /> },
  { path: "/portal", element: <AuthGuard><PortalDashboardPage /></AuthGuard> },
  { path: "/portal/dashboard", element: <AuthGuard><PortalDashboardPage /></AuthGuard> },
  { path: "/portal/perfil", element: <AuthGuard><PerfilBasePage /></AuthGuard> },
  { path: "/portal/admin", element: <AuthGuard><AdminUsuariosPage /></AuthGuard> },
  { path: "/portal/seguridad", element: <AuthGuard><SinAccesoPage /></AuthGuard> },
  { path: "/portal/notificaciones", element: <AuthGuard><SinAccesoPage /></AuthGuard> },
  { path: "/sin-acceso", element: <SinAccesoPage /> },
], basename ? { basename } : undefined);
