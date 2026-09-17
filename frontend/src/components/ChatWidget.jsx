import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import {
  Send, MessageCircle, X, ArrowLeft, ChevronDown, Home, Eye,
  Calendar, Phone, Video, Image, MapPin, Camera,
  PhoneOff, VideoOff, Mic, MicOff
} from 'lucide-react';
import api from '../api';
import { notifyChatMessage, notifyIncomingCall, stopRingtone } from '../utils/notifications';

// ── Leaflet (lazy — sólo se carga si hay mensajes de ubicación) ──
let LeafletLoaded = false;
let MapContainer, TileLayer, Marker, Popup, L;

async function loadLeaflet() {
  if (LeafletLoaded) return true;
  try {
    const rl = await import('react-leaflet');
    MapContainer = rl.MapContainer;
    TileLayer = rl.TileLayer;
    Marker = rl.Marker;
    Popup = rl.Popup;
    const leaflet = await import('leaflet');
    await import('leaflet/dist/leaflet.css');
    L = leaflet.default;
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
    LeafletLoaded = true;
    return true;
  } catch (e) {
    console.warn('Leaflet no disponible:', e);
    return false;
  }
}

// ── WebRTC STUN servers ──
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// ── Location bubble — mini mapa estático sin dependencias ──
function LocationBubble({ lat, lng }) {
  const [leafletReady, setLeafletReady] = useState(false);
  const gmapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const osmStaticUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=210x130&markers=${lat},${lng}`;

  useEffect(() => {
    loadLeaflet().then(ok => setLeafletReady(ok));
  }, []);

  return (
    <div className="chat-location-bubble">
      {leafletReady && MapContainer ? (
        <div style={{ height: 130, width: 210, borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
          <MapContainer
            center={[lat, lng]} zoom={15}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false} dragging={false}
            scrollWheelZoom={false} doubleClickZoom={false}
            attributionControl={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[lat, lng]}><Popup>Mi ubicación</Popup></Marker>
          </MapContainer>
        </div>
      ) : (
        /* fallback: imagen estática mientras Leaflet carga o si falla */
        <a href={gmapsUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={osmStaticUrl}
            alt="Mapa de ubicación"
            style={{ width: 210, height: 130, borderRadius: 8, display: 'block', objectFit: 'cover', marginBottom: 6 }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        </a>
      )}
      <a href={gmapsUrl} target="_blank" rel="noopener noreferrer" className="chat-location-link">
        <MapPin size={12} />
        <span>Abrir en Google Maps</span>
      </a>
    </div>
  );
}

export default function ChatWidget() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  // ── Chat state ──
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
    propiedad_id: '', fecha_inicio: '', fecha_fin: '',
    mensaje: 'Hola, me gustaría reservar tu alojamiento.', num_huespedes: 1
  });

  // ── Call state ──
  const [callState, setCallState] = useState(null); // null|'incoming'|'outgoing'|'active'
  const [callType, setCallType] = useState('audio'); // 'audio'|'video'
  const [callData, setCallData] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // ── Refs ──
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const moreOptionsRef = useRef(null);
  const activeConvRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const callTimerRef = useRef(null);
  // ── Refs para evitar stale closures en handlers de socket ──
  const callTypeRef = useRef('audio');
  const callDataRef = useRef(null);

  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);
  useEffect(() => { callTypeRef.current = callType; }, [callType]);
  useEffect(() => { callDataRef.current = callData; }, [callData]);

  // ── Call timer ──
  useEffect(() => {
    if (callState === 'active') {
      callTimerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);
    } else {
      clearInterval(callTimerRef.current);
      setCallDuration(0);
    }
    return () => clearInterval(callTimerRef.current);
  }, [callState]);

  const formatCallDuration = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Listen for external open-chat events ──
  useEffect(() => {
    const handleOpenChat = (e) => {
      const targetUserId = e.detail?.userId;
      if (!targetUserId || !user) return;
      setOpen(true);
      api.post('/chat/conversaciones', { otro_usuario_id: parseInt(targetUserId) })
        .then(res => {
          const convId = res.data.conversacion_id;
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

  // ── Close dropdown on outside click ──
  useEffect(() => {
    const handler = (e) => {
      if (moreOptionsRef.current && !moreOptionsRef.current.contains(e.target)) setShowMoreOptions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── WebRTC helpers ──
  const endCall = useCallback(() => {
    stopRingtone(); // detener tono de llamada si estaba sonando
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallState(null);
    setCallData(null);
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  const getLocalStream = async (type) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video' ? { facingMode: 'user', width: 640, height: 480 } : false
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  };

  const createPeerConnection = useCallback((peerId) => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        socketRef.current.emit('webrtc_ice_candidate', { peerId, candidate: e.candidate });
      }
    };
    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') endCall();
    };
    return pc;
  }, [endCall]);

  // ── Socket.IO ──
  useEffect(() => {
    if (!user) return;

    const getCookie = (name) => {
      const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
      return m ? m[1] : '';
    };
    const token = getCookie('stayu_token') || getCookie('stayu_admin_token') ||
      localStorage.getItem('stayu_token') || localStorage.getItem('token') || '';

    const socketUrl = import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : undefined);

    const socket = io(socketUrl, { path: '/chat-socket', auth: { token }, withCredentials: true });
    socketRef.current = socket;

    // ── Chat messages ──
    socket.on('new_message', (msg) => {
      const currentConv = activeConvRef.current;
      const isActive = currentConv && currentConv.id === msg.conversacion_id;

      if (isActive) {
        socket.emit('mark_read', { conversacion_id: msg.conversacion_id });
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      }

      setConversaciones(prev => {
        const exists = prev.some(c => c.id === msg.conversacion_id);
        if (!exists) {
          api.get('/chat/conversaciones').then(r => setConversaciones(r.data)).catch(() => {});
          return prev;
        }
        const preview = msg.tipo === 'imagen' ? 'Imagen' : msg.tipo === 'ubicacion' ? 'Ubicación compartida' : msg.contenido;
        return prev.map(c => c.id === msg.conversacion_id
          ? { ...c, ultimo_mensaje: preview, ultimo_mensaje_fecha: msg.created_at, no_leidos: (msg.sender_id !== user.id && !isActive) ? (c.no_leidos || 0) + 1 : c.no_leidos }
          : c
        ).sort((a, b) => new Date(b.ultimo_mensaje_fecha || b.updated_at) - new Date(a.ultimo_mensaje_fecha || a.updated_at));
      });

      if (msg.sender_id !== user.id && (!isActive || document.hidden)) {
        setUnreadTotal(p => p + 1);
        const senderName = msg.sender_nombre ? `${msg.sender_nombre} ${msg.sender_apellido || ''}`.trim() : 'Estudiante HUASI';
        const preview = msg.tipo === 'imagen' ? 'Te envió una imagen' : msg.tipo === 'ubicacion' ? 'Compartió su ubicación' : msg.contenido;
        notifyChatMessage({ senderName, messageText: preview, conversacionId: msg.conversacion_id });
      }
    });

    socket.on('new_property_published', (d) => window.dispatchEvent(new CustomEvent('huasi:property-published', { detail: d })));
    socket.on('user_typing', (d) => setTyping(d.conversacion_id));
    socket.on('user_stop_typing', (d) => {
      if (d?.conversacion_id) setTyping(p => p === d.conversacion_id ? false : p);
      else setTyping(false);
    });

    // ── WebRTC signaling ──
    // Usamos refs (callTypeRef, callDataRef) para evitar stale closures
    socket.on('call_incoming', (data) => {
      setCallData(data);
      setCallType(data.callType || 'audio');
      setCallState('incoming');
      // Ringtone + push notification aunque la app esté en background
      notifyIncomingCall({
        callerName: data.callerName || 'Un usuario',
        callType: data.callType || 'audio'
      });
    });

    socket.on('call_accepted', async (data) => {
      // User A recibió aceptación → crea offer
      const peerId = data.receiverId;
      const cType = callTypeRef.current; // ← ref, nunca stale
      try {
        const stream = await getLocalStream(cType);
        const pc = createPeerConnection(peerId);
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_offer', { peerId, offer });
        setCallState('active');
      } catch (err) {
        console.error('Error creando WebRTC offer:', err);
        endCall();
      }
    });

    socket.on('call_rejected', () => endCall());
    socket.on('call_ended', () => endCall());

    socket.on('webrtc_offer', async (data) => {
      const { offer, fromId } = data;
      const cType = callTypeRef.current; // ← ref
      try {
        const stream = await getLocalStream(cType);
        const pc = createPeerConnection(fromId);
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', { peerId: fromId, answer });
        setCallState('active');
      } catch (err) {
        console.error('Error en webrtc_offer handler:', err);
        endCall();
      }
    });

    socket.on('webrtc_answer', async ({ answer }) => {
      try {
        if (peerConnectionRef.current) await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) { console.error('webrtc_answer error:', err); }
    });

    socket.on('webrtc_ice_candidate', async ({ candidate }) => {
      try {
        if (peerConnectionRef.current && candidate) await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) { console.error('ICE candidate error:', err); }
    });

    return () => socket.disconnect();
  }, [user, createPeerConnection, endCall]);

  // ── Load conversations when widget opens ──
  useEffect(() => {
    if (!user || !open) return;
    api.get('/chat/conversaciones')
      .then(res => {
        setConversaciones(res.data);
        if (res.data.length > 0 && !activeConvRef.current) setActiveConv(res.data[0]);
      })
      .catch(err => console.error('Error loading chats:', err));
  }, [user, open]);

  // ── Unread count polling ──
  useEffect(() => {
    if (!user) return;
    const fetch = () => api.get('/chat/no-leidos').then(r => setUnreadTotal(r.data.no_leidos)).catch(() => {});
    fetch();
    const iv = setInterval(fetch, 30000);
    return () => clearInterval(iv);
  }, [user]);

  // ── Load messages on conversation select ──
  useEffect(() => {
    if (!activeConv) { setReservaInfo(null); setOtherUserProperties([]); setShowBookingModal(false); return; }

    const fetchMsgs = () => api.get(`/chat/conversaciones/${activeConv.id}/mensajes`).then(r => setMessages(r.data)).catch(() => {});
    fetchMsgs();
    const iv = setInterval(fetchMsgs, 2500);

    api.get(`/chat/conversaciones/${activeConv.id}/reserva`).then(r => setReservaInfo(r.data)).catch(() => setReservaInfo(null));

    const otherId = getOtherUserId(activeConv);
    api.get(`/propiedades?host_id=${otherId}`)
      .then(r => {
        const props = r.data.propiedades || [];
        setOtherUserProperties(props);
        if (props.length > 0) setBookingForm(p => ({ ...p, propiedad_id: props[0].id }));
      })
      .catch(() => setOtherUserProperties([]));

    if (socketRef.current) socketRef.current.emit('mark_read', { conversacion_id: activeConv.id });
    setConversaciones(p => p.map(c => c.id === activeConv.id ? { ...c, no_leidos: 0 } : c));

    return () => clearInterval(iv);
  }, [activeConv?.id]);

  // ── Auto scroll ──
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Send text ──
  const handleSend = async (e) => {
    e.preventDefault();
    const content = newMsg.trim();
    if (!content || !activeConv) return;
    setNewMsg('');

    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', { conversacion_id: activeConv.id, contenido: content, tipo: 'texto' });
      socketRef.current.emit('stop_typing', { conversacion_id: activeConv.id, receiverId: getOtherUserId(activeConv) });
    } else {
      try {
        const res = await api.post(`/chat/conversaciones/${activeConv.id}/mensajes`, { contenido: content, tipo: 'texto' });
        setMessages(p => p.some(m => m.id === res.data.id) ? p : [...p, res.data]);
      } catch (err) { console.error('Error enviando mensaje:', err); }
    }
  };

  // ── Send image ──
  const handleImageUpload = async (file) => {
    if (!file || !activeConv) return;
    try {
      const fd = new FormData();
      fd.append('imagen', file);
      const uploadRes = await api.post('/chat/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = uploadRes.data.url;
      const contenido = `[imagen]${url}`;
      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', { conversacion_id: activeConv.id, contenido, tipo: 'imagen', metadata: { url, nombre: file.name } });
      } else {
        const res = await api.post(`/chat/conversaciones/${activeConv.id}/mensajes`, { contenido, tipo: 'imagen', metadata: { url, nombre: file.name } });
        setMessages(p => p.some(m => m.id === res.data.id) ? p : [...p, res.data]);
      }
    } catch (err) { console.error('Error subiendo imagen:', err); alert('No se pudo enviar la imagen.'); }
  };

  // ── Send location ──
  const handleSendLocation = () => {
    if (!activeConv) return;
    if (!navigator.geolocation) { alert('Tu navegador no soporta geolocalización.'); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => {
        const contenido = `[ubicacion]${lat},${lng}`;
        const metadata = { lat, lng, label: 'Mi ubicación actual' };
        if (socketRef.current?.connected) {
          socketRef.current.emit('send_message', { conversacion_id: activeConv.id, contenido, tipo: 'ubicacion', metadata });
        } else {
          api.post(`/chat/conversaciones/${activeConv.id}/mensajes`, { contenido, tipo: 'ubicacion', metadata })
            .then(res => setMessages(p => p.some(m => m.id === res.data.id) ? p : [...p, res.data]))
            .catch(err => console.error('Error enviando ubicación:', err));
        }
      },
      (err) => { console.error('Geolocation error:', err); alert('No se pudo obtener tu ubicación. Verifica los permisos.'); },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // ── Typing ──
  const handleTyping = (e) => {
    setNewMsg(e.target.value);
    if (!socketRef.current || !activeConv) return;
    socketRef.current.emit('typing', { conversacion_id: activeConv.id, receiverId: getOtherUserId(activeConv) });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('stop_typing', { conversacion_id: activeConv.id, receiverId: getOtherUserId(activeConv) });
    }, 2000);
  };

  // ── Call actions ──
  const initiateCall = (type) => {
    if (!activeConv || !socketRef.current) return;
    const peerId = getOtherUserId(activeConv);
    const callerName = `${user.nombre} ${user.apellido}`;
    setCallType(type);
    setCallState('outgoing');
    setCallData({ peerId, callerName, conversacion_id: activeConv.id, callType: type });
    socketRef.current.emit('call_request', { conversacion_id: activeConv.id, receiverId: peerId, callType: type, callerName });
  };

  const acceptCall = () => {
    const cd = callDataRef.current;
    if (!cd || !socketRef.current) return;
    socketRef.current.emit('call_accept', { callerId: cd.callerId, conversacion_id: cd.conversacion_id, callType: cd.callType });
  };

  const rejectCall = () => {
    const cd = callDataRef.current;
    if (!cd || !socketRef.current) return;
    socketRef.current.emit('call_reject', { callerId: cd.callerId });
    endCall();
  };

  const hangUp = () => {
    const cd = callDataRef.current;
    if (socketRef.current) {
      const peerId = cd?.callerId || cd?.peerId || (activeConvRef.current ? getOtherUserId(activeConvRef.current) : null);
      if (peerId) socketRef.current.emit('call_end', { peerId });
    }
    endCall();
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(p => !p);
  };

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsVideoOff(p => !p);
  };

  // ── Reservation actions ──
  const handleReservationAction = async (action) => {
    if (!reservaInfo || !activeConv) return;
    try {
      await api.post('/reservas/chat/command', { reservationId: reservaInfo.reserva_id, action });
      try { await refreshUser(); } catch (_) {}
      if (socketRef.current) {
        const msgs = { aceptar: 'Reserva aceptada por el anfitrión.', rechazar: 'Reserva rechazada por el anfitrión.', archivar: 'Publicación archivada por el anfitrión.' };
        if (msgs[action]) socketRef.current.emit('send_message', { conversacion_id: activeConv.id, contenido: msgs[action], tipo: 'texto' });
      }
      const res = await api.get(`/chat/conversaciones/${activeConv.id}/reserva`);
      setReservaInfo(res.data);
      setShowMoreOptions(false);
    } catch (err) { console.error('Error en acción de reserva:', err); }
  };

  const handleCreateReservation = async (e) => {
    e.preventDefault();
    if (!bookingForm.propiedad_id || !bookingForm.fecha_inicio || !bookingForm.fecha_fin) { alert('Por favor completa todos los campos.'); return; }
    try {
      const selectedProp = otherUserProperties.find(p => p.id === parseInt(bookingForm.propiedad_id));
      await api.post('/reservas', { propiedad_id: parseInt(bookingForm.propiedad_id), fecha_inicio: bookingForm.fecha_inicio, fecha_fin: bookingForm.fecha_fin, mensaje: bookingForm.mensaje, num_huespedes: parseInt(bookingForm.num_huespedes) });
      setShowBookingModal(false);
      if (socketRef.current) {
        socketRef.current.emit('send_message', { conversacion_id: activeConv.id, contenido: `Solicitud de reserva: He solicitado reservar "${selectedProp?.titulo || 'Alojamiento'}" del ${bookingForm.fecha_inicio} al ${bookingForm.fecha_fin}.`, tipo: 'texto' });
      }
      const [resRes, msgRes] = await Promise.all([
        api.get(`/chat/conversaciones/${activeConv.id}/reserva`),
        api.get(`/chat/conversaciones/${activeConv.id}/mensajes`)
      ]);
      setReservaInfo(resRes.data);
      setMessages(msgRes.data);
    } catch (err) { alert(err.response?.data?.error || 'Error al solicitar la reserva'); }
  };

  // ── Helpers ──
  const getOtherUserId = (conv) => conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
  const getOtherUserName = (conv) => conv.user1_id === user.id ? `${conv.user2_nombre} ${conv.user2_apellido}` : `${conv.user1_nombre} ${conv.user1_apellido}`;
  const getInitials = (conv) => conv.user1_id === user.id ? `${conv.user2_nombre?.[0] || ''}${conv.user2_apellido?.[0] || ''}` : `${conv.user1_nombre?.[0] || ''}${conv.user1_apellido?.[0] || ''}`;

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr), now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    if (diff === 1) return 'Ayer';
    if (diff < 7) return d.toLocaleDateString('es-CO', { weekday: 'short' });
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });
  };

  const getEstadoBadge = (estado) => {
    const map = { pendiente: { label: 'Pendiente', cls: 'chat-badge-pending' }, aceptada: { label: 'Aceptada', cls: 'chat-badge-accepted' }, rechazada: { label: 'Rechazada', cls: 'chat-badge-rejected' }, cancelada: { label: 'Cancelada', cls: 'chat-badge-cancelled' }, completada: { label: 'Completada', cls: 'chat-badge-completed' } };
    return map[estado] || { label: estado, cls: '' };
  };

  const isSystemMessage = (contenido) => {
    if (!contenido) return false;
    return ['Reserva aceptada', 'Reserva rechazada', 'Publicación archivada', 'Solicitud de reserva', 'SOLICITUD DE RESERVA'].some(k => contenido.includes(k));
  };

  // ── Render bubble content ──
  const renderMessageContent = (msg) => {
    const contenido = msg.contenido || '';
    // Detectar tipo por contenido cuando la migración aún no ha corrido (tipo='texto' por defecto)
    let tipo = msg.tipo || 'texto';
    if (tipo === 'texto' && contenido.startsWith('[imagen]')) tipo = 'imagen';
    if (tipo === 'texto' && contenido.startsWith('[ubicacion]')) tipo = 'ubicacion';

    let meta = msg.metadata;
    if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch (_) { meta = null; } }

    if (tipo === 'imagen') {
      const url = meta?.url || msg.contenido.replace('[imagen]', '');
      return (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt="Imagen enviada" style={{ maxWidth: 200, maxHeight: 180, borderRadius: 8, objectFit: 'cover', display: 'block', cursor: 'pointer' }} onError={e => { e.target.style.display = 'none'; }} />
        </a>
      );
    }

    if (tipo === 'ubicacion') {
      const parts = msg.contenido.replace('[ubicacion]', '').split(',');
      const lat = meta?.lat ?? parseFloat(parts[0] || 0);
      const lng = meta?.lng ?? parseFloat(parts[1] || 0);
      if (!lat || !lng) return <p>📍 Ubicación compartida</p>;
      return <LocationBubble lat={lat} lng={lng} />;
    }

    return <p>{msg.contenido}</p>;
  };

  const isHost = reservaInfo && reservaInfo.host_id === user?.id;
  if (!user) return null;

  return (
    <>
      {/* ── CALL OVERLAY ── */}
      {callState && (
        <div className="chat-call-overlay">
          <div className="chat-call-modal">
            {callType === 'video' && (
              <div className="chat-call-video-area">
                <video ref={remoteVideoRef} autoPlay playsInline className="chat-call-remote-video" />
                <video ref={localVideoRef} autoPlay playsInline muted className="chat-call-local-video" />
              </div>
            )}
            {callType === 'audio' && (
              <div className="chat-call-audio-avatar">
                <div className="chat-call-avatar-ring">
                  {callData && activeConv ? getInitials(activeConv) : callData?.callerName?.slice(0, 2).toUpperCase() || '??'}
                </div>
              </div>
            )}
            <div className="chat-call-info">
              <span className="chat-call-name">
                {callState === 'incoming' ? callData?.callerName || 'Usuario' : (activeConv ? getOtherUserName(activeConv) : '')}
              </span>
              <span className="chat-call-status">
                {callState === 'incoming' && `Llamada de ${callType === 'video' ? 'video' : 'voz'} entrante`}
                {callState === 'outgoing' && 'Llamando...'}
                {callState === 'active' && formatCallDuration(callDuration)}
              </span>
            </div>
            <div className="chat-call-controls">
              {callState === 'incoming' && (
                <>
                  <button className="chat-call-btn chat-call-btn-accept" onClick={acceptCall} title="Aceptar"><Phone size={22} /></button>
                  <button className="chat-call-btn chat-call-btn-reject" onClick={rejectCall} title="Rechazar"><PhoneOff size={22} /></button>
                </>
              )}
              {(callState === 'outgoing' || callState === 'active') && (
                <>
                  {callState === 'active' && (
                    <button className={`chat-call-btn chat-call-btn-mute${isMuted ? ' active' : ''}`} onClick={toggleMute} title={isMuted ? 'Activar mic' : 'Silenciar'}>
                      {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                  )}
                  {callState === 'active' && callType === 'video' && (
                    <button className={`chat-call-btn chat-call-btn-video${isVideoOff ? ' active' : ''}`} onClick={toggleVideo} title={isVideoOff ? 'Activar cámara' : 'Apagar cámara'}>
                      {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                    </button>
                  )}
                  <button className="chat-call-btn chat-call-btn-reject" onClick={hangUp} title="Colgar"><PhoneOff size={22} /></button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FLOATING BUBBLE ── */}
      <button className="chat-fab" onClick={() => { setOpen(!open); if (!open) setActiveConv(null); }} title="Mensajes">
        {open ? <ChevronDown size={26} /> : <MessageCircle size={26} />}
        {!open && unreadTotal > 0 && <span className="chat-fab-badge">{unreadTotal > 9 ? '9+' : unreadTotal}</span>}
      </button>

      {/* ── CHAT WINDOW ── */}
      {open && (
        <div className="chat-widget">
          {activeConv ? (
            <>
              {/* HEADER */}
              <div className="chat-w-header">
                <button className="chat-w-back" onClick={() => { setActiveConv(null); setReservaInfo(null); setShowMoreOptions(false); }}><ArrowLeft size={18} /></button>
                <div className="chat-w-avatar-sm">{getInitials(activeConv)}</div>
                <div className="chat-w-header-info">
                  <span className="chat-w-header-name">{getOtherUserName(activeConv)}</span>
                  {typing === activeConv.id && <span className="chat-w-typing">Escribiendo...</span>}
                </div>
                <div className="chat-w-header-actions">
                  <button className="chat-w-action-btn" onClick={() => initiateCall('audio')} title="Llamada de voz"><Phone size={17} /></button>
                  <button className="chat-w-action-btn" onClick={() => initiateCall('video')} title="Videollamada"><Video size={17} /></button>
                </div>
                <button className="chat-w-close" onClick={() => setOpen(false)}><X size={18} /></button>
              </div>

              {/* MARKETPLACE BAR */}
              {reservaInfo ? (
                <div className="chat-marketplace-bar">
                  <div className="chat-mp-icon"><Home size={18} /></div>
                  <div className="chat-mp-info">
                    <span className="chat-mp-label">HUASI</span>
                    <span className="chat-mp-title">
                      {(() => { const b = getEstadoBadge(reservaInfo.estado); return <><span className={`chat-mp-status ${b.cls}`}>{b.label}</span>{' - '}{reservaInfo.titulo}</>; })()}
                    </span>
                  </div>
                  <div className="chat-mp-actions" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {isHost && reservaInfo.estado === 'pendiente' ? (
                      <>
                        <button className="chat-mp-btn" onClick={() => handleReservationAction('aceptar')} style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 10px', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: 8, cursor: 'pointer' }}>Aceptar</button>
                        <button className="chat-mp-btn" onClick={() => handleReservationAction('rechazar')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: 8, cursor: 'pointer' }}>Rechazar</button>
                      </>
                    ) : (
                      <button className="chat-mp-btn chat-mp-btn-detail" onClick={() => navigate(`/propiedad/${reservaInfo.propiedad_id}`)}>Ver detalles</button>
                    )}
                    <div className="chat-mp-more-wrap" ref={moreOptionsRef}>
                      <button className="chat-mp-btn chat-mp-btn-more" onClick={() => setShowMoreOptions(!showMoreOptions)}>Más</button>
                      {showMoreOptions && (
                        <div className="chat-mp-dropdown">
                          <button className="chat-mp-drop-item detail" onClick={() => { navigate(`/propiedad/${reservaInfo.propiedad_id}`); setShowMoreOptions(false); }}><Eye size={15} /> Ver publicación</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                otherUserProperties.length > 0 && (
                  <div className="chat-marketplace-bar">
                    <div className="chat-mp-icon"><Home size={18} /></div>
                    <div className="chat-mp-info">
                      <span className="chat-mp-label">Alojamiento disponible</span>
                      <span className="chat-mp-title" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{otherUserProperties[0].titulo}</span>
                    </div>
                    <div className="chat-mp-actions">
                      <button className="chat-mp-btn" style={{ background: 'var(--ucc-green)', color: 'white', border: 'none', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: 8, cursor: 'pointer' }} onClick={() => setShowBookingModal(true)}>Solicitar Reserva</button>
                    </div>
                  </div>
                )
              )}

              {/* MESSAGES / BOOKING */}
              {showBookingModal ? (
                <div className="chat-w-messages" style={{ background: 'var(--bg-card)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 'bold', fontSize: '1rem', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={18} /><span>Solicitar Reserva</span>
                  </h4>
                  <form onSubmit={handleCreateReservation} style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto' }}>
                    {otherUserProperties.length > 1 ? (
                      <div className="form-group" style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Alojamiento</label>
                        <select className="form-control" style={{ padding: '8px 12px', fontSize: '0.85rem' }} value={bookingForm.propiedad_id} onChange={e => setBookingForm(p => ({ ...p, propiedad_id: e.target.value }))} required>
                          {otherUserProperties.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.82rem', color: 'var(--primary)', marginBottom: 8, background: 'var(--bg)', padding: 10, borderRadius: 8 }}><strong>Alojamiento:</strong> {otherUserProperties[0]?.titulo}</div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Llegada</label>
                        <input type="date" className="form-control" min={new Date().toISOString().split('T')[0]} style={{ padding: '8px 12px', fontSize: '0.82rem' }} value={bookingForm.fecha_inicio} onChange={e => setBookingForm(p => ({ ...p, fecha_inicio: e.target.value }))} required />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Salida</label>
                        <input type="date" className="form-control" min={bookingForm.fecha_inicio || new Date().toISOString().split('T')[0]} style={{ padding: '8px 12px', fontSize: '0.82rem' }} value={bookingForm.fecha_fin} onChange={e => setBookingForm(p => ({ ...p, fecha_fin: e.target.value }))} required />
                      </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Huéspedes</label>
                      <input type="number" className="form-control" min="1" max={otherUserProperties.find(p => p.id === parseInt(bookingForm.propiedad_id))?.capacidad || 4} style={{ padding: '8px 12px', fontSize: '0.82rem' }} value={bookingForm.num_huespedes} onChange={e => setBookingForm(p => ({ ...p, num_huespedes: parseInt(e.target.value) || 1 }))} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Mensaje</label>
                      <textarea className="form-control" rows="2" style={{ padding: '8px 12px', fontSize: '0.82rem', minHeight: 60 }} value={bookingForm.mensaje} onChange={e => setBookingForm(p => ({ ...p, mensaje: e.target.value }))} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 10 }}>
                      <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', borderRadius: 8 }} onClick={() => setShowBookingModal(false)}>Cancelar</button>
                      <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', borderRadius: 8, background: 'var(--ucc-green)' }}>Enviar</button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="chat-w-messages">
                  {messages.map(msg => {
                    const isSys = isSystemMessage(msg.contenido);
                    const isMine = msg.sender_id === user.id;
                    const tipo = msg.tipo || 'texto';
                    return (
                      <div key={msg.id} className={`chat-w-bubble ${isSys ? 'system' : isMine ? 'mine' : 'other'}${tipo !== 'texto' ? ` bubble-${tipo}` : ''}`}>
                        {renderMessageContent(msg)}
                        <span className="chat-w-time">
                          {new Date(msg.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* INPUT BAR */}
              {!showBookingModal && (
                <div className="chat-w-input-bar">
                  {/* Hidden file inputs */}
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) { handleImageUpload(e.target.files[0]); e.target.value = ''; } }} />
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) { handleImageUpload(e.target.files[0]); e.target.value = ''; } }} />

                  <div className="chat-input-actions">
                    <button type="button" className="chat-input-icon-btn" onClick={() => fileInputRef.current?.click()} title="Enviar imagen"><Image size={18} /></button>
                    <button type="button" className="chat-input-icon-btn" onClick={() => cameraInputRef.current?.click()} title="Tomar foto"><Camera size={18} /></button>
                    <button type="button" className="chat-input-icon-btn" onClick={handleSendLocation} title="Compartir ubicación"><MapPin size={18} /></button>
                  </div>

                  {/* Texto + enviar */}
                  <form onSubmit={handleSend} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="text"
                      className="chat-text-input"
                      placeholder="Escribe un mensaje..."
                      value={newMsg}
                      onChange={handleTyping}
                      autoFocus
                    />
                    <button type="submit" className="chat-send-btn" disabled={!newMsg.trim()}><Send size={18} /></button>
                  </form>
                </div>
              )}
            </>
          ) : (
            /* CONVERSATION LIST */
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
