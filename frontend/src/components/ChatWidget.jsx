import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { Send, MessageCircle, X, ArrowLeft, ChevronDown, Home, Eye, MoreHorizontal, Check, XCircle, Archive, Calendar } from 'lucide-react';
import api from '../api';

export default function ChatWidget() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [conversaciones, setConversaciones] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [typing, setTyping] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [reservaInfo, setReservaInfo] = useState(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [otherUserProperties, setOtherUserProperties] = useState([]);
  const [bookingForm, setBookingForm] = useState({
    propiedad_id: '',
    fecha_inicio: '',
    fecha_fin: '',
    mensaje: 'Hola, me gustaría reservar tu alojamiento.',
    num_huespedes: 1
  });
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const moreOptionsRef = useRef(null);
  const activeConvRef = useRef(null);

  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  // Listen for external "open-chat" events (e.g., from PropertyDetail)
  useEffect(() => {
    const handleOpenChat = (e) => {
      const targetUserId = e.detail?.userId;
      if (!targetUserId || !user) return;

      setOpen(true);

      // Create or get conversation, then select it
      api.post('/chat/conversaciones', { otro_usuario_id: parseInt(targetUserId) })
        .then(convRes => {
          const convId = convRes.data.conversacion_id;
          return api.get('/chat/conversaciones').then(r => {
            setConversaciones(r.data);
            const found = r.data.find(c => c.id === convId);
            if (found) setActiveConv(found);
          });
        })
        .catch(err => console.error('Error opening chat:', err));
    };

    window.addEventListener('open-chat', handleOpenChat);
    return () => window.removeEventListener('open-chat', handleOpenChat);
  }, [user]);

  // Close "more options" dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreOptionsRef.current && !moreOptionsRef.current.contains(e.target)) {
        setShowMoreOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Connect Socket.IO
  useEffect(() => {
    if (!user) return;

    const getCookie = (name) => {
      const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
      return match ? match[1] : '';
    };

    const token = getCookie('stayu_token') || getCookie('stayu_admin_token') || localStorage.getItem('stayu_token') || localStorage.getItem('token') || '';

    const socket = io({
      path: '/chat-socket',
      auth: { token },
      withCredentials: true
    });

    socketRef.current = socket;

    socket.on('new_message', (msg) => {
      const currentActiveConv = activeConvRef.current;
      const isActive = currentActiveConv && currentActiveConv.id === msg.conversacion_id;

      if (isActive) {
        socket.emit('mark_read', { conversacion_id: msg.conversacion_id });
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }

      setConversaciones(prev => {
        const exists = prev.some(c => c.id === msg.conversacion_id);
        if (!exists) {
          // Si la conversación no existe en la lista, la recargamos de la API
          api.get('/chat/conversaciones')
            .then(res => setConversaciones(res.data))
            .catch(err => console.error('Error loading conversations:', err));
          return prev;
        }

        return prev.map(c => c.id === msg.conversacion_id
          ? {
            ...c,
            ultimo_mensaje: msg.contenido,
            ultimo_mensaje_fecha: msg.created_at,
            no_leidos: (msg.sender_id !== user.id && !isActive) ? (c.no_leidos || 0) + 1 : c.no_leidos
          }
          : c
        ).sort((a, b) => new Date(b.ultimo_mensaje_fecha || b.updated_at) - new Date(a.ultimo_mensaje_fecha || a.updated_at));
      });

      // Update global unread count
      if (msg.sender_id !== user.id && !isActive) {
        setUnreadTotal(prev => prev + 1);
      }
    });

    socket.on('user_typing', (data) => {
      setTyping(data.conversacion_id);
    });

    socket.on('user_stop_typing', (data) => {
      if (data && data.conversacion_id) {
        setTyping(prev => prev === data.conversacion_id ? false : prev);
      } else {
        setTyping(false);
      }
    });

    return () => socket.disconnect();
  }, [user]);

  // Load conversations when widget opens
  useEffect(() => {
    if (!user || !open) return;

    api.get('/chat/conversaciones')
      .then(res => {
        setConversaciones(res.data);
        if (res.data.length > 0 && !activeConvRef.current) {
          setActiveConv(res.data[0]);
        }
      })
      .catch(err => console.error('Error loading chats:', err));
  }, [user, open]);

  // Load unread count periodically
  useEffect(() => {
    if (!user) return;

    const fetchUnread = () => {
      api.get('/chat/no-leidos')
        .then(res => setUnreadTotal(res.data.no_leidos))
        .catch(() => {});
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Load messages + reservation info when selecting a conversation
  useEffect(() => {
    if (!activeConv) {
      setReservaInfo(null);
      setOtherUserProperties([]);
      setShowBookingModal(false);
      return;
    }

    const fetchMsgs = () => {
      api.get(`/chat/conversaciones/${activeConv.id}/mensajes`)
        .then(res => setMessages(res.data))
        .catch(() => {});
    };

    fetchMsgs();
    const pollInterval = setInterval(fetchMsgs, 2500);

    // Fetch associated reservation/property info
    api.get(`/chat/conversaciones/${activeConv.id}/reserva`)
      .then(res => setReservaInfo(res.data))
      .catch(() => setReservaInfo(null));

    // Fetch other user's active properties
    const otherId = getOtherUserId(activeConv);
    api.get(`/propiedades?host_id=${otherId}`)
      .then(res => {
        const props = res.data.propiedades || [];
        setOtherUserProperties(props);
        if (props.length > 0) {
          setBookingForm(prev => ({ ...prev, propiedad_id: props[0].id }));
        }
      })
      .catch(() => setOtherUserProperties([]));

    // Mark as read
    if (socketRef.current) {
      socketRef.current.emit('mark_read', { conversacion_id: activeConv.id });
    }

    setConversaciones(prev =>
      prev.map(c => c.id === activeConv.id ? { ...c, no_leidos: 0 } : c)
    );

    return () => clearInterval(pollInterval);
  }, [activeConv?.id]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const content = newMsg.trim();
    if (!content || !activeConv) return;
    setNewMsg('');

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('send_message', {
        conversacion_id: activeConv.id,
        contenido: content
      });

      socketRef.current.emit('stop_typing', {
        conversacion_id: activeConv.id,
        receiverId: getOtherUserId(activeConv)
      });
    } else {
      // Fallback por REST API solo si no hay conexión de WebSocket
      try {
        const res = await api.post(`/chat/conversaciones/${activeConv.id}/mensajes`, { contenido: content });
        setMessages(prev => {
          if (prev.some(m => m.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
      } catch (err) {
        console.error('Error enviando mensaje por API:', err);
      }
    }
  };

  const handleTyping = (e) => {
    setNewMsg(e.target.value);
    if (!socketRef.current || !activeConv) return;

    socketRef.current.emit('typing', {
      conversacion_id: activeConv.id,
      receiverId: getOtherUserId(activeConv)
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('stop_typing', {
        conversacion_id: activeConv.id,
        receiverId: getOtherUserId(activeConv)
      });
    }, 2000);
  };

  // ===== RESERVATION ACTIONS (from chat, like Marketplace) =====
  const handleReservationAction = async (action) => {
    if (!reservaInfo || !activeConv) return;
    try {
      await api.post('/reservas/chat/command', {
        reservationId: reservaInfo.reserva_id,
        action
      });
      try {
        await refreshUser();
      } catch (err) {
        console.error('Error refreshing user in chat widget:', err);
      }

      // Emit system message over socket so both host and guest get it live in real time!
      if (socketRef.current) {
        const systemMsgMap = {
          aceptar: '✅ Reserva aceptada por el anfitrión.',
          rechazar: '❌ Reserva rechazada por el anfitrión.',
          archivar: '📦 Publicación archivada por el anfitrión.'
        };
        if (systemMsgMap[action]) {
          socketRef.current.emit('send_message', {
            conversacion_id: activeConv.id,
            contenido: systemMsgMap[action]
          });
        }
      }

      // Refresh reservation info
      const res = await api.get(`/chat/conversaciones/${activeConv.id}/reserva`);
      setReservaInfo(res.data);
      setShowMoreOptions(false);
    } catch (err) {
      console.error('Error en acción de reserva:', err);
    }
  };

  const handleCreateReservation = async (e) => {
    e.preventDefault();
    if (!bookingForm.propiedad_id || !bookingForm.fecha_inicio || !bookingForm.fecha_fin) {
      alert('Por favor completa todos los campos.');
      return;
    }
    try {
      const selectedProp = otherUserProperties.find(p => p.id === parseInt(bookingForm.propiedad_id));
      await api.post('/reservas', {
        propiedad_id: parseInt(bookingForm.propiedad_id),
        fecha_inicio: bookingForm.fecha_inicio,
        fecha_fin: bookingForm.fecha_fin,
        mensaje: bookingForm.mensaje,
        num_huespedes: parseInt(bookingForm.num_huespedes)
      });
      
      setShowBookingModal(false);
      
      // Send a notification message inside the chat
      if (socketRef.current) {
        socketRef.current.emit('send_message', {
          conversacion_id: activeConv.id,
          contenido: `📅 SOLICITUD DE RESERVA: He solicitado reservar "${selectedProp?.titulo || 'Alojamiento'}" del ${bookingForm.fecha_inicio} al ${bookingForm.fecha_fin}.`
        });
      }
      
      // Refresh reservation info
      const res = await api.get(`/chat/conversaciones/${activeConv.id}/reserva`);
      setReservaInfo(res.data);

      // Refresh messages
      const msgRes = await api.get(`/chat/conversaciones/${activeConv.id}/mensajes`);
      setMessages(msgRes.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al solicitar la reserva');
    }
  };

  const getOtherUserId = (conv) => conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

  const getOtherUserName = (conv) => {
    if (conv.user1_id === user.id) return `${conv.user2_nombre} ${conv.user2_apellido}`;
    return `${conv.user1_nombre} ${conv.user1_apellido}`;
  };

  const getInitials = (conv) => {
    if (conv.user1_id === user.id) return `${conv.user2_nombre?.[0] || ''}${conv.user2_apellido?.[0] || ''}`;
    return `${conv.user1_nombre?.[0] || ''}${conv.user1_apellido?.[0] || ''}`;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return d.toLocaleDateString('es-CO', { weekday: 'short' });
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });
  };

  const getEstadoBadge = (estado) => {
    const map = {
      pendiente: { label: 'Pendiente', cls: 'chat-badge-pending' },
      aceptada: { label: 'Aceptada', cls: 'chat-badge-accepted' },
      rechazada: { label: 'Rechazada', cls: 'chat-badge-rejected' },
      cancelada: { label: 'Cancelada', cls: 'chat-badge-cancelled' },
      completada: { label: 'Completada', cls: 'chat-badge-completed' },
    };
    return map[estado] || { label: estado, cls: '' };
  };

  // Detect system messages (reservation actions)
  const isSystemMessage = (contenido) => {
    if (!contenido) return false;
    return contenido.startsWith('✅') || 
           contenido.startsWith('❌') || 
           contenido.startsWith('📦') || 
           contenido.startsWith('📅') || 
           contenido.startsWith('🎓') || 
           contenido.startsWith('ℹ️') || 
           contenido.startsWith('🎉') || 
           contenido.includes('SOLICITUD DE RESERVA');
  };

  const isHost = reservaInfo && reservaInfo.host_id === user?.id;

  if (!user) return null;

  return (
    <>
      {/* Floating Bubble */}
      <button
        className="chat-fab"
        onClick={() => { setOpen(!open); if (!open) setActiveConv(null); }}
        title="Mensajes"
      >
        {open ? <ChevronDown size={26} /> : <MessageCircle size={26} />}
        {!open && unreadTotal > 0 && (
          <span className="chat-fab-badge">{unreadTotal > 9 ? '9+' : unreadTotal}</span>
        )}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="chat-widget">
          {activeConv ? (
            /* ===== MESSAGE VIEW ===== */
            <>
              <div className="chat-w-header">
                <button className="chat-w-back" onClick={() => { setActiveConv(null); setReservaInfo(null); setShowMoreOptions(false); }}>
                  <ArrowLeft size={18} />
                </button>
                <div className="chat-w-avatar-sm">{getInitials(activeConv)}</div>
                <div className="chat-w-header-info">
                  <span className="chat-w-header-name">{getOtherUserName(activeConv)}</span>
                  {typing === activeConv.id && <span className="chat-w-typing">Escribiendo...</span>}
                </div>
                <button className="chat-w-close" onClick={() => setOpen(false)}><X size={18} /></button>
              </div>

              {/* ===== MARKETPLACE-STYLE PROPERTY BAR (like Messenger) ===== */}
              {reservaInfo ? (
                <div className="chat-marketplace-bar">
                  <div className="chat-mp-icon">
                    <Home size={18} />
                  </div>
                  <div className="chat-mp-info">
                    <span className="chat-mp-label">HUASI</span>
                    <span className="chat-mp-title">
                      {(() => {
                        const badge = getEstadoBadge(reservaInfo.estado);
                        return (
                          <>
                            <span className={`chat-mp-status ${badge.cls}`}>{badge.label}</span>
                            {' - '}
                            {reservaInfo.titulo}
                          </>
                        );
                      })()}
                    </span>
                  </div>
                  <div className="chat-mp-actions" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {isHost && reservaInfo.estado === 'pendiente' ? (
                      <>
                        <button
                          className="chat-mp-btn"
                          onClick={() => handleReservationAction('aceptar')}
                          style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 10px', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}
                        >
                          Aceptar
                        </button>
                        <button
                          className="chat-mp-btn"
                          onClick={() => handleReservationAction('rechazar')}
                          style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}
                        >
                          Rechazar
                        </button>
                      </>
                    ) : (
                      <button
                        className="chat-mp-btn chat-mp-btn-detail"
                        onClick={() => navigate(`/propiedad/${reservaInfo.propiedad_id}`)}
                      >
                        Ver detalles
                      </button>
                    )}
                    <div className="chat-mp-more-wrap" ref={moreOptionsRef}>
                      <button
                        className="chat-mp-btn chat-mp-btn-more"
                        onClick={() => setShowMoreOptions(!showMoreOptions)}
                      >
                        Más
                      </button>
                      {showMoreOptions && (
                        <div className="chat-mp-dropdown">
                          <button
                            className="chat-mp-drop-item detail"
                            onClick={() => { navigate(`/propiedad/${reservaInfo.propiedad_id}`); setShowMoreOptions(false); }}
                          >
                            <Eye size={15} /> Ver publicación
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                !reservaInfo && otherUserProperties.length > 0 && (
                  <div className="chat-marketplace-bar">
                    <div className="chat-mp-icon">
                      <Home size={18} />
                    </div>
                    <div className="chat-mp-info">
                      <span className="chat-mp-label">Alojamiento disponible</span>
                      <span className="chat-mp-title" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {otherUserProperties[0].titulo}
                      </span>
                    </div>
                    <div className="chat-mp-actions">
                      <button
                        className="chat-mp-btn"
                        style={{ background: 'var(--ucc-green)', color: 'white', border: 'none', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}
                        onClick={() => setShowBookingModal(true)}
                      >
                        Solicitar Reserva
                      </button>
                    </div>
                  </div>
                )
              )}

              {showBookingModal ? (
                <div className="chat-w-messages" style={{ background: 'var(--bg-card)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 'bold', fontSize: '1rem', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={18} className="text-ucc-green" />
                    <span>Solicitar Reserva</span>
                  </h4>
                  <form onSubmit={handleCreateReservation} style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
                    {otherUserProperties.length > 1 ? (
                      <div className="form-group" style={{ marginBottom: '8px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Alojamiento</label>
                        <select 
                          className="form-control" 
                          style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                          value={bookingForm.propiedad_id}
                          onChange={e => setBookingForm(prev => ({ ...prev, propiedad_id: e.target.value }))}
                          required
                        >
                          {otherUserProperties.map(p => (
                            <option key={p.id} value={p.id}>{p.titulo}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.82rem', color: 'var(--primary)', marginBottom: '8px', background: 'var(--bg)', padding: '10px', borderRadius: '8px' }}>
                        <strong>Alojamiento:</strong> {otherUserProperties[0]?.titulo}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div className="form-group" style={{ marginBottom: '0px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Llegada</label>
                        <input 
                          type="date" 
                          className="form-control" 
                          style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                          value={bookingForm.fecha_inicio}
                          onChange={e => setBookingForm(prev => ({ ...prev, fecha_inicio: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Salida</label>
                        <input 
                          type="date" 
                          className="form-control" 
                          style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                          value={bookingForm.fecha_fin}
                          onChange={e => setBookingForm(prev => ({ ...prev, fecha_fin: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '0px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Huéspedes</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        min="1" 
                        max={otherUserProperties.find(p => p.id === parseInt(bookingForm.propiedad_id))?.capacidad || 4}
                        style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                        value={bookingForm.num_huespedes}
                        onChange={e => setBookingForm(prev => ({ ...prev, num_huespedes: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '0px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Mensaje</label>
                      <textarea 
                        className="form-control" 
                        rows="2"
                        style={{ padding: '8px 12px', fontSize: '0.82rem', minHeight: '60px' }}
                        value={bookingForm.mensaje}
                        onChange={e => setBookingForm(prev => ({ ...prev, mensaje: e.target.value }))}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '10px' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', borderRadius: '8px' }}
                        onClick={() => setShowBookingModal(false)}
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary" 
                        style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', borderRadius: '8px', background: 'var(--ucc-green)' }}
                      >
                        Enviar
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="chat-w-messages">
                  {messages.map(msg => {
                    const isSys = isSystemMessage(msg.contenido);
                    const isMine = msg.sender_id === user.id;

                    return (
                      <div
                        key={msg.id}
                        className={`chat-w-bubble ${isSys ? 'system' : isMine ? 'mine' : 'other'}`}
                      >
                        <p>{msg.contenido}</p>
                        <span className="chat-w-time">
                          {new Date(msg.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}

              <form className="chat-w-input" onSubmit={handleSend}>
                <input
                  type="text"
                  placeholder="Escribe un mensaje..."
                  value={newMsg}
                  onChange={handleTyping}
                  autoFocus
                />
                <button type="submit" disabled={!newMsg.trim()}>
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            /* ===== CONVERSATION LIST ===== */
            <>
              <div className="chat-w-header">
                <MessageCircle size={20} />
                <span className="chat-w-header-name" style={{ flex: 1 }}>Mensajes</span>
                <button className="chat-w-close" onClick={() => setOpen(false)}><X size={18} /></button>
              </div>

              <div className="chat-w-list">
                {conversaciones.length === 0 ? (
                  <div className="chat-w-empty">
                    <MessageCircle size={40} strokeWidth={1} />
                    <p>Sin conversaciones</p>
                    <span>Reserva un alojamiento para iniciar un chat.</span>
                  </div>
                ) : (
                  conversaciones.map(conv => (
                    <div key={conv.id} className="chat-w-list-item" onClick={() => setActiveConv(conv)}>
                      <div className="chat-w-avatar">{getInitials(conv)}</div>
                      <div className="chat-w-list-info">
                        <div className="chat-w-list-top">
                          <span className="chat-w-list-name">{getOtherUserName(conv)}</span>
                          <span className="chat-w-list-time">{formatTime(conv.ultimo_mensaje_fecha)}</span>
                        </div>
                        <div className="chat-w-list-bottom">
                          <span className="chat-w-list-preview">{conv.ultimo_mensaje || 'Sin mensajes'}</span>
                          {conv.no_leidos > 0 && <span className="chat-w-unread">{conv.no_leidos}</span>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
