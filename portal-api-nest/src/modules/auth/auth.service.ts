import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../shared/database/database.service';
import * as argon2 from 'argon2';
import { createHash } from 'crypto';

export interface LoginLookup {
  idCuentaPortal: number;
  usuario: string;
  nombre: string;
  correo: string;
  activo: boolean;
  bloqueado: boolean;
  claveHash: string;
  mustChangePassword: boolean;
}

export interface AuthenticatedUser {
  idCuentaPortal: number;
  idPersona: number;
  usuario: string;
  nombre: string;
  correo: string;
  carnet: string;
  esInterno: boolean;
  mustChangePassword: boolean;
  apps: string[];
  permisos: string[];
}

export interface EmployeePortalProfile {
  idPersona: number;
  nombre: string;
  correo: string | null;
  cargo: string | null;
  empresa: string | null;
  departamento: string | null;
  pais: string | null;
  jefe: string | null;
}

export interface EmployeeNameRecord {
  idPersona: number;
  nombre: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly appRouteOverrides: Record<string, string> = {
    portal: process.env.PORTAL_PUBLIC_URL?.trim() || 'https://www.rhclaroni.com/portal/',
    planer: process.env.PLANER_PUBLIC_URL?.trim() || 'https://www.rhclaroni.com/portal/planer/',
    clima: process.env.CLIMA_PUBLIC_URL?.trim() || 'https://www.rhclaroni.com/portal/clima/',
    clinica: process.env.CLINICA_PUBLIC_URL?.trim() || '',
    inventario: process.env.INVENTARIO_PUBLIC_URL?.trim() || '',
    vacante: process.env.VACANTE_PUBLIC_URL?.trim() || '',
  };
  private readonly submoduleSyncTargets = [
    {
      name: 'Planer',
      url: process.env.PLANER_SYNC_URL?.trim() || 'http://127.0.0.1:3002/api/auth/sso-sync-user',
    },
    {
      name: 'Clima',
      url: process.env.CLIMA_SYNC_URL?.trim() || 'http://127.0.0.1:3004/api/auth/sso-sync-user',
    },
    {
      name: 'Clinica',
      url: process.env.CLINICA_SYNC_URL?.trim() || '',
    },
  ];

  constructor(private readonly db: DatabaseService) {}

  private normalizeAppRoute(codigo: string, ruta: string): string {
    const code = (codigo ?? '').trim().toLowerCase();
    const currentRoute = (ruta ?? '').trim();
    const overrideRoute = (this.appRouteOverrides[code] ?? '').trim();

    if (!overrideRoute) {
      return currentRoute;
    }

    if (!currentRoute) {
      return overrideRoute;
    }

    if (/^https?:\/\/localhost(?::\d+)?(?:\/|$)/i.test(currentRoute)) {
      return overrideRoute;
    }

    return currentRoute;
  }

  async getMustChangePassword(idCuentaPortal: number): Promise<boolean> {
    try {
      const request = this.db.Pool.request();
      request.input('IdCuentaPortal', idCuentaPortal);
      const result = await request.query(`
        SELECT CAST(ISNULL(DebeCambiarClave, 0) AS bit) as DebeCambiarClave
        FROM CuentaPortal
        WHERE IdCuentaPortal = @IdCuentaPortal
      `);

      return !!result.recordset?.[0]?.DebeCambiarClave;
    } catch (err) {
      this.logger.error(`getMustChangePassword failed: ${err}`);
      return false;
    }
  }

