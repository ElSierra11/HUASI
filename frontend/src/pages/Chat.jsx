import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Send, MessageCircle, ArrowLeft, Circle } from 'lucide-react';
import api from '../api';

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversaciones, setConversaciones] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activeConvRef = useRef(null);

  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  // Connect to Socket.IO
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
        setMessages((prev) => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }

      setConversaciones((prev) => {
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
    });

    socket.on('user_typing', (data) => {
      const currentActiveConv = activeConvRef.current;
      if (data.conversacion_id === currentActiveConv?.id) setTyping(true);
    });

    socket.on('user_stop_typing', (data) => {
      const currentActiveConv = activeConvRef.current;
      if (data.conversacion_id === currentActiveConv?.id) setTyping(false);
    });

    socket.on('messages_read', () => {
      // Refresh messages to reflect read status
    });

    return () => socket.disconnect();
  }, [user]);

  // Load conversations
  useEffect(() => {
    if (!user) return;

    api.get('/chat/conversaciones')
      .then(res => {
        setConversaciones(res.data);

        // Check if we need to open a specific conversation (from URL param)
        const targetUserId = searchParams.get('con');
        if (targetUserId) {
          api.post('/chat/conversaciones', { otro_usuario_id: parseInt(targetUserId) })
            .then(convRes => {
              const convId = convRes.data.conversacion_id;
              
              // Volver a cargar la lista para asegurarnos de tener la info del usuario
              api.get('/chat/conversaciones').then(r => {
                setConversaciones(r.data);
                const found = r.data.find(c => c.id === convId);
                if (found) {
                  setActiveConv(found);
                }
              });
            })
            .catch(err => console.error('Error al iniciar conversación:', err));
        }
      })
      .catch(err => console.error('Error cargando conversaciones:', err))
      .finally(() => setLoading(false));
  }, [user, searchParams.get('con')]); // Escuchar específicamente cambios en el ID de destino

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConv) return;

    api.get(`/chat/conversaciones/${activeConv.id}/mensajes`)
      .then(res => setMessages(res.data));

    // Mark as read
    if (socketRef.current) {
      socketRef.current.emit('mark_read', { conversacion_id: activeConv.id });
    }

    // Update unread count locally
    setConversaciones(prev =>
      prev.map(c => c.id === activeConv.id ? { ...c, no_leidos: 0 } : c)
    );
  }, [activeConv?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !activeConv || !socketRef.current) return;

    setSending(true);
    socketRef.current.emit('send_message', {
      conversacion_id: activeConv.id,
      contenido: newMsg.trim()
    });
    setNewMsg('');
    setSending(false);

    // Stop typing
    socketRef.current.emit('stop_typing', {
      conversacion_id: activeConv.id,
      receiverId: getOtherUserId(activeConv)
    });
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
      socketRef.current.emit('stop_typing', {
        conversacion_id: activeConv.id,
        receiverId: getOtherUserId(activeConv)
      });
    }, 2000);
  };

  const getOtherUserId = (conv) => {
    return conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
  };

  const getOtherUserName = (conv) => {
    if (conv.user1_id === user.id) {
      return `${conv.user2_nombre} ${conv.user2_apellido}`;
    }
    return `${conv.user1_nombre} ${conv.user1_apellido}`;
  };

  const getInitials = (conv) => {
    if (conv.user1_id === user.id) {
      return `${conv.user2_nombre?.[0] || ''}${conv.user2_apellido?.[0] || ''}`;
    }
    return `${conv.user1_nombre?.[0] || ''}${conv.user1_apellido?.[0] || ''}`;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return d.toLocaleDateString('es-CO', { weekday: 'short' });
    }
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div className="chat-container">
      {/* Sidebar — Conversation List */}
      <div className={`chat-sidebar ${activeConv ? 'chat-sidebar-hidden-mobile' : ''}`}>
        <div className="chat-sidebar-header">
          <h2><MessageCircle size={22} /> Mensajes</h2>
        </div>
        <div className="chat-list">
          {conversaciones.length === 0 ? (
            <div className="chat-empty">
              <MessageCircle size={48} strokeWidth={1} />
              <p>No tienes conversaciones aún.</p>
              <span>Explora propiedades y contacta a un anfitrión.</span>
            </div>
          ) : (
            conversaciones.map(conv => (
              <div
                key={conv.id}
                className={`chat-list-item ${activeConv?.id === conv.id ? 'active' : ''}`}
                onClick={() => setActiveConv(conv)}
              >
                <div className="chat-avatar">
                  {getInitials(conv)}
                </div>
                <div className="chat-list-info">
                  <div className="chat-list-top">
                    <span className="chat-list-name">{getOtherUserName(conv)}</span>
                    <span className="chat-list-time">{formatTime(conv.ultimo_mensaje_fecha || conv.updated_at)}</span>
                  </div>
                  <div className="chat-list-bottom">
                    <span className="chat-list-preview">{conv.ultimo_mensaje || 'Sin mensajes'}</span>
                    {conv.no_leidos > 0 && (
                      <span className="chat-unread-badge">{conv.no_leidos}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Window */}
      <div className={`chat-main ${!activeConv ? 'chat-main-hidden-mobile' : ''}`}>
        {activeConv ? (
          <>
            <div className="chat-main-header">
              <button className="chat-back-btn" onClick={() => setActiveConv(null)}>
                <ArrowLeft size={20} />
              </button>
              <div className="chat-avatar chat-avatar-sm">
                {getInitials(activeConv)}
              </div>
              <div>
                <h3>{getOtherUserName(activeConv)}</h3>
                {typing && <span className="chat-typing">Escribiendo...</span>}
              </div>
            </div>

            <div className="chat-messages">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-bubble ${msg.sender_id === user.id ? 'chat-bubble-mine' : 'chat-bubble-other'}`}
                >
                  <p>{msg.contenido}</p>
                  <span className="chat-bubble-time">
                    {new Date(msg.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-bar" onSubmit={handleSend}>
              <input
                type="text"
                placeholder="Escribe un mensaje..."
                value={newMsg}
                onChange={handleTyping}
                autoFocus
              />
              <button type="submit" disabled={!newMsg.trim() || sending} className="chat-send-btn">
                <Send size={20} />
              </button>
            </form>
          </>
        ) : (
          <div className="chat-placeholder">
            <MessageCircle size={64} strokeWidth={1} color="var(--text-muted)" />
            <h3>Selecciona una conversación</h3>
            <p>Elige un chat de la lista para comenzar a conversar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
