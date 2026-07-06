import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, Info, CheckCircle, X } from 'lucide-react';

const ICONS = {
  danger: <Trash2 size={26} />,
  warning: <AlertTriangle size={26} />,
  success: <CheckCircle size={26} />,
  info: <Info size={26} />,
};

/**
 * Modal component for confirmations and alerts.
 *
 * Props:
 *   open         – boolean, whether to show
 *   type         – 'danger' | 'warning' | 'success' | 'info'  (default: 'warning')
 *   title        – heading text
 *   message      – body text
 *   confirmText  – label for the confirm button (default: 'Confirmar')
 *   cancelText   – label for the cancel button (default: 'Cancelar')
 *   onConfirm    – called when confirm is clicked
 *   onCancel     – called when cancel / backdrop is clicked
 *   loading      – shows spinner on confirm button
 *   hideCancel   – hides the cancel button (for simple alerts)
 */
export default function Modal({
  open,
  type = 'warning',
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  loading = false,
  hideCancel = false,
  children,
}) {
  if (!open) return null;

  const btnClass =
    type === 'danger' ? 'btn btn-danger' :
    type === 'success' ? 'btn btn-success' :
    'btn btn-primary';

  return createPortal(
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className={`modal-icon ${type}`}>{ICONS[type]}</div>
        {title && <h2 className="modal-title">{title}</h2>}
        {message && <p className="modal-message">{message}</p>}
        {children}
        <div className="modal-actions">
          {!hideCancel && (
            <button className="btn" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} onClick={onCancel} disabled={loading}>
              {cancelText}
            </button>
          )}
          <button className={btnClass} onClick={onConfirm} disabled={loading}>
            {loading ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