  async findLoginUser(usuario: string): Promise<LoginLookup | null> {
    try {
      const request = this.db.Pool.request();
      request.input('Usuario', usuario.trim().toLowerCase());
      request.input('TipoLogin', 'empleado');
      const result = await request.execute('dbo.spSeg_Login');
      const row = result.recordset?.[0];
      if (!row) return null;

      const nombre =
        (row.NombreEmpleado || '').trim() ||
        [row.Nombres, row.PrimerApellido, row.SegundoApellido]
          .filter((p: string) => p?.trim())
          .join(' ');

      return {
        idCuentaPortal: row.IdCuentaPortal ?? 0,
        usuario: (row.Usuario ?? '').trim(),
        nombre: nombre.trim(),
        correo: (row.CorreoEmpleado || row.CorreoLogin || '').trim(),
        activo: row.Activo ?? false,
        bloqueado: row.Bloqueado ?? false,
        claveHash: (row.ClaveHash ?? '').trim(),
        mustChangePassword: await this.getMustChangePassword(row.IdCuentaPortal ?? 0),
      };
    } catch (err) {
      this.logger.error(`findLoginUser failed: ${err}`);
      return null;
    }
  }

  async validarClavePortal(claveHash: string, clavePlana: string): Promise<boolean> {
    const hash = claveHash.trim();

    // Argon2 hash
    if (hash.startsWith('$argon2')) {
      try {
        return await argon2.verify(hash, clavePlana);
      } catch (err) {
        this.logger.error(`Error Argon2: ${err}`);
        return false;
      }
    }

    // SHA-256 fallback (sha256$...)
    if (hash.startsWith('sha256$')) {
      const expectedHash = hash.slice('sha256$'.length);
      const computed = createHash('sha256').update(clavePlana).digest('hex');
      return computed.toLowerCase() === expectedHash.toLowerCase();
    }

    return false;
  }

  async getUser(idCuentaPortal: number): Promise<AuthenticatedUser | null> {
    try {
      const request = this.db.Pool.request();
      request.input('IdCuentaPortal', idCuentaPortal);
      const result = await request.execute('dbo.spSeg_Me');
      const row = result.recordset?.[0];
      if (!row) return null;

      const nombre =
        (row.nombre_completo || '').trim() ||
        [row.Nombres, row.PrimerApellido, row.SegundoApellido]
          .filter((p: string) => p?.trim())
          .join(' ');

      const apps = await this.listUserApps(idCuentaPortal);
      const permisos = await this.listUserPermissions(idCuentaPortal);

      return {
        idCuentaPortal: row.IdCuentaPortal ?? 0,
        idPersona: row.IdPersona ?? 0,
        usuario: (row.Usuario ?? '').trim(),
        nombre: nombre.trim(),
        correo: (row.correo || row.CorreoLogin || '').trim(),
        carnet: (row.Carnet ?? '').trim(),
        esInterno: row.EsInterno ?? false,
        mustChangePassword: await this.getMustChangePassword(idCuentaPortal),
        apps,
        permisos,
      };
    } catch (err) {
      this.logger.error(`getUser failed: ${err}`);
      return null;
    }
  }

  async listUserApps(idCuentaPortal: number): Promise<string[]> {
    try {
      const request = this.db.Pool.request();
      request.input('IdCuentaPortal', idCuentaPortal);
      const result = await request.execute('dbo.spSeg_UsuarioApps');
      return result.recordset?.map((r: any) => (r.Codigo ?? '').trim()) ?? [];
    } catch {
      return [];
    }
  }

  async listUserAppsVerbose(idCuentaPortal: number): Promise<any[]> {
    try {
      const request = this.db.Pool.request();
      request.input('IdCuentaPortal', idCuentaPortal);
      const result = await request.execute('dbo.spSeg_UsuarioApps');
      return (
        result.recordset?.map((r: any) => ({
          codigo: (r.Codigo ?? '').trim(),
          nombre: (r.Nombre ?? '').trim(),
          ruta: this.normalizeAppRoute((r.Codigo ?? '').trim(), (r.Ruta ?? '').trim()),
          icono: (r.Icono ?? '').trim(),
          descripcion: '',
        })) ?? []
      );
    } catch {
      return [];
    }
  }

