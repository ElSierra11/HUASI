import { useEffect } from 'react';
import { X, AlertTriangle, Info, CheckCircle, ShieldAlert } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, footer, type = 'info' }) {
  // Manejar cierre con Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <ShieldAlert size={20} className="text-danger" style={{ color: 'var(--danger)' }} />;
      case 'warning':
        return <AlertTriangle size={20} className="text-warning" style={{ color: 'var(--warning)' }} />;
      case 'success':
        return <CheckCircle size={20} className="text-success" style={{ color: 'var(--success)' }} />;
      default:
        return <Info size={20} className="text-primary" style={{ color: 'var(--primary)' }} />;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div className="modal-title">
            {getIcon()}
            <span>{title}</span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar modal">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
