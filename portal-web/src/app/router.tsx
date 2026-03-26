import { createBrowserRouter, Navigate } from "react-router-dom";
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
  { path: "/dashboard", element: <AuthGuard><PortalDashboardPage /></AuthGuard> },
  { path: "/login", element: <LoginPage /> },
  { path: "/login-empleado", element: <LoginEmpleadoPage /> },
  { path: "/perfil", element: <AuthGuard><PerfilBasePage /></AuthGuard> },
  { path: "/admin", element: <AuthGuard><AdminUsuariosPage /></AuthGuard> },
  { path: "/seguridad", element: <AuthGuard><SinAccesoPage /></AuthGuard> },
  { path: "/notificaciones", element: <AuthGuard><SinAccesoPage /></AuthGuard> },
  { path: "/portal", element: <Navigate to="/" replace /> },
  { path: "/portal/dashboard", element: <Navigate to="/dashboard" replace /> },
  { path: "/portal/perfil", element: <Navigate to="/perfil" replace /> },
  { path: "/portal/admin", element: <Navigate to="/admin" replace /> },
  { path: "/portal/seguridad", element: <Navigate to="/seguridad" replace /> },
  { path: "/portal/notificaciones", element: <Navigate to="/notificaciones" replace /> },
  { path: "/sin-acceso", element: <SinAccesoPage /> },
], basename ? { basename } : undefined);
