import React, { useState, useEffect } from 'react';

export default function SplashScreen({ onFinish }) {
  const [fading, setFading] = useState(false);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    // Retirar splash screen de HTML estático si aún existe
    const htmlSplash = document.getElementById('splash-screen');
    if (htmlSplash && htmlSplash.parentNode) {
      htmlSplash.parentNode.removeChild(htmlSplash);
    }

    // Duración de la pantalla de bienvenida antes de iniciar fade out (1.1 segundos)
    const timer = setTimeout(() => {
      setFading(true);
      // Duración de la transición fade out (400ms)
      const finishTimer = setTimeout(() => {
        setMounted(false);
        if (onFinish) onFinish();
      }, 400);
      return () => clearTimeout(finishTimer);
    }, 1100);

    return () => clearTimeout(timer);
  }, [onFinish]);

  if (!mounted) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        height: '100dvh',
        background: 'radial-gradient(circle at 50% 40%, #0d7c3d 0%, #064e3b 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999999,
        userSelect: 'none',
        overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent',
        opacity: fading ? 0 : 1,
        transform: fading ? 'scale(1.03)' : 'scale(1)',
        visibility: fading && !mounted ? 'hidden' : 'visible',
        transition: 'opacity 400ms cubic-bezier(0.4, 0, 0.2, 1), transform 400ms cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'opacity, transform',
        boxSizing: 'border-box',
        margin: 0,
        padding: '24px'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: '360px',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        {/* Contenedor del Logo Proporcionado */}
        <div
          style={{
            width: '104px',
            height: '104px',
            minWidth: '104px',
            minHeight: '104px',
            maxWidth: '104px',
            maxHeight: '104px',
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.28)',
            borderRadius: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
            marginBottom: '22px',
            flexShrink: 0
          }}
        >
          <img
            src="/huasi-monograma.png?v=5"
            alt="HUASI"
            style={{
              width: '72px',
              height: '72px',
              maxWidth: '72px',
              maxHeight: '72px',
              objectFit: 'contain',
              aspectRatio: '1 / 1',
              display: 'block',
              filter: 'drop-shadow(0 6px 16px rgba(0, 0, 0, 0.25))'
            }}
          />
        </div>

        {/* Título Oficial */}
        <h1
          style={{
            fontFamily: "'Sora', system-ui, -apple-system, sans-serif",
            fontWeight: 900,
            fontSize: '2.3rem',
            color: '#ffffff',
            letterSpacing: '0.05em',
            margin: 0,
            lineHeight: 1.1,
            textTransform: 'uppercase',
            textShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
          }}
        >
          HUASI
        </h1>

        {/* Subtítulo Oficial */}
        <p
          style={{
            fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
            fontSize: '0.98rem',
            color: 'rgba(255, 255, 255, 0.95)',
            margin: '8px 0 0 0',
            fontWeight: 600,
            letterSpacing: '-0.01em'
          }}
        >
          Hospedaje Solidario Universitario
        </p>

        {/* Tag Oficial */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '16px',
            background: 'rgba(255, 255, 255, 0.14)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            padding: '5px 16px',
            borderRadius: '9999px',
            fontSize: '0.72rem',
            color: '#a7f3d0',
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
          }}
        >
          <span>RED SOLIDARIA &bull; INDESCO &bull; UCC</span>
        </div>

        {/* Barra de Progreso */}
        <div
          style={{
            width: '130px',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '9999px',
            marginTop: '28px',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: '45%',
              background: '#ffffff',
              borderRadius: '9999px',
              animation: 'splashBarMove 1.3s ease-in-out infinite'
            }}
          />
        </div>

        {/* Logos Institucionales: UCC, Territorios Solidarios, INDESCO */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: '32px',
            gap: '8px'
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              background: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              padding: '9px 20px',
              borderRadius: '22px',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.22), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.85)'
            }}
          >
            <img
              src="/ucc_logo.png"
              alt="Universidad Cooperativa de Colombia"
              style={{
                height: '28px',
                width: 'auto',
                maxWidth: '105px',
                objectFit: 'contain',
                display: 'block'
              }}
            />
            <div
              style={{
                width: '1px',
                height: '22px',
                background: 'rgba(0, 0, 0, 0.12)'
              }}
            />
            <img
              src="/territorios_solidarios.png"
              alt="Territorios Solidarios"
              style={{
                height: '34px',
                width: 'auto',
                maxWidth: '38px',
                objectFit: 'contain',
                display: 'block'
              }}
            />
            <div
              style={{
                width: '1px',
                height: '22px',
                background: 'rgba(0, 0, 0, 0.12)'
              }}
            />
            <img
              src="/indesco.png"
              alt="INDESCO"
              style={{
                height: '26px',
                width: 'auto',
                maxWidth: '105px',
                objectFit: 'contain',
                display: 'block'
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes splashBarMove {
          0% { left: -45%; width: 35%; }
          50% { left: 30%; width: 50%; }
          100% { left: 100%; width: 35%; }
        }
      `}</style>
    </div>
  );
}
