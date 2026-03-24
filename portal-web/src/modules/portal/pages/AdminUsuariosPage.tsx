import { useEffect, useState, useRef, type CSSProperties } from "react";
import PortalShell, { panelStyle } from "../components/PortalShell";
import Papa from "papaparse";

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
};

type App = {
    IdAplicacion: number;
    Codigo: string;
    Nombre: string;
    Icono: string;
};

type ModalType = "none" | "apps" | "createUser" | "importUsers" | "resetPassword";

export default function AdminUsuariosPage() {
    const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
    const [apps, setApps] = useState<App[]>([]);
    const [me, setMe] = useState<{ nombre: string; usuario: string; carnet: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeModal, setActiveModal] = useState<ModalType>("none");
    const [editingAppId, setEditingAppId] = useState<number | null>(null);
    const [newApp, setNewApp] = useState({ codigo: "", nombre: "", ruta: "", icono: "rocket", descripcion: "" });

    // Create User
    const [newUser, setNewUser] = useState({ nombres: "", primerApellido: "", segundoApellido: "", correo: "", carnet: "" });

    // Import Users
    const [importText, setImportText] = useState("");
    const [importResult, setImportResult] = useState<any>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // Reset Password
    const [resetTarget, setResetTarget] = useState<UsuarioAdmin | null>(null);
    const [resetClave, setResetClave] = useState("123456");

    // Toast
    const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

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
                fetch("/api/auth/me", { credentials: "include" }),
                fetch("/api/admin/users", { credentials: "include" }),
                fetch("/api/admin/apps", { credentials: "include" }),
            ]);
            setMe(await meRes.json());
            const uData = await uRes.json();
            setUsuarios(uData.items || []);
            const aData = await aRes.json();
            setApps(aData.items || []);
        } catch (err) {
            console.error("Error cargando datos:", err);
        } finally {
            setLoading(false);
        }
    };

    const togglePermission = async (userId: number, appId: number, active: boolean) => {
        try {
            const res = await fetch("/api/admin/permissions", {
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

                await fetch("/api/admin/permissions", {
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
            const res = await fetch("/api/admin/toggle-user", {
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
            const res = await fetch("/api/admin/create-user", {
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
        let parsed: any[];
        try {
            parsed = JSON.parse(importText);
            if (!Array.isArray(parsed)) throw new Error();
        } catch {
            return showToast("JSON inválido.", "err");
        }
        setLoading(true);
        try {
            const res = await fetch("/api/admin/sync-users-bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ usuarios: parsed }),
            });
            const data = await res.json();
            setImportResult(data);
            if (data.ok) {
                showToast(`Sincronización Masiva completada: ${data.procesados} cuentas modificadas/creadas`);
                loadData();
            }
        } catch {
            showToast("Error de red al sincronizar", "err");
        } finally {
            setLoading(false);
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
                setImportText(JSON.stringify(validUsers, null, 2));
                showToast(`${validUsers.length} usuarios leídos del CSV. Revisa el código JSON y presiona Sincronizar.`);
            },
            error: function (err: any) {
                showToast("Error leyendo CSV: " + err.message, "err");
            }
        });
    };

    const handleResetPassword = async () => {
        if (!resetTarget) return;
        try {
            const res = await fetch("/api/admin/reset-password", {
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
            const url = editingAppId ? `/api/admin/apps/${editingAppId}` : "/api/admin/apps";
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
            await fetch(`/api/admin/apps/${id}`, { method: "DELETE", credentials: "include" });
            loadData();
            showToast(`${nombre} desactivada`);
        } catch {
            showToast("Error al eliminar", "err");
        }
    };

    const filteredUsuarios = usuarios.filter(
        (u) =>
            (u.Nombres || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.PrimerApellido || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.Carnet || "").includes(searchTerm) ||
            (u.CorreoLogin || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.Usuario || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeCount = usuarios.filter((u) => u.Activo).length;
    const inactiveCount = usuarios.length - activeCount;

    if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b", fontWeight: 700 }}>Conectando con el servidor central...</div>;

    return (
        <PortalShell
            eyebrow="Consola Central"
            title="Gestión de Accesos"
            description="Administra usuarios, contraseñas y permisos de acceso a los sistemas Claro."
            user={{ nombre: me?.nombre || "Admin", rol: me?.usuario || "admin", carnet: me?.carnet }}
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
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button style={btnActionStyle("#0f172a")} onClick={() => setActiveModal("apps")}>
                            <i className="fa-solid fa-rocket"></i> APPS
                        </button>
                        <button style={btnActionStyle("#6366f1")} onClick={() => setActiveModal("createUser")}>
                            <i className="fa-solid fa-user-plus"></i> NUEVO
                        </button>
                        <button style={btnActionStyle("#059669")} onClick={() => setActiveModal("importUsers")}>
                            <i className="fa-solid fa-file-import"></i> IMPORTAR
                        </button>
                    </div>
                </header>

                <div style={{ overflowX: "auto" }}>
                    <table style={tableStyle}>
                        <thead>
                            <tr style={tableHeaderRowStyle}>
                                <th style={thStyle}>ESTADO</th>
                                <th style={thStyle}>EMPLEADO / CARNET</th>
                                <th style={thStyle}>CORREO</th>
                                {apps.map((app) => {
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
                                    <td style={tdStyle}>
                                        <button onClick={() => toggleUserActive(u)} style={{ ...statusBadgeStyle, background: u.Activo ? "#ecfdf5" : "#fef2f2", color: u.Activo ? "#059669" : "#DC2626", border: `1px solid ${u.Activo ? "#a7f3d0" : "#fecaca"}` }} title={u.Activo ? "Clic para desactivar" : "Clic para activar"}>
                                            <i className={`fa-solid ${u.Activo ? "fa-circle-check" : "fa-circle-xmark"}`}></i>
                                            {u.Activo ? "Activo" : "Baja"}
                                        </button>
                                    </td>
                                    <td style={tdStyle}>
                                        <strong style={{ color: "#0f172a" }}>{u.Nombres} {u.PrimerApellido}</strong>
                                        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{u.Carnet}</div>
                                    </td>
                                    <td style={tdStyle}>
                                        <code style={codeStyle}>{u.CorreoLogin}</code>
                                    </td>
                                    {apps.map((app) => (
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

            {activeModal === "createUser" && (
                <Modal title="Crear Nuevo Usuario" onClose={() => setActiveModal("none")}>
                    <div style={formGridStyle}>
                        <Field label="Nombres *" value={newUser.nombres} onChange={(v) => setNewUser({ ...newUser, nombres: v })} />
                        <Field label="Primer Apellido *" value={newUser.primerApellido} onChange={(v) => setNewUser({ ...newUser, primerApellido: v })} />
                        <Field label="Segundo Apellido" value={newUser.segundoApellido} onChange={(v) => setNewUser({ ...newUser, segundoApellido: v })} />
                        <Field label="Correo Corporativo *" value={newUser.correo} onChange={(v) => setNewUser({ ...newUser, correo: v })} placeholder="nombre@claro.com.ni" />
                        <Field label="Carnet / ID *" value={newUser.carnet} onChange={(v) => setNewUser({ ...newUser, carnet: v })} />
                    </div>
                    <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 16 }}>La contraseña por defecto es <strong>123456</strong>. El usuario podrá cambiarla al iniciar sesión.</p>
                    <div style={modalFooterStyle}>
                        <button style={btnGhostStyle} onClick={() => setActiveModal("none")}>CANCELAR</button>
                        <button style={btnActionStyle("#DA291C")} onClick={handleCreateUser}>CREAR USUARIO</button>
                    </div>
                </Modal>
            )}

            {activeModal === "importUsers" && (
                <Modal title="Sincronizar Panel Central y Satélites" onClose={() => setActiveModal("none")}>
                    <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
                        Sube la plantilla <strong>CSV</strong>. El origen central procesará el alta y emitirá webhooks asíncronos para actualizar el perfil en los submódulos.
                    </p>
                    <input ref={fileRef} type="file" accept=".csv" onChange={handleExcelUpload} style={{ marginBottom: 12, display: "block" }} />
                    <textarea style={{ ...inputModalStyle, height: 180, fontFamily: "monospace", fontSize: 12 }} placeholder={'[\n  {"carnet":"123","nombre":"Juan"}...\n]'} value={importText} onChange={(e) => setImportText(e.target.value)} />
                    {importResult && (
                        <div style={{ marginTop: 12, padding: 16, background: "#f8fafc", borderRadius: 12, fontSize: 13, maxHeight: 200, overflow: "auto" }}>
                            <strong style={{ display: "block", marginBottom: 8, color: "#0f172a" }}>Resultado: {importResult.procesados} procesados</strong>
                            {importResult.detalle?.map((d: any, i: number) => (
                                <div key={i} style={{ color: d.action === "ERROR" ? "#DC2626" : "#059669", marginBottom: 6, paddingBottom: 6, borderBottom: "1px solid #e2e8f0" }}>
                                    <div style={{ fontWeight: 600 }}>{d.carnet} ({d.action})</div>
                                    {d.syncDetails?.length > 0 && d.syncDetails.map((sd: any, idx: number) => (
                                        <div key={idx} style={{ marginLeft: 16, fontSize: 11, color: sd.ok ? "#64748b" : "#DC2626" }}>
                                            <i className={`fa-solid ${sd.ok ? "fa-circle-check" : "fa-circle-xmark"}`}></i> {sd.app}: {sd.ok ? "OK" : sd.error}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                    <div style={modalFooterStyle}>
                        <button style={btnGhostStyle} onClick={() => setActiveModal("none")}>CERRAR</button>
                        <button style={btnActionStyle("#059669")} onClick={handleImport}>
                            <i className="fa-solid fa-cloud-arrow-up"></i> SINCRONIZAR
                        </button>
                    </div>
                </Modal>
            )}

            {activeModal === "resetPassword" && resetTarget && (
                <Modal title="Resetear Contraseña" onClose={() => setActiveModal("none")}>
                    <p style={{ fontSize: 14, color: "#475569" }}>
                        Vas a restablecer la contraseña de <strong>{resetTarget.Nombres} {resetTarget.PrimerApellido}</strong> ({resetTarget.CorreoLogin}).
                    </p>
                    <Field label="Nueva contraseña" value={resetClave} onChange={setResetClave} />
                    <div style={modalFooterStyle}>
                        <button style={btnGhostStyle} onClick={() => setActiveModal("none")}>CANCELAR</button>
                        <button style={btnActionStyle("#DA291C")} onClick={handleResetPassword}>
                            <i className="fa-solid fa-key"></i> RESTABLECER
                        </button>
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
                                    <button style={btnSmallStyle} onClick={() => { setEditingAppId(a.IdAplicacion); setNewApp({ codigo: a.Codigo, nombre: a.Nombre, ruta: "", icono: a.Icono, descripcion: "" }); }}>
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
                        <Field label="URL" value={newApp.ruta} onChange={(v) => setNewApp({ ...newApp, ruta: v })} placeholder="http://localhost:5177" />
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

const headerStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 16, flexWrap: "wrap" };
const searchContainerStyle: CSSProperties = { position: "relative", flex: 1, minWidth: 240, maxWidth: 400 };
const searchIconStyle: CSSProperties = { position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" };
const searchInputStyle: CSSProperties = { width: "100%", padding: "12px 16px 12px 48px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", outline: "none", fontSize: 14 };

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
const modalContentStyle: CSSProperties = { background: "#fff", width: "100%", maxWidth: 580, borderRadius: 24, padding: 36, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", maxHeight: "90vh", overflow: "auto" };
const modalFooterStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 28 };
const labelStyle: CSSProperties = { fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 };
const inputModalStyle: CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", outline: "none", fontSize: 14 };
const formGridStyle: CSSProperties = { display: "grid", gap: 14 };