  async listUserPermissions(idCuentaPortal: number): Promise<string[]> {
    try {
      const request = this.db.Pool.request();
      request.input('IdCuentaPortal', idCuentaPortal);
      const result = await request.execute('dbo.spSeg_UsuarioPermisos');
      return result.recordset?.map((r: any) => (r.Codigo ?? '').trim()) ?? [];
    } catch {
      return [];
    }
  }

  async getEmployeeProfile(idPersona: number): Promise<EmployeePortalProfile | null> {
    try {
      const request = this.db.Pool.request();
      request.input('IdPersona', idPersona);
      const result = await request.execute('dbo.spSeg_Usuario_ObtenerDetallePerfil');
      const row = result.recordset?.[0];
      if (!row) return null;

      return {
        idPersona,
        nombre: (row.NombreEmpleado ?? '').trim(),
        correo: (row.CorreoEmpleado ?? '').trim() || null,
        cargo: (row.Cargo ?? '').trim() || null,
        empresa: (row.Empresa ?? '').trim() || null,
        departamento: (row.Departamento ?? '').trim() || null,
        pais: (row.Pais ?? '').trim() || null,
        jefe: (row.Jefe ?? '').trim() || null,
      };
    } catch {
      return null;
    }
  }

  async listEmployeeNames(idsPersona: number[]): Promise<EmployeeNameRecord[]> {
    const uniqueIds = [...new Set(idsPersona.filter((id) => id > 0))];
    if (uniqueIds.length === 0) return [];

    try {
      const request = this.db.Pool.request();
      request.input('IdsPersonaJson', JSON.stringify(uniqueIds));
      const result = await request.execute('dbo.spSeg_Usuario_ListarNombresPerfil');
      return (
        result.recordset
          ?.map((r: any) => ({
            idPersona: r.IdPersona,
            nombre: (r.NombreEmpleado ?? '').trim(),
          }))
          .filter((r: EmployeeNameRecord) => r.nombre) ?? []
      );
    } catch {
      return [];
    }
  }

  async getObservabilitySnapshot(): Promise<any> {
    try {
      const request = this.db.Pool.request();
      const result = await request.execute('dbo.spSeg_Dashboard_Observabilidad');
      const row = result.recordset?.[0];
      return {
        activeSessions: row?.ActiveSessions ?? 0,
        loginSuccess24h: row?.LoginSuccess24h ?? 0,
        loginFailure24h: row?.LoginFailure24h ?? 0,
        refreshFailure24h: row?.RefreshFailure24h ?? 0,
        securityHigh24h: row?.SecurityHigh24h ?? 0,
        securityWarn24h: row?.SecurityWarn24h ?? 0,
      };
    } catch {
      return {};
    }
  }

  // ===========================================================================
  // ADMINISTRACIÓN Y GESTIÓN DE USUARIOS
  // ===========================================================================

  async listAllApps() {
    try {
      const result = await this.db.Pool.request().query('SELECT * FROM AplicacionSistema WHERE Activo = 1 ORDER BY OrdenVisual ASC');
      return result.recordset;
    } catch (err) {
      this.logger.error(`listAllApps failed: ${err}`);
      throw err;
    }
  }

  async createApplication(data: { codigo: string; nombre: string; ruta: string; icono: string; descripcion?: string }) {
    try {
      await this.db.Pool.request()
        .input('codigo', data.codigo)
        .input('nombre', data.nombre)
        .input('ruta', data.ruta)
        .input('icono', data.icono)
        .query(`
          INSERT INTO AplicacionSistema (Codigo, Nombre, Ruta, Icono, Activo, OrdenVisual)
          VALUES (@codigo, @nombre, @ruta, @icono, 1, (SELECT ISNULL(MAX(OrdenVisual), 0) + 1 FROM AplicacionSistema))
        `);
      return { ok: true };
    } catch (err) {
      this.logger.error(`createApplication failed: ${err}`);
      throw err;
    }
  }

