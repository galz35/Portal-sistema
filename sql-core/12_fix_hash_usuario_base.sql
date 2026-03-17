UPDATE dbo.CuentaPortal
SET ClaveHash = '$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHQ$HWkR9Cz0HK3vQHomgoFSPMaPFuvj5Q1q32TjoXLJQY0',
    FechaModificacion = SYSDATETIME()
WHERE Usuario = 'empleado.portal';
