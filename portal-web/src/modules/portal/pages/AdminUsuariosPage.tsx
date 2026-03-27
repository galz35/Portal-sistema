import { useEffect, useState, useRef, type CSSProperties } from "react";
import PortalShell, { panelStyle } from "../components/PortalShell";
import Papa from "papaparse";
import { apiUrl } from "../../../shared/config/runtime";

type UsuarioAdmin = {
    IdCuentaPortal: number;
    Usuario: string;
    Nombres: string;
    PrimerApellido: string;
    SegundoApellido: string;
    CorreoLogin: string;
    Carnet: string;
    Activo: boolean;
    AppsIds?: number[];
    // Metadata organizacional
    Cargo?: string;
    Gerencia?: string;
    Subgerencia?: string;
    Area?: string;
    departamento?: string;
    Sexo?: string;
    Jefe?: string;
    Telefono?: string;
    EsInterno?: boolean;
};

type App = {
    IdAplicacion: number;
    Codigo: string;
    Nombre: string;
    Icono: string;
    Ruta?: string;
};

type ModalType = "none" | "apps" | "createUser" | "importUsers" | "resetPassword" | "editUser" | "delegations";

export default function AdminUsuariosPage() {
    const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
    const [apps, setApps] = useState<App[]>([]);
    const [me, setMe] = useState<{ nombre: string; usuario: string; carnet: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeModal, setActiveModal] = useState<ModalType>("none");
    const [editingAppId, setEditingAppId] = useState<number | null>(null);
    const [newApp, setNewApp] = useState({ codigo: "", nombre: "", ruta: "", icono: "rocket", descripcion: "" });
    const [visibleAppIds, setVisibleAppIds] = useState<number[]>([]);

    // Create User
    const [newUser, setNewUser] = useState({ nombres: "", primerApellido: "", segundoApellido: "", correo: "", carnet: "" });

    // Import Users
    const [importUsersList, setImportUsersList] = useState<any[]>([]);
    const [importResult, setImportResult] = useState<any>(null);
    const [importBatchStatus, setImportBatchStatus] = useState({ current: 0, total: 0, active: false });
    const fileRef = useRef<HTMLInputElement>(null);

    // Reset Password
    const [resetTarget, setResetTarget] = useState<UsuarioAdmin | null>(null);
    const [resetClave, setResetClave] = useState("123456");

    // Toast
    const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

    // Delegations
    const [delegations, setDelegations] = useState<any[]>([]);
    const [newDel, setNewDel] = useState({ carnetOrigin: "", carnetSub: "", motivo: "" });

    const [editUserTarget, setEditUserTarget] = useState<UsuarioAdmin | null>(null);
    const emptyFormData = {
        carnet: "", correoLogin: "", nombres: "", ape1: "", cargo: "", gerencia: "", subgerencia: "", area: "", departamento: "", jefe: "", sexo: "M", esInterno: true
    };
    const [editFormData, setEditFormData] = useState(emptyFormData);

    function showToast(msg: string, type: "ok" | "err" = "ok") {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    }

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [meRes, uRes, aRes] = await Promise.all([
                fetch(apiUrl("/auth/me"), { credentials: "include" }),
                fetch(apiUrl("/admin/users"), { credentials: "include" }),
                fetch(apiUrl("/admin/apps"), { credentials: "include" }),
            ]);
            setMe(await meRes.json());
            const uData = await uRes.json();
            setUsuarios(uData.items || []);
            const aData = await aRes.json();
            const loadedApps = aData.items || [];
            setApps(loadedApps);
            // Mostrar por defecto las 3 primeras o las que tengan código planer/clima/portal
            if (visibleAppIds.length === 0) {
                const defaults = loadedApps.filter((a: any) => ['portal', 'planer', 'clima'].includes(a.Codigo.toLowerCase())).map((a: any) => a.IdAplicacion);
                setVisibleAppIds(defaults.length > 0 ? defaults : loadedApps.slice(0, 3).map((a: any) => a.IdAplicacion));
            }
        } catch (err) {
            console.error("Error cargando datos:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadDelegations = async () => {
        try {
            const res = await fetch(apiUrl("/admin/list-delegations"), { credentials: "include" });
            const data = await res.json();
            setDelegations(data);
        } catch {}
    };

    const handleCreateDelegation = async () => {
        const jefeOrig = usuarios.find(u => u.Carnet === newDel.carnetOrigin);
        const jefeSub = usuarios.find(u => u.Carnet === newDel.carnetSub);
        if (!jefeOrig || !jefeSub) return showToast("Seleccione jefes válidos", "err");

        try {
            const res = await fetch(apiUrl("/admin/create-delegation"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    ...newDel,
                    nombreOrigin: `${jefeOrig.Nombres} ${jefeOrig.PrimerApellido}`,
                    nombreSub: `${jefeSub.Nombres} ${jefeSub.PrimerApellido}`
                })
            });
            if (res.ok) {
                showToast("Delegación registrada");
                setNewDel({ carnetOrigin: "", carnetSub: "", motivo: "" });
                loadDelegations();
            }
        } catch (err) {
            showToast("Error al crear delegación", "err");
        }
    };

    const toggleDelegationActive = async (id: number, active: boolean) => {
        setLoading(true);
        try {
            const res = await fetch(apiUrl("/admin/toggle-delegation"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ id, active })
            });
            if (res.ok) {
                showToast(active ? "Poder de firma activado" : "Poder de firma revertido");
                loadDelegations();
                loadData();
            }
        } catch {
            showToast("Error en operación", "err");
        } finally {
            setLoading(false);
        }
    };

    const togglePermission = async (userId: number, appId: number, active: boolean) => {
        try {
            const res = await fetch(apiUrl("/admin/permissions"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ idCuentaPortal: userId, idAplicacion: appId, activo: active }),
            });
            if (res.ok) {
                setUsuarios((prev) =>
                    prev.map((u) => {
                        if (u.IdCuentaPortal === userId) {
                            const newApps = active ? [...(u.AppsIds || []), appId] : (u.AppsIds || []).filter((id) => id !== appId);
                            return { ...u, AppsIds: newApps };
                        }
                        return u;
                    })
                );
            }
        } catch {
            showToast("Error al actualizar permiso", "err");
        }
    };

    const toggleAppForFilteredUsers = async (appId: number, active: boolean, appName: string) => {
        if (!confirm(`¿Seguro que deseas ${active ? "HABILITAR" : "QUITAR"} ${appName} a los ${filteredUsuarios.length} usuarios filtrados?`)) return;
        
        setLoading(true);
        let cambiados = 0;
        try {
            for (const u of filteredUsuarios) {
                const hasApp = u.AppsIds?.includes(appId) || false;
                if (hasApp === active) continue; // Si ya lo tiene, se salta para optimizar

                await fetch(apiUrl("/admin/permissions"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ idCuentaPortal: u.IdCuentaPortal, idAplicacion: appId, activo: active }),
                });
                cambiados++;
            }
            showToast(`Operación masiva completada: ${cambiados} usuarios actualizados.`);
            await loadData();
        } catch {
            showToast("Error parcial en la asignación masiva.", "err");
        } finally {
            setLoading(false);
        }
    };

    const toggleUserActive = async (u: UsuarioAdmin) => {
        const newState = !u.Activo;
        try {
            const res = await fetch(apiUrl("/admin/toggle-user"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ idCuentaPortal: u.IdCuentaPortal, activo: newState }),
            });
            if (res.ok) {
                setUsuarios((prev) => prev.map((x) => (x.IdCuentaPortal === u.IdCuentaPortal ? { ...x, Activo: newState } : x)));
                showToast(`${u.Nombres} ${newState ? "activado" : "desactivado"}`);
            }
        } catch {
            showToast("Error al cambiar estado", "err");
        }
    };

    const handleCreateUser = async () => {
        if (!newUser.nombres || !newUser.primerApellido || !newUser.correo || !newUser.carnet) return showToast("Completa todos los campos obligatorios", "err");
        try {
            const res = await fetch(apiUrl("/admin/create-user"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(newUser),
            });
            const data = await res.json();
            if (data.ok) {
                showToast(data.message);
                setNewUser({ nombres: "", primerApellido: "", segundoApellido: "", correo: "", carnet: "" });
                setActiveModal("none");
                loadData();
            } else {
                showToast(data.message || "Error al crear", "err");
            }
        } catch {
            showToast("Error de red al crear usuario", "err");
        }
    };

    const handleImport = async () => {
        if (importUsersList.length === 0) return showToast("No hay usuarios para importar.", "err");
        
        const total = importUsersList.length;
        const batchSize = 500;
        setImportBatchStatus({ current: 0, total, active: true });
        setLoading(true);

        try {
            let totalProcesados = 0;
            for (let i = 0; i < total; i += batchSize) {
                const chunk = importUsersList.slice(i, i + batchSize);
                const res = await fetch(apiUrl("/admin/sync-users-bulk"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ usuarios: chunk }),
                });
                const data = await res.json();
                if (data.ok) {
                    totalProcesados += (data.procesados || chunk.length);
                    setImportBatchStatus(prev => ({ ...prev, current: Math.min(i + batchSize, total) }));
                } else {
                    throw new Error(data.message || "Error en lote");
                }
            }

            setImportResult({ ok: true, procesados: totalProcesados });
            showToast(`Sincronización Completada: ${totalProcesados} usuarios procesados en total.`);
            loadData();
        } catch (err: any) {
            showToast("Error en sincronización masiva: " + err.message, "err");
        } finally {
            setLoading(false);
            setImportBatchStatus(prev => ({ ...prev, active: false }));
        }
    };

    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: function (results: any) {
                const users = results.data.map((row: any) => ({
                    carnet: row.carnet || row.Carnet || "",
                    nombre: row.nombre || row.nombre_completo || row.Nombres || row.Nombre || "",
                    correo: row.correo || row.correo_electronico || row.Correo || "",
                    es_interno: row.es_interno || row.EsInterno || "SI",
                    activo: row.activo || row.Activo !== undefined ? row.activo : 1,
                    // Extras organizativos
                    cargo: row.cargo || row.Cargo || "",
                    departamento: row.departamento || row.Departamento || "",
                    gerencia: row.gerencia || row.Gerencia || "",
                    subgerencia: row.subgerencia || row.Subgerencia || "",
                    area: row.area || row.Area || "",
                    jefeCarnet: row.jefeCarnet || row.jefe_carnet || row.JefeCarnet || "",
                    jefeNombre: row.jefeNombre || row.jefe_nombre || row.JefeNombre || "",
                    jefeCorreo: row.jefeCorreo || row.jefe_correo || row.JefeCorreo || "",
                    telefono: row.telefono || row.Telefono || "",
                    genero: row.genero || row.Genero || "",
                    fechaIngreso: row.fechaIngreso || row.fecha_ingreso || row.FechaIngreso || "",
                    idOrg: row.idOrg || row.id_org || row.IdOrg || "",
                    orgDepartamento: row.orgDepartamento || row.org_departamento || row.OrgDepartamento || "",
                    orgGerencia: row.orgGerencia || row.org_gerencia || row.OrgGerencia || ""
                }));
                // Filtrar nulos
                const validUsers = users.filter((u: any) => u.carnet && u.correo);
                setImportUsersList(validUsers);
                showToast(`${validUsers.length} usuarios leídos del CSV. Revisa la lista y presiona Sincronizar.`);
            },
            error: function (err: any) {
                showToast("Error leyendo CSV: " + err.message, "err");
            }
        });
    };

    const handleResetPassword = async () => {
        if (!resetTarget) return;
        try {
            const res = await fetch(apiUrl("/admin/reset-password"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ idCuentaPortal: resetTarget.IdCuentaPortal, nuevaClave: resetClave }),
            });
            if (res.ok) {
                showToast(`Contraseña de ${resetTarget.Nombres} restablecida a "${resetClave}"`);
                setActiveModal("none");
                setResetTarget(null);
            }
        } catch {
            showToast("Error al resetear contraseña", "err");
        }
    };

    const handleSaveApp = async () => {
        if (!newApp.codigo || !newApp.nombre) return showToast("Completa código y nombre", "err");
        try {
            const url = editingAppId ? apiUrl(`/admin/apps/${editingAppId}`) : apiUrl("/admin/apps");
            const method = editingAppId ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(newApp),
            });
            if (res.ok) {
                setActiveModal("none");
                setEditingAppId(null);
                loadData();
                showToast(editingAppId ? "App actualizada" : "App creada");
            }
        } catch {
            showToast("Error al guardar app", "err");
        }
    };

    const handleDeleteApp = async (id: number, nombre: string) => {
        if (!confirm(`¿Desactivar la aplicación "${nombre}"?`)) return;
        try {
            await fetch(apiUrl(`/admin/apps/${id}`), { method: "DELETE", credentials: "include" });
            loadData();
            showToast(`${nombre} desactivada`);
        } catch {
            showToast("Error al eliminar", "err");
        }
    };

    const handleSaveUser = async () => {
        if (!editFormData.nombres || (!editUserTarget && !editFormData.carnet)) {
            return showToast("Complete los campos obligatorios", "err");
        }

        setLoading(true);
        try {
            const isEdit = !!editUserTarget;
            const url = isEdit ? "/admin/update-metadata" : "/admin/create-full-user";
            
            const res = await fetch(apiUrl(url), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    idCuentaPortal: editUserTarget?.IdCuentaPortal,
                    ...editFormData
                })
            });

            const data = await res.json();
            if (data.ok) {
                showToast(isEdit ? "Perfil actualizado" : "Usuario creado exitosamente");
                setActiveModal("none");
                loadData();
            } else throw new Error(data.message);
        } catch (err: any) {
            showToast(err.message || "Error en la operación", "err");
        } finally {
            setLoading(false);
        }
    };

    const openEditUser = (u: UsuarioAdmin) => {
        setEditUserTarget(u);
        setEditFormData({
            carnet: u.Carnet || "",
            correoLogin: u.CorreoLogin || "",
            nombres: u.Nombres,
            ape1: u.PrimerApellido || "",
            cargo: u.Cargo || "",
            gerencia: u.Gerencia || "",
            subgerencia: u.Subgerencia || "",
            area: u.Area || "",
            departamento: u.departamento || "",
            jefe: u.Jefe || "",
            sexo: u.Sexo || "M",
            esInterno: u.EsInterno !== false,
        });
        setActiveModal("editUser");
    };

    const filteredUsuarios = usuarios.filter(
        (u) =>
            (u.Nombres || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.PrimerApellido || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.Carnet || "").includes(searchTerm) ||
            (u.CorreoLogin || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.Usuario || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.Cargo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.Gerencia || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.Area || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeCount = usuarios.filter((u) => u.Activo).length;
    const inactiveCount = usuarios.length - activeCount;

    // Evitar el bloqueo visual de "Conectando..." en la raíz

    return (
        <PortalShell
            eyebrow="Consola Central"
            title="Gestión de Accesos"
            description="Administra usuarios, contraseñas y permisos de acceso a los sistemas Claro."
            user={{ nombre: me?.nombre || "Cargando...", rol: me?.usuario || "", carnet: me?.carnet || "" }}
        >
            {/* Toast */}
            {toast && (
                <div style={{ ...toastStyle, background: toast.type === "ok" ? "#059669" : "#DC2626" }}>
                    <i className={`fa-solid ${toast.type === "ok" ? "fa-check-circle" : "fa-exclamation-triangle"}`}></i>
                    {toast.msg}
                </div>
            )}

            {/* Stats Strip */}
            <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                <div style={statBoxStyle}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: "#0f172a" }}>{usuarios.length}</span>
                    <span style={statLabelStyle}>TOTAL USUARIOS</span>
                </div>
                <div style={statBoxStyle}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: "#059669" }}>{activeCount}</span>
                    <span style={statLabelStyle}>ACTIVOS</span>
                </div>
                <div style={statBoxStyle}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: "#DC2626" }}>{inactiveCount}</span>
                    <span style={statLabelStyle}>INACTIVOS</span>
                </div>
                <div style={statBoxStyle}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: "#6366f1" }}>{apps.length}</span>
                    <span style={statLabelStyle}>SISTEMAS</span>
                </div>
            </div>

            <div style={panelStyle}>
                <header style={headerStyle}>
                    <div style={searchContainerStyle}>
                        <i className="fa-solid fa-magnifying-glass" style={searchIconStyle}></i>
                        <input type="text" placeholder="Buscar por nombre, carnet, correo..." style={searchInputStyle} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                        <button style={btnActionStyle("#0f172a")} onClick={() => setActiveModal("apps")}>
                            <i className="fa-solid fa-rocket"></i> APPS
                        </button>
                        <button style={btnActionStyle("#64748b")} onClick={() => { setActiveModal("delegations"); loadDelegations(); }}>
                            <i className="fa-solid fa-users-viewfinder"></i> DELEGACIONES
                        </button>
                        <button style={btnActionStyle("#6366f1")} onClick={() => { setEditUserTarget(null); setEditFormData(emptyFormData); setActiveModal("editUser"); }}>
                            <i className="fa-solid fa-user-plus"></i> NUEVO USUARIO
                        </button>
                        <button style={btnActionStyle("#059669")} onClick={() => setActiveModal("importUsers")}>
                            <i className="fa-solid fa-file-import"></i> IMPORTAR
                        </button>
                        <button 
                            style={btnActionStyle("#4338ca")} 
                            onClick={async () => {
                                if (usuarios.length === 0) return;
                                setToast({ msg: "Iniciando Sincronización Global de Red...", type: "ok" });
                                try {
                                    const userIds = usuarios.map(u => u.IdCuentaPortal);
                                    await fetch(apiUrl(`/admin/sync-network`), {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userIds, appIds: [1, 2] })
                                    });
                                    setToast({ msg: "¡Sincronización en Red Finalizada con Éxito!", type: "ok" });
                                    setTimeout(() => setToast(null), 5000);
                                } catch (e) {
                                    setToast({ msg: "Error en sincronización masiva de red", type: "err" });
                                }
                            }}
                            title="Sincroniza todos los usuarios actuales con Planer y Clima"
                        >
                            <i className="fa-solid fa-network-wired"></i> SINCRONIZAR RED
                        </button>
                    </div>
                </header>

                {/* Filtro de Columnas de Aplicaciones */}
                <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "#f1f5f9", borderRadius: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: "#94a3b8", textTransform: "uppercase" }}>Ver Columnas:</span>
                    {apps.map(app => (
                        <label key={app.IdAplicacion} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "4px 10px", borderRadius: 6, background: visibleAppIds.includes(app.IdAplicacion) ? "#DA291C1A" : "transparent", border: `1px solid ${visibleAppIds.includes(app.IdAplicacion) ? "#DA291C44" : "transparent"}` }}>
                            <input 
                                type="checkbox" 
                                checked={visibleAppIds.includes(app.IdAplicacion)}
                                onChange={e => {
                                    if (e.target.checked) setVisibleAppIds([...visibleAppIds, app.IdAplicacion]);
                                    else setVisibleAppIds(visibleAppIds.filter(id => id !== app.IdAplicacion));
                                }}
                                style={{ accentColor: "#DA291C", cursor: "pointer" }}
                            />
                            <span style={{ fontSize: 11, fontWeight: 700, color: visibleAppIds.includes(app.IdAplicacion) ? "#DA291C" : "#64748b" }}>{app.Nombre}</span>
                        </label>
                    ))}
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={tableStyle}>
                        <thead>
                            <tr style={tableHeaderRowStyle}>
                                <th style={thStyle}>ESTADO</th>
                                <th style={thStyle}>EMPLEADO / CARNET</th>
                                <th style={thStyle}>CORREO / CARGO</th>
                                <th style={thStyle}>GERENCIA / ÁREA</th>
                                <th style={thStyle}>JEFE / TEL.</th>
                                {apps.filter(app => visibleAppIds.includes(app.IdAplicacion)).map((app) => {
                                    const allHaveApp = filteredUsuarios.length > 0 && filteredUsuarios.every(u => u.AppsIds?.includes(app.IdAplicacion));
                                    const someHaveApp = filteredUsuarios.some(u => u.AppsIds?.includes(app.IdAplicacion));
                                    
                                    return (
                                        <th key={app.IdAplicacion} style={{ ...thStyle, textAlign: "center", minWidth: 90 }}>
                                            <i className={`fa-solid fa-${app.Icono?.toLowerCase() || "cube"}`} style={{ fontSize: 14, display: "block", marginBottom: 4 }}></i>
                                            {app.Nombre}
                                            <div style={{ marginTop: 6 }}>
                                                <input 
                                                    type="checkbox" 
                                                    title={`Marcar/Desmarcar a todos (${filteredUsuarios.length})`}
                                                    style={{ cursor: "pointer", accentColor: "#0f172a" }}
                                                    checked={allHaveApp}
                                                    ref={el => { if (el) el.indeterminate = !allHaveApp && someHaveApp; }}
                                                    onChange={(e) => toggleAppForFilteredUsers(app.IdAplicacion, e.target.checked, app.Nombre)}
                                                />
                                            </div>
                                        </th>
                                    );
                                })}
                                <th style={{ ...thStyle, textAlign: "center" }}>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsuarios.map((u) => (
                                <tr key={u.IdCuentaPortal} style={{ ...trStyle, opacity: u.Activo ? 1 : 0.5 }}>
                                    <td style={{ ...tdStyle, width: 60 }}>
                                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                            <button 
                                                onClick={() => openEditUser(u)} 
                                                style={{ background: "#f1f5f9", border: "none", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", color: "#64748b" }}
                                                title="Editar Perfil"
                                            >
                                                <i className="fa-solid fa-user-pen" style={{ fontSize: 11 }}></i>
                                            </button>
                                            <button onClick={() => toggleUserActive(u)} style={{ ...statusBadgeStyle, background: u.Activo ? "#ecfdf5" : "#fef2f2", color: u.Activo ? "#059669" : "#DC2626", border: `1px solid ${u.Activo ? "#a7f3d0" : "#fecaca"}`, width: 28, height: 28, padding: 0, justifyContent: "center" }} title={u.Activo ? "Desactivar" : "Activar"}>
                                                <i className={`fa-solid ${u.Activo ? "fa-circle-check" : "fa-circle-xmark"}`} style={{ fontSize: 14 }}></i>
                                            </button>
                                        </div>
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <strong style={{ color: "#0f172a" }}>{u.Nombres} {u.PrimerApellido}</strong>
                                            {u.EsInterno === false && <span style={{ fontSize: 8, background: "#fef3c7", color: "#92400e", padding: "1px 4px", borderRadius: 4, fontWeight: 900 }}>EXTERNO</span>}
                                        </div>
                                        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                                            {u.Carnet} {u.Telefono && ` / ${u.Telefono}`}
                                            {u.Carnet && (
                                                <i className={`fa-solid fa-${u.Sexo === 'M' ? 'mars' : 'venus'}`} style={{ color: u.Sexo === 'M' ? '#3b82f6' : '#ec4899', fontSize: 10 }}></i>
                                            )}
                                        </div>
                                    </td>
                                    <td style={tdStyle}>
                                        <code style={codeStyle}>{u.CorreoLogin}</code>
                                        <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", marginTop: 4, textTransform: "uppercase" }}>{u.Cargo || "---"}</div>
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{u.Gerencia || "---"}</div>
                                        <div style={{ fontSize: 10, color: "#94a3b8" }}>{u.Subgerencia || "---"}</div>
                                        <div style={{ fontSize: 10, color: "#475569" }}>{u.Area || u.departamento || "---"}</div>
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ fontSize: 11, color: "#475569" }}>
                                            <i className="fa-solid fa-user-tie" style={{ marginRight: 6, opacity: 0.5 }}></i>
                                            {u.Jefe || "---"}
                                        </div>
                                    </td>
                                    {apps.filter(app => visibleAppIds.includes(app.IdAplicacion)).map((app) => (
                                        <td key={app.IdAplicacion} style={{ ...tdStyle, textAlign: "center" }}>
                                            <input type="checkbox" style={checkboxStyle} checked={u.AppsIds?.includes(app.IdAplicacion) || false} onChange={(e) => togglePermission(u.IdCuentaPortal, app.IdAplicacion, e.target.checked)} />
                                        </td>
                                    ))}
                                    <td style={{ ...tdStyle, textAlign: "center" }}>
                                        <button style={btnSmallStyle} title="Resetear contraseña" onClick={() => { setResetTarget(u); setResetClave("123456"); setActiveModal("resetPassword"); }}>
                                            <i className="fa-solid fa-key"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── MODALES ── */}

            {/* User Form Modal (Create or Edit) */}
            {activeModal === "editUser" && (
                <Modal title={editUserTarget ? "Gestión de Perfil" : "Nuevo Usuario"} onClose={() => setActiveModal("none")}>
                    <div style={{ background: "#f8fafc", padding: "16px 20px", borderRadius: 16, marginBottom: 24, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: editFormData.esInterno ? "#DA291C" : "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20 }}>
                                <i className={`fa-solid fa-${editFormData.esInterno ? "building-user" : "user-shield"}`}></i>
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#0f172a" }}>{editFormData.nombres || (editUserTarget ? "Cargando..." : "Nuevo Registro")}</h3>
                                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>{editFormData.esInterno ? "COLABORADOR CLARO" : "TERCERO / EXTERNO"}</div>
                            </div>
                        </div>
                        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: "#fff", padding: "8px 14px", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                            <input 
                                type="checkbox" 
                                checked={editFormData.esInterno} 
                                onChange={e => setEditFormData({...editFormData, esInterno: e.target.checked})}
                                style={{ width: 18, height: 18, accentColor: "#DA291C", cursor: "pointer" }}
                            />
                            <span style={{ fontSize: 11, fontWeight: 900, color: "#1e293b" }}>¿ES INTERNO?</span>
                        </label>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                        {/* SECCIÓN 1: DATOS PERSONALES */}
                        <section>
                            <h4 style={sectionTitleStyle}>1. Información Personal</h4>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <label style={labelStyle}>Nombres</label>
                                    <input type="text" style={inputModalStyle} value={editFormData.nombres} onChange={e => setEditFormData({ ...editFormData, nombres: e.target.value })} placeholder="Ej: Juan Antonio" />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <label style={labelStyle}>Apellidos</label>
                                    <input type="text" style={inputModalStyle} value={editFormData.ape1} onChange={e => setEditFormData({ ...editFormData, ape1: e.target.value })} placeholder="Ej: Perez Lopez" />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <label style={labelStyle}>Sexo</label>
                                    <select style={inputModalStyle} value={editFormData.sexo} onChange={e => setEditFormData({ ...editFormData, sexo: e.target.value })}>
                                        <option value="M">Masculino</option>
                                        <option value="F">Femenino</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* SECCIÓN 2: IDENTIDAD Y CUENTA */}
                        <section>
                            <h4 style={sectionTitleStyle}>2. Identidad y Acceso</h4>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <label style={labelStyle}>Identificador / Carnet</label>
                                    <input type="text" style={inputModalStyle} value={editFormData.carnet} onChange={e => setEditFormData({ ...editFormData, carnet: e.target.value })} placeholder="Ej: 801122" disabled={!!editUserTarget} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <label style={labelStyle}>Correo Corporativo</label>
                                    <input type="email" style={inputModalStyle} value={editFormData.correoLogin} onChange={e => setEditFormData({ ...editFormData, correoLogin: e.target.value })} placeholder="usuario@claro.com.ni" disabled={!!editUserTarget} />
                                </div>
                            </div>
                        </section>

                        {/* SECCIÓN 3: PUESTO Y ESTRUCTURA */}
                        <section>
                            <h4 style={sectionTitleStyle}>3. Estructura Organizativa</h4>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                                <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: 8 }}>
                                    <label style={labelStyle}>Cargo Institucional</label>
                                    <input type="text" style={inputModalStyle} value={editFormData.cargo} onChange={e => setEditFormData({ ...editFormData, cargo: e.target.value })} placeholder="Nombre del puesto oficial" />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <label style={labelStyle}>Gerencia Responsable</label>
                                    <input type="text" style={inputModalStyle} value={editFormData.gerencia} onChange={e => setEditFormData({ ...editFormData, gerencia: e.target.value })} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <label style={labelStyle}>Subgerencia</label>
                                    <input type="text" style={inputModalStyle} value={editFormData.subgerencia} onChange={e => setEditFormData({ ...editFormData, subgerencia: e.target.value })} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <label style={labelStyle}>Area (HCM)</label>
                                    <input type="text" style={inputModalStyle} value={editFormData.area} onChange={e => setEditFormData({ ...editFormData, area: e.target.value })} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <label style={labelStyle}>Departamento</label>
                                    <input type="text" style={inputModalStyle} value={editFormData.departamento} onChange={e => setEditFormData({ ...editFormData, departamento: e.target.value })} />
                                </div>
                            </div>
                        </section>

                        {/* SECCIÓN 4: REPORTE */}
                        <section>
                            <h4 style={sectionTitleStyle}>4. Jefatura / Reporte Directo</h4>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <select style={inputModalStyle} value={editFormData.jefe} onChange={e => setEditFormData({ ...editFormData, jefe: e.target.value })}>
                                    <option value="">-- Sin Definir --</option>
                                    {usuarios.filter(u => u.Activo).map(u => (
                                        <option key={u.Carnet} value={`${u.Nombres} ${u.PrimerApellido}`}>{u.Nombres} {u.PrimerApellido} ({u.Carnet})</option>
                                    ))}
                                </select>
                            </div>
                        </section>
                    </div>

                    <div style={{ ...modalFooterStyle, marginTop: 32 }}>
                        <button style={btnGhostStyle} onClick={() => setActiveModal("none")}>CANCELAR</button>
                        <button style={btnActionStyle("#DA291C")} onClick={handleSaveUser}>
                            <i className="fa-solid fa-floppy-disk" style={{ marginRight: 8 }}></i>
                            {editUserTarget ? "ACTUALIZAR DATOS" : "REGISTRAR USUARIO"}
                        </button>
                    </div>
                </Modal>
            )}

            {activeModal === "importUsers" && (
                <Modal title="Sincronizar Plantilla de Empleados" onClose={() => { setActiveModal("none"); setImportUsersList([]); setImportResult(null); }}>
                    <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
                        Sube el archivo <strong>CSV</strong> con la lista de empleados. El Portal Central creará las cuentas y actualizará automáticamente la estructura en Clima y Planer.
                    </p>
                    
                    <div style={{ background: "#f1f5f9", padding: 20, borderRadius: 16, border: "2px dashed #cbd5e1", textAlign: "center", marginBottom: 20 }}>
                        <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 32, color: "#6366f1", marginBottom: 12, display: "block" }}></i>
                        <input ref={fileRef} type="file" accept=".csv" onChange={handleExcelUpload} style={{ display: "none" }} />
                        <button style={btnActionStyle("#6366f1")} onClick={() => fileRef.current?.click()} disabled={loading}>
                            {importUsersList.length > 0 ? "CAMBIAR ARCHIVO" : "SELECCIONAR CSV"}
                        </button>
                    </div>

                            {importBatchStatus.active && (
                                <div style={{ marginBottom: '24px', background: '#eef2ff', borderRadius: '16px', padding: '24px', border: '1px solid #e0e7ff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
                                        <span style={{ fontWeight: 800, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sincronizando Usuarios...</span>
                                        <span style={{ fontWeight: 900, color: '#1e1b4b', background: '#fff', padding: '2px 10px', borderRadius: '8px' }}>{importBatchStatus.current} / {importBatchStatus.total}</span>
                                    </div>
                                    <div style={{ width: '100%', height: '12px', background: '#e0e7ff', borderRadius: '6px', overflow: 'hidden', border: '1px solid #c7d2fe' }}>
                                        <div style={{ width: `${(importBatchStatus.current / importBatchStatus.total) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #4f46e5, #818cf8)', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                                    </div>
                                    <p style={{ marginTop: '12px', fontSize: '11px', color: '#6366f1', textAlign: 'center', fontWeight: 600 }}>Procesando lotes de 500 registros. Por favor, no cierres esta ventana.</p>
                                </div>
                            )}

                            {importResult && (
                                <div style={{ textAlign: 'center', padding: '30px', background: '#f0fdf4', borderRadius: '20px', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
                                    <div style={{ width: 60, height: 60, borderRadius: 30, background: '#22c55e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px' }}>
                                        <i className="fa-solid fa-check"></i>
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: 18, color: '#166534', fontWeight: 900 }}>¡Sincronización Completada!</h3>
                                    <p style={{ margin: '8px 0 0', color: '#15803d', fontSize: '14px' }}>Se han procesado correctamente <strong>{importResult.procesados}</strong> empleados en el Sistema Central.</p>
                                </div>
                            )}

                            {importUsersList.length > 0 && !importBatchStatus.active && !importResult && (
                                <div style={{ maxHeight: 300, overflow: "auto", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 20 }}>
                                    <table style={{ ...tableStyle, fontSize: 12 }}>
                                        <thead style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                                            <tr>
                                                <th style={thStyle}>Carnet</th>
                                                <th style={thStyle}>Nombre</th>
                                                <th style={thStyle}>Correo</th>
                                                <th style={thStyle}>Gerencia</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importUsersList.slice(0, 50).map((u, i) => (
                                                <tr key={i} style={trStyle}>
                                                    <td style={tdStyle}><strong>{u.carnet}</strong></td>
                                                    <td style={tdStyle}>{u.nombre}</td>
                                                    <td style={tdStyle}>{u.correo}</td>
                                                    <td style={tdStyle}>{u.gerencia}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        <div style={modalFooterStyle}>
                            <button style={btnGhostStyle} onClick={() => { setActiveModal("none"); setImportUsersList([]); setImportResult(null); }}>CERRAR</button>
                            {importUsersList.length > 0 && !importBatchStatus.active && !importResult && (
                                <button style={btnActionStyle("#059669")} onClick={handleImport}>
                                     SINCRONIZAR {importUsersList.length} EMPLEADOS
                                </button>
                            )}
                        </div>
                    </Modal>
                )}

            {activeModal === "resetPassword" && resetTarget && (
                <Modal title="Seguridad de Cuenta" onClose={() => setActiveModal("none")}>
                    <div style={{ background: "#fff9f2", padding: "16px 20px", borderRadius: 16, marginBottom: 24, border: "1px solid #ffedd5", display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20 }}>
                            <i className="fa-solid fa-key-skeleton"></i>
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#9a3412" }}>Restablecer Contraseña</h3>
                            <div style={{ fontSize: 12, color: "#c2410c", fontWeight: 700 }}>{resetTarget.Nombres} {resetTarget.PrimerApellido}</div>
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
                            Al restablecer la contraseña, el usuario deberá utilizar la nueva clave para acceder a todos los sistemas del portal.
                        </p>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <label style={labelStyle}>Nueva Contraseña Temporal</label>
                            <div style={{ position: "relative" }}>
                                <i className="fa-solid fa-lock" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 13 }}></i>
                                <input 
                                    type="text" 
                                    style={{ ...inputModalStyle, paddingLeft: 40, letterSpacing: 1, fontWeight: 700, background: "#fff" }} 
                                    value={resetClave} 
                                    onChange={e => setResetClave(e.target.value)} 
                                />
                            </div>
                            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>Sugerencia: "123456" o una clave genérica fácil de comunicar.</span>
                        </div>
                    </div>

                    <div style={{ ...modalFooterStyle, marginTop: 32 }}>
                        <button style={btnGhostStyle} onClick={() => setActiveModal("none")}>CANCELAR</button>
                        <button style={btnActionStyle("#f97316")} onClick={handleResetPassword}>
                            <i className="fa-solid fa-shield-halved" style={{ marginRight: 8 }}></i>
                            CONFIRMAR NUEVA CLAVE
                        </button>
                    </div>
                </Modal>
            )}


            {activeModal === "delegations" && (
                <Modal title="Delegaciones y Poderes de Firma" onClose={() => setActiveModal("none")}>
                    <div style={{ marginBottom: 24, padding: 20, background: "#f8fafc", borderRadius: 16, border: "1px solid #e2e8f0" }}>
                        <h3 style={{ margin: "0 0 16px 0", fontSize: 13, fontWeight: 900 }}>NUEVA DELEGACIÓN (INTERINATO)</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div>
                                <label style={labelStyle}>Jefe a Reemplazar</label>
                                <select style={inputModalStyle} value={newDel.carnetOrigin} onChange={e => setNewDel({...newDel, carnetOrigin: e.target.value})}>
                                    <option value="">Seleccionar Jefe...</option>
                                    {usuarios.filter(u => u.Activo).map(u => (
                                        <option key={u.Carnet} value={u.Carnet}>{u.Nombres} {u.PrimerApellido}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Sustituto / Interino</label>
                                <select style={inputModalStyle} value={newDel.carnetSub} onChange={e => setNewDel({...newDel, carnetSub: e.target.value})}>
                                    <option value="">Seleccionar Sustituto...</option>
                                    {usuarios.filter(u => u.Activo).map(u => (
                                        <option key={u.Carnet} value={u.Carnet}>{u.Nombres} {u.PrimerApellido}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ gridColumn: "span 2" }}>
                                <label style={labelStyle}>Motivo / Contexto</label>
                                <input style={inputModalStyle} placeholder="Ej: Interinato por vacante Gerencia RRHH" value={newDel.motivo} onChange={e => setNewDel({...newDel, motivo: e.target.value})} />
                            </div>
                            <button style={{ ...btnActionStyle("#0f172a"), gridColumn: "span 2", justifyContent: "center", marginTop: 8 }} onClick={handleCreateDelegation}>
                                REGISTRAR DELEGACIÓN
                            </button>
                        </div>
                    </div>

                    <div style={{ display: "grid", gap: 12 }}>
                        {delegations.map(d => (
                            <div key={d.Id} style={{ padding: 16, borderRadius: 12, border: "1px solid #e2e8f0", background: d.Activo ? "#f0fdf4" : "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 800 }}>{d.NombreSustituto} <span style={{ color: "#64748b", fontWeight: 400 }}>sustituye a</span> {d.NombreOriginal}</div>
                                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Motivo: {d.Motivo}</div>
                                </div>
                                <button 
                                    onClick={() => toggleDelegationActive(d.Id, !d.Activo)}
                                    style={{ ...btnActionStyle(d.Activo ? "#dc2626" : "#059669"), padding: "6px 12px", fontSize: 10 }}
                                >
                                    {d.Activo ? "REVERTIR" : "ACTIVAR"}
                                </button>
                            </div>
                        ))}
                        {delegations.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, padding: 20 }}>No hay delegaciones registradas.</div>}
                    </div>
                </Modal>
            )}

            {activeModal === "apps" && (
                <Modal title={editingAppId ? "Editar Aplicación" : "Gestionar Aplicaciones"} onClose={() => { setActiveModal("none"); setEditingAppId(null); }}>
                    <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
                        {apps.map((a) => (
                            <div key={a.IdAplicacion} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f8fafc", borderRadius: 12 }}>
                                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                    <i className={`fa-solid fa-${a.Icono?.toLowerCase() || "cube"}`} style={{ color: "#DA291C" }}></i>
                                    <strong style={{ fontSize: 14 }}>{a.Nombre}</strong>
                                    <code style={{ fontSize: 11, color: "#94a3b8" }}>{a.Codigo}</code>
                                </div>
                                <div style={{ display: "flex", gap: 6 }}>
                                    <button style={btnSmallStyle} onClick={() => { setEditingAppId(a.IdAplicacion); setNewApp({ codigo: a.Codigo, nombre: a.Nombre, ruta: a.Ruta || "", icono: a.Icono, descripcion: "" }); }}>
                                        <i className="fa-solid fa-pen"></i>
                                    </button>
                                    <button style={{ ...btnSmallStyle, color: "#DC2626" }} onClick={() => handleDeleteApp(a.IdAplicacion, a.Nombre)}>
                                        <i className="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <h3 style={{ fontSize: 14, fontWeight: 900, color: "#0f172a", marginBottom: 12 }}>{editingAppId ? "Editar" : "Nueva"} Aplicación</h3>
                    <div style={formGridStyle}>
                        <Field label="Código" value={newApp.codigo} onChange={(v) => setNewApp({ ...newApp, codigo: v })} placeholder="vacantes" />
                        <Field label="Nombre" value={newApp.nombre} onChange={(v) => setNewApp({ ...newApp, nombre: v })} placeholder="Bolsa de Empleo" />
                        <Field label="URL" value={newApp.ruta} onChange={(v) => setNewApp({ ...newApp, ruta: v })} placeholder="https://www.rhclaroni.com/portal/planer/" />
                        <Field label="Icono (FA)" value={newApp.icono} onChange={(v) => setNewApp({ ...newApp, icono: v })} placeholder="briefcase" />
                    </div>
                    <div style={modalFooterStyle}>
                        <button style={btnGhostStyle} onClick={() => { setActiveModal("none"); setEditingAppId(null); }}>CERRAR</button>
                        <button style={btnActionStyle("#DA291C")} onClick={handleSaveApp}>{editingAppId ? "ACTUALIZAR" : "CREAR APP"}</button>
                    </div>
                </Modal>
            )}
        </PortalShell>
    );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div style={modalOverlayStyle} onClick={onClose}>
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{title}</h2>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#94a3b8" }}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <div style={{ display: "grid", gap: 6 }}>
            <label style={labelStyle}>{label}</label>
            <input style={inputModalStyle} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        </div>
    );
}

/* ────────── STYLES ────────── */

const toastStyle: CSSProperties = {
    position: "fixed", top: 24, right: 24, zIndex: 2000, color: "#fff",
    padding: "14px 24px", borderRadius: 14, fontWeight: 700, fontSize: 13,
    display: "flex", gap: 10, alignItems: "center",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)", animation: "slideIn 0.3s ease-out",
};

const statBoxStyle: CSSProperties = {
    ...panelStyle, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px", gap: 4,
};
const statLabelStyle: CSSProperties = { fontSize: 10, fontWeight: 900, color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase" };

const headerStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, gap: 40, flexWrap: "wrap" };
const searchContainerStyle: CSSProperties = { position: "relative", flex: 1, minWidth: 240, maxWidth: 400 };
const searchIconStyle: CSSProperties = { position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" };
const searchInputStyle: CSSProperties = { padding: "12px 16px 12px 48px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", outline: "none", fontSize: 14 };

const btnActionStyle = (bg: string): CSSProperties => ({
    background: bg, color: "#fff", border: "none", padding: "10px 20px", borderRadius: 12,
    fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
    textTransform: "uppercase", letterSpacing: 0.5,
});
const btnGhostStyle: CSSProperties = { background: "transparent", color: "#64748b", border: "1px solid #e2e8f0", padding: "10px 20px", borderRadius: 12, fontWeight: 800, fontSize: 12, cursor: "pointer" };
const btnSmallStyle: CSSProperties = { background: "#f1f5f9", color: "#475569", border: "none", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };
const statusBadgeStyle: CSSProperties = { cursor: "pointer", fontSize: 11, fontWeight: 800, padding: "6px 12px", borderRadius: 20, display: "flex", gap: 6, alignItems: "center" };
const checkboxStyle: CSSProperties = { width: 18, height: 18, cursor: "pointer", accentColor: "#DA291C" };

const tableStyle: CSSProperties = { width: "100%", borderCollapse: "collapse" };
const tableHeaderRowStyle: CSSProperties = { borderBottom: "2px solid #f1f5f9" };
const thStyle: CSSProperties = { textAlign: "left", padding: "14px 8px", fontSize: 10, fontWeight: 900, color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase" };
const trStyle: CSSProperties = { borderBottom: "1px solid #f8fafc", transition: "opacity 0.3s" };
const tdStyle: CSSProperties = { padding: "14px 8px", fontSize: 13, color: "#1e293b" };
const codeStyle: CSSProperties = { background: "#f1f5f9", padding: "3px 8px", borderRadius: 6, color: "#475569", fontWeight: 600, fontSize: 11 };

const modalOverlayStyle: CSSProperties = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 };
const modalContentStyle: CSSProperties = { background: "#fff", width: "100%", maxWidth: 800, borderRadius: 24, padding: 40, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", maxHeight: "90vh", overflow: "auto" };
const modalFooterStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 28 };
const labelStyle: CSSProperties = { display: "block", marginBottom: 6, fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 };
const inputModalStyle: CSSProperties = { padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", outline: "none", fontSize: 14 };
const sectionTitleStyle: CSSProperties = { fontSize: 12, fontWeight: 900, color: "#1e293b", paddingBottom: 8, borderBottom: "1px solid #f1f5f9", marginBottom: 15, marginTop: 5, textTransform: "uppercase" };
const formGridStyle: CSSProperties = { display: "grid", gap: 18 };
