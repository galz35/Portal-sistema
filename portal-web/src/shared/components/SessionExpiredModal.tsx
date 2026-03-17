type SessionExpiredModalProps = {
  open: boolean;
  onConfirm: () => void;
};

export default function SessionExpiredModal({ open, onConfirm }: SessionExpiredModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div role="dialog" aria-modal="true">
      <h2>Sesion expirada</h2>
      <p>Tu sesion ya no es valida. Debes iniciar sesion nuevamente.</p>
      <button type="button" onClick={onConfirm}>
        Ir a login
      </button>
    </div>
  );
}
