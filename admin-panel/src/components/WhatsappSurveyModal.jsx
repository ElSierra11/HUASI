import { useState, useEffect, useMemo } from 'react';
import {
  MessageCircle,
  CheckCircle2,
  Send,
  Search,
  RotateCcw,
  Copy,
  CheckCheck,
  AlertTriangle,
  PhoneOff,
  ExternalLink,
  X
} from 'lucide-react';

const STORAGE_SENT_KEY = 'huasi_wa_survey_sent_v1';
const STORAGE_MSG_KEY = 'huasi_wa_survey_template_v1';

const DEFAULT_TEMPLATE = `Hola {nombre}, te saludamos del equipo de HUASI (Red de Hospedaje Solidario UCC).

Queremos seguir mejorando la plataforma para ti y la comunidad universitaria. ¿Nos ayudas respondiendo esta breve encuesta? Toma menos de 2 minutos:
https://forms.gle/11jP8XrAJvjKVXy46

¡Muchas gracias por ser parte de HUASI!`;

/**
 * Normaliza un número de teléfono para enlaces wa.me (por defecto código país Colombia +57).
 */
export function normalizePhoneForWa(rawPhone) {
  if (!rawPhone) return null;
  const digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return null;

  // Celular colombiano de 10 dígitos (ej. 3001234567)
  if (digits.length === 10 && digits.startsWith('3')) {
    return `57${digits}`;
  }
  // Ya incluye prefijo 57 + 10 dígitos
  if (digits.length === 12 && digits.startsWith('573')) {
    return digits;
  }
  // Número internacional válido (entre 10 y 15 dígitos)
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }
  return null;
}

