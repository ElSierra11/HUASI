import Swal from 'sweetalert2';

// Helper to check if dark mode is active
const isDarkMode = () => {
  return document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
};

// Base themed configuration
const getThemeConfig = () => {
  const dark = isDarkMode();
  return {
    background: dark ? '#0f172a' : '#ffffff',
    color: dark ? '#f8fafc' : '#0f172a',
    backdrop: dark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(15, 23, 42, 0.4)',
    customClass: {
      popup: 'huasi-swal-popup',
      title: 'huasi-swal-title',
      htmlContainer: 'huasi-swal-content',
      confirmButton: 'huasi-swal-confirm-btn',
      cancelButton: 'huasi-swal-cancel-btn',
      denyButton: 'huasi-swal-deny-btn',
    },
    buttonsStyling: false,
  };
};

/**
 * Custom SweetAlert2 for HUASI
 */
export const HuasiAlert = {
  /**
   * Alerta de Éxito
   */
  success: (title, text, options = {}) => {
    return Swal.fire({
      ...getThemeConfig(),
      icon: 'success',
      title: title || '¡Excelente!',
      text: text || '',
      confirmButtonText: options.confirmButtonText || 'Entendido',
      iconColor: '#10b981',
      ...options,
    });
  },

  /**
   * Alerta de Error
   */
  error: (title, text, options = {}) => {
    return Swal.fire({
      ...getThemeConfig(),
      icon: 'error',
      title: title || 'Ocurrió un error',
      text: text || '',
      confirmButtonText: options.confirmButtonText || 'Aceptar',
      iconColor: '#ef4444',
      ...options,
    });
  },

  /**
   * Alerta de Advertencia
   */
  warning: (title, text, options = {}) => {
    return Swal.fire({
      ...getThemeConfig(),
      icon: 'warning',
      title: title || 'Atención',
      text: text || '',
      confirmButtonText: options.confirmButtonText || 'Entendido',
      iconColor: '#f59e0b',
      ...options,
    });
  },

  /**
   * Alerta de Información
   */
  info: (title, text, options = {}) => {
    return Swal.fire({
      ...getThemeConfig(),
      icon: 'info',
      title: title || 'Información',
      text: text || '',
      confirmButtonText: options.confirmButtonText || 'Entendido',
      iconColor: '#0098cd',
      ...options,
    });
  },

  /**
   * Diálogo de Confirmación (Pregunta Sí/No o Aceptar/Cancelar)
   * @returns Promise<boolean> true si confirmó, false si canceló
   */
  confirm: async ({
    title = '¿Estás seguro?',
    text = '',
    confirmText = 'Sí, continuar',
    cancelText = 'Cancelar',
    icon = 'warning',
    confirmButtonColor = '#0d7c3d',
    ...rest
  }) => {
    const result = await Swal.fire({
      ...getThemeConfig(),
      icon,
      title,
      text,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
      iconColor: icon === 'warning' ? '#f59e0b' : icon === 'danger' ? '#ef4444' : '#0d7c3d',
      ...rest,
    });
    return result.isConfirmed;
  },

  /**
   * Toast flotante en la esquina superior derecha
   */
  toast: (title, icon = 'success') => {
    const dark = isDarkMode();
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: dark ? '#1e293b' : '#ffffff',
      color: dark ? '#f8fafc' : '#0f172a',
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      },
    });

    return Toast.fire({
      icon,
      title,
    });
  },
};

export default HuasiAlert;
