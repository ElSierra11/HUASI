import React, { useState } from 'react';
import { HelpCircle, X, Mail, Copy, Check, ExternalLink } from 'lucide-react';

export default function PqrButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const email = 'huasicorrespondencia@gmail.com';

  const toggleModal = () => setIsOpen(!isOpen);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Botón Flotante de PQRs */}
      <button
        onClick={toggleModal}
        className="pqr-fab"
        title="Contacto PQRs y Soporte"
        style={{
          background: 'linear-gradient(135deg, #0d9488, #0f766e)',
          color: 'white',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(13, 148, 136, 0.45)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1.0)';
          e.currentTarget.style.boxShadow = '';
        }}
      >
        <HelpCircle size={28} />
      </button>

      {/* Modal de PQRs */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 16
          }}
          onClick={toggleModal}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text)',
              width: '100%',
              maxWidth: 480,
              borderRadius: 16,
              padding: 32,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              position: 'relative',
              animation: 'slideUp 0.3s ease-out'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Botón cerrar */}
            <button
              onClick={toggleModal}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
              onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
            >
              <X size={18} />
            </button>

            {/* Cabecera */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  background: '#ccfbf1',
                  color: '#0d9488',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}
              >
                <Mail size={30} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 8, fontFamily: 'var(--font-heading)' }}>
                Contacto PQRs y Soporte
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5' }}>
                ¿Tienes alguna petición, queja, reclamo, sugerencia o necesitas soporte técnico con la plataforma? 
                Escríbenos directamente a nuestro correo electrónico institucional.
              </p>
            </div>

            {/* Tarjeta de Correo Electrónico */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Correo de contacto oficial
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--text)'
              }}>
                <span style={{ wordBreak: 'break-all' }}>{email}</span>
                <button
                  onClick={copyToClipboard}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: copied ? '#0d9488' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4,
                    transition: 'color 0.2s'
                  }}
                  title="Copiar correo"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            {/* Acción Principal */}
            <a
              href={`mailto:${email}?subject=PQR/Soporte%20-%20HUASI`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '14px 24px',
                background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                color: 'white',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: '0.95rem',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
                transition: 'all 0.2s',
                textAlign: 'center'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(13, 148, 136, 0.35)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(13, 148, 136, 0.25)';
              }}
            >
              Enviar correo electrónico <ExternalLink size={16} />
            </a>

            {/* Pie de página del modal */}
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 16, marginTop: 20 }}>
              HUASI responderá a tu solicitud en un plazo máximo de 2 a 3 días hábiles.
            </div>

          </div>
        </div>
      )}
    </>
  );
}