export default function WhatsappSurveyModal({ isOpen, onClose, usuarios = [], showToast }) {
  const [sentMap, setSentMap] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SENT_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [template, setTemplate] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_MSG_KEY) || DEFAULT_TEMPLATE;
    } catch {
      return DEFAULT_TEMPLATE;
    }
  });

  const [filterTab, setFilterTab] = useState('pendientes'); // 'pendientes' | 'enviados' | 'todos' | 'sin_telefono'
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedNumbers, setCopiedNumbers] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SENT_KEY, JSON.stringify(sentMap));
    } catch {
      // Ignorar si localStorage no está disponible
    }
  }, [sentMap]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MSG_KEY, template);
    } catch {
      // Ignorar si localStorage no está disponible
    }
  }, [template]);

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

  const enrichedUsers = useMemo(() => {
    return usuarios.map((u) => {
      const waPhone = normalizePhoneForWa(u.telefono);
      return {
        ...u,
        waPhone,
        isSent: Boolean(sentMap[u.id])
      };
    });
  }, [usuarios, sentMap]);

  const stats = useMemo(() => {
    const conTelefono = enrichedUsers.filter((u) => Boolean(u.waPhone));
    const sinTelefono = enrichedUsers.filter((u) => !u.waPhone);
    const enviados = conTelefono.filter((u) => u.isSent);
    const pendientes = conTelefono.filter((u) => !u.isSent);
    return {
      total: enrichedUsers.length,
      conTelefono: conTelefono.length,
      sinTelefono: sinTelefono.length,
      enviados: enviados.length,
      pendientes: pendientes.length,
      pct: conTelefono.length > 0 ? Math.round((enviados.length / conTelefono.length) * 100) : 0
    };
  }, [enrichedUsers]);

  const visibleUsers = useMemo(() => {
    return enrichedUsers.filter((u) => {
      if (filterTab === 'pendientes' && (!u.waPhone || u.isSent)) return false;
      if (filterTab === 'enviados' && (!u.waPhone || !u.isSent)) return false;
      if (filterTab === 'todos' && !u.waPhone) return false;
      if (filterTab === 'sin_telefono' && u.waPhone) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const hay = `${u.nombre || ''} ${u.apellido || ''} ${u.email || ''} ${u.telefono || ''} ${u.campus || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [enrichedUsers, filterTab, searchTerm]);

  if (!isOpen) return null;

  const buildPersonalizedMessage = (user) => {
    const firstName = (user.nombre || '').trim().split(/\s+/)[0] || 'hola';
    return template.replace(/\{nombre\}/gi, firstName);
  };

  const handleSendOne = (user) => {
    if (!user.waPhone) return;
    const text = buildPersonalizedMessage(user);
    const url = `https://wa.me/${user.waPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setSentMap((prev) => ({
      ...prev,
      [user.id]: new Date().toISOString()
    }));
  };

  const handleToggleSent = (userId) => {
    setSentMap((prev) => {
      const next = { ...prev };
      if (next[userId]) {
        delete next[userId];
      } else {
        next[userId] = new Date().toISOString();
      }
      return next;
    });
  };

  const handleResetProgress = () => {
    setSentMap({});
    showToast?.('Progreso de envíos reiniciado', 'info');
  };

  const handleCopyPendingNumbers = async () => {
    const numbers = enrichedUsers
      .filter((u) => u.waPhone && !u.isSent)
      .map((u) => `+${u.waPhone}`)
      .join('\n');

    if (!numbers) {
      showToast?.('No hay números pendientes por copiar', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(numbers);
      setCopiedNumbers(true);
      showToast?.(`Copiados ${numbers.split('\n').length} números pendientes`, 'success');
      setTimeout(() => setCopiedNumbers(false), 2500);
    } catch {
      showToast?.('No se pudieron copiar los números', 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: 820, width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Cabecera */}
        <div className="modal-header">
          <div className="modal-title">
            <MessageCircle size={20} style={{ color: '#16a34a' }} />
            <span>Campaña de Encuesta por WhatsApp</span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="modal-body" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Resumen y barra de progreso */}
          <div style={{ background: 'rgba(22, 163, 74, 0.06)', border: '1px solid rgba(22, 163, 74, 0.2)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>
                Avance: {stats.enviados} de {stats.conTelefono} usuarios con teléfono ({stats.pct}%)
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {stats.pendientes} pendientes · {stats.sinTelefono} sin número válido
              </div>
            </div>
            <div style={{ width: '100%', height: 8, background: 'rgba(15, 23, 42, 0.08)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${stats.pct}%`, height: '100%', background: '#16a34a', transition: 'width 0.25s ease' }} />
            </div>
            <div style={{ marginTop: 8, fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} color="#d97706" style={{ flexShrink: 0 }} />
              <span>Sugerencia: envía bloques de 30–40 mensajes y descansa 1–2 minutos entre bloques para cuidar tu línea de WhatsApp.</span>
            </div>
          </div>

          {/* Plantilla de mensaje */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>
                Mensaje personalizado (usa <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: 4 }}>{'{nombre}'}</code> para insertar el primer nombre)
              </label>
              <button
                type="button"
                onClick={() => setTemplate(DEFAULT_TEMPLATE)}
                style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <RotateCcw size={12} /> Restaurar texto
              </button>
            </div>
            <textarea
              className="form-control"
              rows={4}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              style={{ fontSize: '0.82rem', lineHeight: 1.45, resize: 'vertical' }}
            />
          </div>

          {/* Filtros y buscador */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'pendientes', label: `Pendientes (${stats.pendientes})` },
                { id: 'enviados', label: `Enviados (${stats.enviados})` },
                { id: 'todos', label: `Todos (${stats.conTelefono})` },
                { id: 'sin_telefono', label: `Sin teléfono (${stats.sinTelefono})` }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilterTab(t.id)}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 7,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: `1px solid ${filterTab === t.id ? '#16a34a' : 'var(--border)'}`,
                    background: filterTab === t.id ? '#16a34a' : 'white',
                    color: filterTab === t.id ? 'white' : 'var(--text)'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', minWidth: 210, flex: '1 1 210px', maxWidth: 280 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Buscar usuario o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: 30, height: 34, fontSize: '0.8rem' }}
              />
            </div>
          </div>

          {/* Lista de usuarios */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', maxHeight: 300, overflowY: 'auto' }}>
            {visibleUsers.length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No hay usuarios en esta vista.
              </div>
            ) : (
              visibleUsers.map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '9px 14px',
                    borderBottom: '1px solid var(--border)',
                    background: u.isSent ? 'rgba(22, 163, 74, 0.04)' : 'white'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text)' }}>
                        {u.nombre} {u.apellido}
                      </span>
                      {u.campus && (
                        <span style={{ fontSize: '0.72rem', background: 'rgba(15,23,42,0.06)', padding: '1px 7px', borderRadius: 999, color: 'var(--text-muted)' }}>
                          {u.campus}
                        </span>
                      )}
                      {u.isSent && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <CheckCircle2 size={12} /> Enviado
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {u.waPhone ? `+${u.waPhone}` : (u.telefono ? `Número inválido: ${u.telefono}` : 'Sin teléfono registrado')} · {u.email}
                    </div>
                  </div>

                  {u.waPhone ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {u.isSent && (
                        <button
                          type="button"
                          onClick={() => handleToggleSent(u.id)}
                          title="Marcar como pendiente"
                          style={{
                            padding: '5px 9px',
                            fontSize: '0.74rem',
                            borderRadius: 6,
                            border: '1px solid var(--border)',
                            background: 'white',
                            color: 'var(--text-muted)',
                            cursor: 'pointer'
                          }}
                        >
                          Desmarcar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSendOne(u)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          borderRadius: 7,
                          border: 'none',
                          background: u.isSent ? '#e2e8f0' : '#16a34a',
                          color: u.isSent ? '#334155' : 'white',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5
                        }}
                      >
                        <Send size={13} />
                        {u.isSent ? 'Reenviar' : 'Enviar'}
                        <ExternalLink size={11} />
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <PhoneOff size={13} /> No disponible
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pie del modal */}
        <div className="modal-footer" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleCopyPendingNumbers}
              className="btn"
              style={{
                background: 'white',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {copiedNumbers ? <CheckCheck size={14} color="#16a34a" /> : <Copy size={14} />}
              {copiedNumbers ? 'Números copiados' : 'Copiar pendientes'}
            </button>

            {stats.enviados > 0 && (
              <button
                type="button"
                onClick={handleResetProgress}
                className="btn"
                style={{
                  background: 'white',
                  border: '1px solid var(--border)',
                  color: '#b91c1c',
                  fontSize: '0.8rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <RotateCcw size={14} /> Reiniciar progreso
              </button>
            )}
          </div>

          <button type="button" className="btn btn-primary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

