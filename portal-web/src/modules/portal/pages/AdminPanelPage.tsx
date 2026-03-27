import { useEffect, useState, type CSSProperties } from 'react';

type StatusNotice = {
    tone: 'success' | 'error';
    message: string;
};

interface User {
    IdCuentaPortal: number;
    Usuario: string;
    CorreoLogin: string;
    Nombres: string;
    PrimerApellido: string;
    Carnet: string;
    Activo: boolean;
}

interface App {
    IdAplicacion: number;
    Codigo: string;
    Nombre: string;
    Icono: string;
}

export default function AdminPanel() {
    const [users, setUsers] = useState<User[]>([]);
    const [apps, setApps] = useState<App[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusNotice, setStatusNotice] = useState<StatusNotice | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [uRes, aRes] = await Promise.all([
                    fetch('/api/admin/users'),
                    fetch('/api/admin/apps')
                ]);
                const uData = await uRes.json();
                const aData = await aRes.json();
                setUsers(uData.items || []);
                setApps(aData.items || []);
            } catch (err) {
                console.error('Error cargando admin data:', err);
                setStatusNotice({ tone: 'error', message: 'No se pudieron cargar los datos del panel de administración.' });
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const togglePermission = async (userId: number, appId: number, active: boolean) => {
        setStatusNotice(null);

        try {
            const response = await fetch('/api/admin/permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idCuentaPortal: userId, idAplicacion: appId, activo: active })
            });

            if (!response.ok) {
                throw new Error('Permission update failed');
            }

            setStatusNotice({ tone: 'success', message: 'Permiso actualizado correctamente.' });
        } catch (err) {
            console.error('Error actualizando permiso:', err);
            setStatusNotice({ tone: 'error', message: 'No se pudo actualizar el permiso. Intenta nuevamente.' });
        }
    };

    if (loading) return <div className="p-10">Cargando Panel de Control de Claro...</div>;

    return (
        <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
            <h1 style={{ color: '#DA291C' }}>🛡️ Panel de Administración - Portal Central</h1>
            <p>Desde aquí puedes gestionar quién entra a qué sistema.</p>

            {statusNotice && (
                <div style={getStatusNoticeStyle(statusNotice.tone)}>
                    <strong>{statusNotice.tone === 'success' ? 'Actualización completada.' : 'Acción no aplicada.'}</strong>
                    <span>{statusNotice.message}</span>
                </div>
            )}

            <div style={{ marginTop: 40 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                            <th style={{ padding: 12 }}>Empleado</th>
                            <th style={{ padding: 12 }}>Usuario/Carnet</th>
                            {apps.map(app => (
                                <th key={app.IdAplicacion} style={{ padding: 12, textAlign: 'center' }}>
                                    <i className={`fa-solid fa-${app.Icono.toLowerCase()}`}></i><br/>
                                    {app.Nombre}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.IdCuentaPortal} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: 12 }}>
                                    <strong>{user.Nombres} {user.PrimerApellido}</strong><br/>
                                    <span style={{ fontSize: 12, color: '#64748b' }}>{user.CorreoLogin}</span>
                                </td>
                                <td style={{ padding: 12 }}>{user.Usuario}</td>
                                {apps.map(app => (
                                    <td key={app.IdAplicacion} style={{ padding: 12, textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            onChange={(e) => togglePermission(user.IdCuentaPortal, app.IdAplicacion, e.target.checked)}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function getStatusNoticeStyle(tone: StatusNotice['tone']): CSSProperties {
    const palette = tone === 'success'
        ? { background: '#ecfdf3', border: '#86efac', color: '#166534' }
        : { background: '#fff1f2', border: '#fda4af', color: '#be123c' };

    return {
        marginTop: 20,
        padding: '14px 18px',
        borderRadius: 14,
        border: `1px solid ${palette.border}`,
        background: palette.background,
        color: palette.color,
        display: 'grid',
        gap: 4,
        maxWidth: 720,
    };
}