  async updateApplication(id: number, data: { codigo: string; nombre: string; ruta: string; icono: string; descripcion?: string }) {
    try {
      await this.db.Pool.request()
        .input('id', id)
        .input('codigo', data.codigo)
        .input('nombre', data.nombre)
        .input('ruta', data.ruta)
        .input('icono', data.icono)
        .query(`
          UPDATE AplicacionSistema 
          SET Codigo = @codigo, Nombre = @nombre, Ruta = @ruta, Icono = @icono 
          WHERE IdAplicacion = @id
        `);
      return { ok: true };
    } catch (err) {
      this.logger.error(`updateApplication failed: ${err}`);
      throw err;
    }
  }

  async deleteApplication(id: number) {
    try {
      // Borrado lógico para no romper historial de accesos
      await this.db.Pool.request()
        .input('id', id)
        .query('UPDATE AplicacionSistema SET Activo = 0 WHERE IdAplicacion = @id');
      return { ok: true };
    } catch (err) {
      this.logger.error(`deleteApplication failed: ${err}`);
      throw err;
    }
  }

  async toggleAppMapping(idCuentaPortal: number, idAplicacion: number, activo: boolean) {
    if (activo) {
      await this.db.Pool.request()
        .input('u', idCuentaPortal)
        .input('a', idAplicacion)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM UsuarioAplicacion WHERE IdCuentaPortal = @u AND IdAplicacion = @a)
            INSERT INTO UsuarioAplicacion (IdCuentaPortal, IdAplicacion, Activo, FechaCreacion)
            VALUES (@u, @a, 1, GETDATE())
          ELSE
            UPDATE UsuarioAplicacion SET Activo = 1 WHERE IdCuentaPortal = @u AND IdAplicacion = @a
        `);
    } else {
      await this.db.Pool.request()
        .input('u', idCuentaPortal)
        .input('a', idAplicacion)
        .query('UPDATE UsuarioAplicacion SET Activo = 0 WHERE IdCuentaPortal = @u AND IdAplicacion = @a');
    }
    return { ok: true };
  }

  async setPassword(idCuentaPortal: number, nuevaClave: string, mustChangePassword = false) {
    const hash = await argon2.hash(nuevaClave);
    await this.db.Pool.request()
      .input('id', idCuentaPortal)
      .input('hash', hash)
      .input('mustChangePassword', mustChangePassword ? 1 : 0)
      .query('UPDATE CuentaPortal SET ClaveHash = @hash, DebeCambiarClave = @mustChangePassword, FechaModificacion = GETDATE() WHERE IdCuentaPortal = @id');
    return { ok: true };
  }

  async listAllUsers() {
    try {
      const result = await this.db.Pool.request().query(`
        SELECT 
          cp.IdCuentaPortal, 
          cp.Usuario, 
          cp.CorreoLogin, 
          cp.Activo, 
          cp.EsInterno,
          ISNULL(p.Nombres, '') as Nombres, 
          ISNULL(p.PrimerApellido, '') as PrimerApellido, 
          ISNULL(p.SegundoApellido, '') as SegundoApellido, 
          cp.Carnet,
          emp.cargo as Cargo,
          emp.OGERENCIA as Gerencia,
          emp.oSUBGERENCIA as Subgerencia,
          emp.primernivel as Area,
          emp.departamento,
          emp.Gender as Sexo,
          emp.nom_jefe1 as Jefe,
          emp.telefono as Telefono,
          (
            SELECT ua.IdAplicacion 
            FROM UsuarioAplicacion ua 
            WHERE ua.IdCuentaPortal = cp.IdCuentaPortal AND ua.Activo = 1 
            FOR JSON PATH
          ) as AppsJson
        FROM CuentaPortal cp
        LEFT JOIN Persona p ON cp.IdPersona = p.IdPersona
        LEFT JOIN Empleado emp ON cp.Carnet = emp.carnet -- carnet en minúscula como el original
        ORDER BY p.Nombres ASC
      `);
      
      return result.recordset.map(row => ({
        ...row,
        AppsIds: row.AppsJson ? JSON.parse(row.AppsJson).map((a: any) => a.IdAplicacion) : []
      }));
    } catch (err) {
      this.logger.error(`listAllUsers failed: ${err}`);
      throw err;
    }
  }

  // ===========================================================================
  // SINCRONIZACIÓN DE USUARIOS A SUBMÓDULOS (Planer, Clima, Clinica)
  // ===========================================================================
  async syncToSubmodules(userPayload: any): Promise<any[]> {
    const apps = this.submoduleSyncTargets;

    const results = [];
    for (const app of apps) {
      if (!app.url) {
        results.push({ app: app.name, ok: true, skipped: true });
        continue;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        await fetch(app.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userPayload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        results.push({ app: app.name, ok: true });
      } catch (err: any) {
        this.logger.error(`[SYNC] Error sincronizando hacia ${app.name}: ${err.message}`);
        results.push({ app: app.name, ok: false, error: err.message });
      }
    }
    return results;
  }

  async updateUserMetadata(body: {
    idCuentaPortal: number;
    esInterno: boolean;
    cargo?: string;
    gerencia?: string;
    subgerencia?: string;
    area?: string;
    departamento?: string;
    jefe?: string;
    nombres?: string;
    ape1?: string;
  }) {
    // 1. Obtener Carnet Actual
    const pool = this.db.Pool;
    const userRes = await pool.request().input('id', body.idCuentaPortal)
      .query('SELECT Carnet, IdPersona FROM CuentaPortal WHERE IdCuentaPortal = @id');
    
    if (userRes.recordset.length === 0) return { ok: false, message: 'Usuario no encontrado' };
    const { Carnet, IdPersona } = userRes.recordset[0];

    // 2. Actualizar CuentaPortal (EsInterno)
    await pool.request()
      .input('id', body.idCuentaPortal)
      .input('esInterno', body.esInterno ? 1 : 0)
      .query('UPDATE CuentaPortal SET EsInterno = @esInterno WHERE IdCuentaPortal = @id');

    // 3. Actualizar Persona (Nombres/Apellidos si vienen)
    if (body.nombres || body.ape1) {
      await pool.request()
        .input('id', IdPersona)
        .input('n', body.nombres)
        .input('a1', body.ape1)
        .query('UPDATE Persona SET Nombres = ISNULL(@n, Nombres), PrimerApellido = ISNULL(@a1, PrimerApellido) WHERE IdPersona = @id');
    }

    // 4. Actualizar Empleado (Metadata organizativa)
    if (Carnet) {
      await pool.request()
        .input('c', Carnet)
        .input('cargo', body.cargo || '')
        .input('gerencia', body.gerencia || '')
        .input('subgerencia', body.subgerencia || '')
        .input('area', body.area || '')
        .input('departamento', body.departamento || '')
        .input('jefe', body.jefe || '')
        .query(`
          UPDATE Empleado SET 
            cargo = @cargo, OGERENCIA = @gerencia, oSUBGERENCIA = @subgerencia, 
            primernivel = @area, departamento = @departamento, nom_jefe1 = @jefe, FechaModificacion = GETDATE()
          WHERE carnet = @c
        `);
    }

    return { ok: true, message: 'Información actualizada exitosamente.' };
  }

  async listDelegations() {
    const res = await this.db.Pool.request().query("SELECT * FROM DelegacionTemporal ORDER BY FechaCreacion DESC");
    return res.recordset;
  }

  async createDelegation(body: { carnetOrigin: string; nombreOrigin: string; carnetSub: string; nombreSub: string; motivo: string }) {
    const pool = this.db.Pool;
    const res = await pool.request()
      .input("co", body.carnetOrigin)
      .input("no", body.nombreOrigin)
      .input("cs", body.carnetSub)
      .input("ns", body.nombreSub)
      .input("m", body.motivo)
      .query(`
        INSERT INTO DelegacionTemporal (CarnetOriginal, NombreOriginal, CarnetSustituto, NombreSustituto, Motivo, Activo) 
        OUTPUT INSERTED.Id 
        VALUES (@co, @no, @cs, @ns, @m, 0)
      `);
    return { ok: true, id: res.recordset[0].Id };
  }

  async toggleDelegation(id: number, active: boolean) {
    const pool = this.db.Pool;
    const delRes = await pool.request().input("id", id).query("SELECT * FROM DelegacionTemporal WHERE Id = @id");
    if (delRes.recordset.length === 0) return { ok: false, message: "Delegación no encontrada" };
    const del = delRes.recordset[0];

    if (active) {
      // 1. Identificar dependientes actuales del jefe original e insertarlos en la tabla de rastro
      const dependientes = await pool.request()
        .input("jefe", del.NombreOriginal)
        .query("SELECT carnet FROM Empleado WHERE nom_jefe1 = @jefe");
      
      const carnetList = dependientes.recordset.map(r => r.carnet);
      if (carnetList.length > 0) {
        // Guardar rastro para revertir luego
        for (const c of carnetList) {
          await pool.request().input("did", id).input("c", c).query("INSERT INTO DelegacionDependiente (DelegacionId, CarnetEmpleado) VALUES (@did, @c)");
        }
        // 2. Ejecutar el Batch Update masivo (Planer y Clima leerán al sustituto)
        await pool.request()
          .input("jefeOrig", del.NombreOriginal)
          .input("jefeSub", del.NombreSustituto)
          .query("UPDATE Empleado SET nom_jefe1 = @jefeSub WHERE nom_jefe1 = @jefeOrig");
      }
    } else {
      // Revertir: Volver al jefe original solo para los empleados que se cambiaron originalmente
      await pool.request()
        .input("did", id)
        .input("jefeOrig", del.NombreOriginal)
        .query(`
          UPDATE Empleado SET nom_jefe1 = @jefeOrig 
          WHERE carnet IN (SELECT CarnetEmpleado FROM DelegacionDependiente WHERE DelegacionId = @did)
        `);
      // Limpiar rastro
      await pool.request().input("did", id).query("DELETE FROM DelegacionDependiente WHERE DelegacionId = @did");
    }

    await pool.request().input("id", id).input("a", active ? 1 : 0).query("UPDATE DelegacionTemporal SET Activo = @a WHERE Id = @id");
    return { ok: true };
  }

  async createFullUser(data: any): Promise<any> {
    try {
      // 1. Crear Persona
      const resP = await this.db.Pool.request()
        .input("n", data.nombres)
        .input("a", data.ape1)
        .query("INSERT INTO Persona (Nombres, PrimerApellido, Activo) OUTPUT INSERTED.IdPersona VALUES (@n, @a, 1)");
      
      const idPersona = resP.recordset[0].IdPersona;

      // 2. Crear CuentaPortal
      await this.db.Pool.request()
        .input("idp", idPersona)
        .input("u", data.correoLogin.split('@')[0])
        .input("c", data.correoLogin)
        .input("p", "123456") // Password por defecto
        .input("car", data.carnet)
        .input("int", data.esInterno ? 1 : 0)
        .query(`
          INSERT INTO CuentaPortal (IdPersona, Usuario, Clave, CorreoLogin, Carnet, Activo, EsInterno)
          VALUES (@idp, @u, @c, @c, @car, 1, @int)
        `);

      // 3. Crear Empleado (Metadata local)
      await this.db.Pool.request()
        .input("car", data.carnet)
        .input("nom", `${data.nombres} ${data.ape1}`)
        .input("caro", data.cargo)
        .input("ger", data.gerencia)
        .input("sub", data.subgerencia)
        .input("area", data.area)
        .input("dep", data.departamento)
        .input("jef", data.jefe)
        .input("sex", data.sexo)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM Empleado WHERE carnet = @car)
          INSERT INTO Empleado (carnet, nombres, cargo, OGERENCIA, oSUBGERENCIA, primernivel, departamento, nom_jefe1, Gender)
          VALUES (@car, @nom, @caro, @ger, @sub, @area, @dep, @jef, @sex)
          ELSE
          UPDATE Empleado SET 
            nombres=@nom, cargo=@caro, OGERENCIA=@ger, oSUBGERENCIA=@sub, 
            primernivel=@area, departamento=@dep, nom_jefe1=@jef, Gender=@sex
          WHERE carnet = @car
        `);

      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  }

  // ===========================================================================
  // MANTENIMIENTO: SINCRONIZACIÓN MASIVA (BULK)
  // ===========================================================================

  /**
   * Sincroniza una lista de usuarios (CSV) con la base de datos central
   */
  async syncUsersBulk(users: any[]): Promise<{ processed: number }> {
    try {
      const json = JSON.stringify(users);
      const res = await this.db.Pool.request()
        .input('JsonData', json)
        .execute('dbo.spAdmin_SincronizarUsuariosBulk');

      const processed = res.recordset[0]?.Procesados || 0;
      this.logger.log(`✅ Sincronización Bulk completada: ${processed} usuarios procesados.`);
      return { processed };
    } catch (err: any) {
      this.logger.error(`❌ Error en syncUsersBulk: ${err.message}`);
      throw err;
    }
  }

  /**
   * Sincroniza una lista de IDs de usuarios hacia los sub-sistemas indicados
   */
  async massiveNetworkSync(userIds: number[], appIds: number[]): Promise<void> {
      // 1. Obtener los detalles completos de los usuarios a sincronizar
      const pool = this.db.Pool;
      const usersRes = await pool.request()
          .query(`
              SELECT 
                  cp.Carnet as carnet,
                  p.Nombres + ' ' + ISNULL(p.PrimerApellido, '') as nombre,
                  cp.CorreoLogin as correo,
                  cp.Activo as activo,
                  cp.EsInterno as esInterno,
                  emp.cargo,
                  emp.OGERENCIA as gerencia,
                  emp.oSUBGERENCIA as subgerencia,
                  emp.primernivel as area,
                  emp.departamento,
                  emp.nom_jefe1 as jefeNombre,
                  emp.telefono,
                  emp.Gender as genero
              FROM CuentaPortal cp
              JOIN Persona p ON cp.IdPersona = p.IdPersona
              LEFT JOIN Empleado emp ON cp.Carnet = emp.carnet
              WHERE cp.IdCuentaPortal IN (${userIds.join(',')})
          `);

      const usersToSync = usersRes.recordset;
      
      // 2. Determinar los targets basados en appIds
      // appIds: 1 = Planer, 2 = Clima (según BD)
      const targets: any[] = [];
      if (appIds.includes(1)) targets.push(this.submoduleSyncTargets[0]); // Planer
      if (appIds.includes(2)) targets.push(this.submoduleSyncTargets[1]); // Clima

      this.logger.log(`🚀 Iniciando sincronización masiva de red para ${usersToSync.length} usuarios en ${targets.length} apps.`);

      // 3. Procesar por lotes para no saturar las APIs externas
      const batchSize = 50;
      for (let i = 0; i < usersToSync.length; i += batchSize) {
          const batch = usersToSync.slice(i, i + batchSize);
          
          await Promise.all(batch.map(user => {
              return Promise.all(targets.map(async (target: any) => {
                  if (!target.url) return;
                  try {
                      await fetch(target.url, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(user)
                      });
                  } catch (e) {
                      // Log fail but continue
                  }
              }));
          }));
          
          this.logger.log(`📦 Lote de sincronización completado: ${Math.min(i + batchSize, usersToSync.length)}/${usersToSync.length}`);
      }

      this.logger.log(`🏁 Sincronización masiva de red finalizada.`);
  }
}
