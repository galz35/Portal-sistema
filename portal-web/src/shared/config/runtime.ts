/**
 * Centralizador de Rutas y Configuración de Entorno (Claro Portal)
 * 
 * Este archivo resuelve las bases de la APP y de la API dinámicamente.
 * Permite que el mismo código corra en Local (raíz /) y en VPS (subruta /portal-test/).
 */

// 1. Base pública de la Web (Eje: / ó /portal-test/)
export const APP_BASE = import.meta.env.VITE_BASE_PATH || "/";

// 2. Base de la API (Eje: /api ó /api-portal-test)
export const API_BASE = import.meta.env.VITE_API_URL || "/api";

/**
 * Resuelve una ruta interna de la aplicación respetando el subdirectorio.
 * @param path Ruta absoluta interna (ej: '/login')
 * @returns Ruta final para navegación (ej: '/portal-test/login')
 */
export function appPath(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${APP_BASE}${cleanPath}`.replace(/\/+/g, '/');
}

/**
 * Resuelve un endpoint de la API central.
 * @param endpoint Ruta del endpoint (ej: '/auth/me')
 * @returns URL completa de fetch (ej: '/api-portal-test/auth/me')
 */
export function apiUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${API_BASE}${cleanEndpoint}`.replace(/\/+/g, '/');
}
