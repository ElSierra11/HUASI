import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle size={20} />,
  error: <AlertCircle size={20} />,
  warning: <AlertTriangle size={20} />,
  info: <Info size={20} />,
};

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 320);
  }, []);

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_id;
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  // Convenience shortcuts
  toast.success = (msg, dur) => toast(msg, 'success', dur);
  toast.error   = (msg, dur) => toast(msg, 'error', dur);
  toast.warning = (msg, dur) => toast(msg, 'warning', dur);
  toast.info    = (msg, dur) => toast(msg, 'info', dur);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast ${t.type}${t.exiting ? ' exiting' : ''}`}>
              <span className="toast-icon">{ICONS[t.type]}</span>
              <span className="toast-text">{t.message}</span>
              <button className="toast-close" onClick={() => dismiss(t.id)}><X size={16} /></button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
