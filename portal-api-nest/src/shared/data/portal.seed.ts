export type PortalUser = {
  idCuentaPortal: number;
  idPersona: number;
  usuario: string;
  clave: string;
  nombre: string;
  correo: string;
  carnet: string;
  esInterno: boolean;
  apps: string[];
  permisos: string[];
};

export type PortalAppRecord = {
  codigo: string;
  nombre: string;
  ruta: string;
  icono: string;
  descripcion: string;
};

export const PORTAL_APPS: PortalAppRecord[] = [
  {
    codigo: 'portal',
    nombre: 'Portal Central',
    ruta: '/portal',
    icono: 'PC',
    descripcion: 'Inicio corporativo con sesion centralizada y perfil base.',
  },
  {
    codigo: 'vacantes',
    nombre: 'Vacantes 2.0',
    ruta: '/app/vacantes',
    icono: 'RH',
    descripcion: 'Operacion de reclutamiento, vacantes publicas y flujo RH.',
  },
];

export const PORTAL_USERS: PortalUser[] = [
  {
    idCuentaPortal: 1001,
    idPersona: 501,
    usuario: 'empleado.portal',
    clave: 'Portal123*',
    nombre: 'Ana Portal',
    correo: 'ana.portal@claro.example',
    carnet: 'CL-1001',
    esInterno: true,
    apps: ['portal', 'vacantes'],
    permisos: ['app.portal', 'app.vacantes', 'vacantes.rh.ver'],
  },
  {
    idCuentaPortal: 1002,
    idPersona: 502,
    usuario: 'candidato.demo',
    clave: 'Portal123*',
    nombre: 'Luis Candidato',
    correo: 'luis.candidato@example.com',
    carnet: 'EXT-2001',
    esInterno: false,
    apps: ['vacantes'],
    permisos: ['app.vacantes'],
  },
];
