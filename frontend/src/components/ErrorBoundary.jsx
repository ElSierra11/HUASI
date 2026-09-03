import React from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidMount() {
    this.handleGlobalError = (event) => {
      console.warn('Global error intercepted:', event);
    };
    window.addEventListener('error', this.handleGlobalError);
    window.addEventListener('unhandledrejection', this.handleGlobalError);
  }

  componentWillUnmount() {
    if (this.handleGlobalError) {
      window.removeEventListener('error', this.handleGlobalError);
      window.removeEventListener('unhandledrejection', this.handleGlobalError);
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary Capturado]:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'var(--bg-main, #f8fafc)',
          color: 'var(--text, #0f172a)',
          textAlign: 'center',
          fontFamily: 'sans-serif'
        }}>
          <div style={{
            background: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: 20,
            padding: '36px 28px',
            maxWidth: 480,
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px'
            }}>
              <ShieldAlert size={32} />
            </div>

            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--primary, #0f172a)' }}>
              Ocurrió un inconveniente temporal
            </h2>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted, #64748b)', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              La aplicación detectó una excepción inesperada y evitó el bloqueo completo de la interfaz.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  background: 'var(--ucc-green, #0d7c3d)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={16} /> Reintentar Cargar
              </button>

              <button
                onClick={this.handleGoHome}
                style={{
                  background: 'transparent',
                  color: 'var(--text, #0f172a)',
                  border: '1px solid var(--border, #cbd5e1)',
                  padding: '10px 18px',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer'
                }}
              >
                <Home size={16} /> Ir al Inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
