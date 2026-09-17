import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import {
  Send, MessageCircle, X, ArrowLeft, ChevronDown, Home, Eye,
  MoreHorizontal, Check, XCircle, Archive, Calendar,
  Phone, Video, Image, MapPin, Camera, PhoneOff, VideoOff, Mic, MicOff
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../api';
import { notifyChatMessage } from '../utils/notifications';

// Fix leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ============ WebRTC STUN config ============
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export default function ChatWidget() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Chat state
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

  // ============ LLAMADA (WebRTC) state ============
  const [callState, setCallState] = useState(null);
  // null | 'outgoing' | 'incoming' | 'active'
  const [callType, setCallType] = useState('audio'); // 'audio' | 'video'
  const [callData, setCallData] = useState(null);    // { callerId, callerName, conversacion_id, callType }
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Refs
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

  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  // ============ CALL TIMER ============
  useEffect(() => {
    if (callState === 'active') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(callTimerRef.current);
      setCallDuration(0);
    }
    return () => clearInterval(callTimerRef.current);
  }, [callState]);

  const formatCallDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ============ Listen for external "open-chat" events ============
  useEffect(() => {
    const handleOpenChat = (e) => {
      const targetUserId = e.detail?.userId;
      if (!targetUserId || !user) return;
      setOpen(true);
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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreOptionsRef.current && !moreOptionsRef.current.contains(e.target)) {
        setShowMoreOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ============ WebRTC helpers ============
  const createPeerConnection = useCallback((peerId) => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc_ice_candidate', {
          peerId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall();
      }
    };

    return pc;
  }, []);

  const getLocalStream = async (type) => {
    const constraints = {
      audio: true,
      video: type === 'video' ? { facingMode: 'user' } : false
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  };

  const endCall = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallState(null);
    setCallData(null);
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  // ============ Socket.IO connection ============
  useEffect(() => {
    if (!user) return;

    const getCookie = (name) => {
      const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
      return match ? match[1] : '';
    };

    const token = getCookie('stayu_token') || getCookie('stayu_admin_token') ||
      localStorage.getItem('stayu_token') || localStorage.getItem('token') || '';

    const socketUrl = import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : undefined);

    const socket = io(socketUrl, {
      path: '/chat-socket',
      auth: { token },
      withCredentials: true
    });

    socketRef.current = socket;

    // ---- Chat messages ----
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
          api.get('/chat/conversaciones')
            .then(res => setConversaciones(res.data))
            .catch(err => console.error('Error loading conversations:', err));
          return prev;
        }
        return prev.map(c => c.id === msg.conversacion_id
          ? {
            ...c,
            ultimo_mensaje: msg.tipo === 'imagen' ? 'Imagen' : msg.tipo === 'ubicacion' ? 'Ubicación compartida' : msg.contenido,
            ultimo_mensaje_fecha: msg.created_at,
            no_leidos: (msg.sender_id !== user.id && !isActive) ? (c.no_leidos || 0) + 1 : c.no_leidos
          }
          : c
        ).sort((a, b) => new Date(b.ultimo_mensaje_fecha || b.updated_at) - new Date(a.ultimo_mensaje_fecha || a.updated_at));
      });

      if (msg.sender_id !== user.id && (!isActive || document.hidden)) {
        setUnreadTotal(prev => prev + 1);
        const directSender = msg.sender_nombre ? `${msg.sender_nombre} ${msg.sender_apellido || ''}`.trim() : '';
        const previewText = msg.tipo === 'imagen' ? 'Te envió una imagen' :
          msg.tipo === 'ubicacion' ? 'Compartió su ubicación' : msg.contenido;
        if (directSender) {
          notifyChatMessage({ senderName: directSender, messageText: previewText, conversacionId: msg.conversacion_id });
        }
      }
    });

    socket.on('new_property_published', (propertyData) => {
      window.dispatchEvent(new CustomEvent('huasi:property-published', { detail: propertyData }));
    });

    socket.on('user_typing', (data) => setTyping(data.conversacion_id));
    socket.on('user_stop_typing', (data) => {
      if (data?.conversacion_id) {
        setTyping(prev => prev === data.conversacion_id ? false : prev);
      } else {
        setTyping(false);
      }
    });

    // ---- WebRTC signaling ----
    socket.on('call_incoming', (data) => {
      setCallData(data);
      setCallType(data.callType || 'audio');
      setCallState('incoming');
    });

    socket.on('call_accepted', async (data) => {
      // Outgoing call was accepted — create offer
      const peerId = data.receiverId;
      try {
        const stream = await getLocalStream(callType);
        const pc = createPeerConnection(peerId);
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_offer', { peerId, offer });
        setCallState('active');
      } catch (err) {
        console.error('Error creating WebRTC offer:', err);
        endCall();
      }
    });

    socket.on('call_rejected', () => {
      endCall();
    });

    socket.on('call_ended', () => {
      endCall();
    });

    socket.on('webrtc_offer', async (data) => {
      // Incoming offer after accepting call
      const { offer, fromId } = data;
      try {
        const stream = await getLocalStream(callType);
        const pc = createPeerConnection(fromId);
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', { peerId: fromId, answer });
        setCallState('active');
      } catch (err) {
        console.error('Error handling WebRTC offer:', err);
        endCall();
      }
    });

    socket.on('webrtc_answer', async (data) => {
      const { answer } = data;
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error('Error handling WebRTC answer:', err);
      }
    });

    socket.on('webrtc_ice_candidate', async (data) => {
      try {
        if (peerConnectionRef.current && data.candidate) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    });

    return () => socket.disconnect();
  }, [user]);

  // Load conversations when opens
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
      api.get('/chat/no-leidos').then(res => setUnreadTotal(res.data.no_leidos)).catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Load messages + reservation info when selecting conversation
  useEffect(() => {
    if (!activeConv) {
      setReservaInfo(null);
      setOtherUserProperties([]);
      setShowBookingModal(false);
      return;
    }

    const fetchMsgs = () => {
      api.get(`/chat/conversaciones/${activeConv.id}/mensajes`).then(res => setMessages(res.data)).catch(() => {});
    };
    fetchMsgs();
    const pollInterval = setInterval(fetchMsgs, 2500);

    api.get(`/chat/conversaciones/${activeConv.id}/reserva`)
      .then(res => setReservaInfo(res.data))
      .catch(() => setReservaInfo(null));

    const otherId = getOtherUserId(activeConv);
    api.get(`/propiedades?host_id=${otherId}`)
      .then(res => {
        const props = res.data.propiedades || [];
        setOtherUserProperties(props);
        if (props.length > 0) setBookingForm(prev => ({ ...prev, propiedad_id: props[0].id }));
      })
      .catch(() => setOtherUserProperties([]));

    if (socketRef.current) {
      socketRef.current.emit('mark_read', { conversacion_id: activeConv.id });
    }
    setConversaciones(prev => prev.map(c => c.id === activeConv.id ? { ...c, no_leidos: 0 } : c));

    return () => clearInterval(pollInterval);
  }, [activeConv?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ============ SEND TEXT MESSAGE ============
  const handleSend = async (e) => {
    e.preventDefault();
    const content = newMsg.trim();
    if (!content || !activeConv) return;
    setNewMsg('');

    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', {
        conversacion_id: activeConv.id,
        contenido: content,
        tipo: 'texto'
      });
      socketRef.current.emit('stop_typing', {
        conversacion_id: activeConv.id,
        receiverId: getOtherUserId(activeConv)
      });
    } else {
      try {
        const res = await api.post(`/chat/conversaciones/${activeConv.id}/mensajes`, { contenido: content, tipo: 'texto' });
        setMessages(prev => prev.some(m => m.id === res.data.id) ? prev : [...prev, res.data]);
      } catch (err) {
        console.error('Error enviando mensaje por API:', err);
      }
    }
  };

  // ============ SEND IMAGE ============
  const handleImageUpload = async (file) => {
    if (!file || !activeConv) return;
    const formData = new FormData();
    formData.append('imagen', file);

    try {
      const uploadRes = await api.post('/chat/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const imageUrl = uploadRes.data.url;
      const contenido = `[imagen]${imageUrl}`;

      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', {
          conversacion_id: activeConv.id,
          contenido,
          tipo: 'imagen',
          metadata: { url: imageUrl, nombre: file.name }
        });
      } else {
        const res = await api.post(`/chat/conversaciones/${activeConv.id}/mensajes`, {
          contenido,
          tipo: 'imagen',
          metadata: { url: imageUrl, nombre: file.name }
        });
        setMessages(prev => prev.some(m => m.id === res.data.id) ? prev : [...prev, res.data]);
      }
    } catch (err) {
      console.error('Error subiendo imagen:', err);
      alert('No se pudo enviar la imagen. Intenta de nuevo.');
    }
  };

  // ============ SEND LOCATION ============
  const handleSendLocation = () => {
    if (!activeConv) return;
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        const contenido = `[ubicacion]${lat},${lng}`;
        const metadata = { lat, lng, label: 'Mi ubicación actual' };

        if (socketRef.current?.connected) {
          socketRef.current.emit('send_message', {
            conversacion_id: activeConv.id,
            contenido,
            tipo: 'ubicacion',
            metadata
          });
        } else {
          api.post(`/chat/conversaciones/${activeConv.id}/mensajes`, {
            contenido,
            tipo: 'ubicacion',
            metadata
          }).then(res => {
            setMessages(prev => prev.some(m => m.id === res.data.id) ? prev : [...prev, res.data]);
          }).catch(err => console.error('Error enviando ubicación:', err));
        }
      },
      (err) => {
        console.error('Error de geolocalización:', err);
        alert('No se pudo obtener tu ubicación. Verifica los permisos del navegador.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // ============ CALL ACTIONS ============
  const initiateCall = async (type) => {
    if (!activeConv || !socketRef.current) return;
    const peerId = getOtherUserId(activeConv);
    const callerName = `${user.nombre} ${user.apellido}`;
    setCallType(type);
    setCallState('outgoing');
    setCallData({ peerId, callerName, conversacion_id: activeConv.id, callType: type });
    socketRef.current.emit('call_request', {
      conversacion_id: activeConv.id,
      receiverId: peerId,
      callType: type,
      callerName
    });
  };

  const acceptCall = async () => {
    if (!callData || !socketRef.current) return;
    socketRef.current.emit('call_accept', {
      callerId: callData.callerId,
      conversacion_id: callData.conversacion_id,
      callType: callData.callType
    });
    // webrtc_offer will arrive next and set state to 'active'
  };

  const rejectCall = () => {
    if (!callData || !socketRef.current) return;
    socketRef.current.emit('call_reject', { callerId: callData.callerId });
    endCall();
  };

  const hangUp = () => {
    if (!callData || !socketRef.current) return;
    const peerId = callData.callerId || callData.peerId || getOtherUserId(activeConv);
    socketRef.current.emit('call_end', { peerId });
    endCall();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsMuted(prev => !prev);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsVideoOff(prev => !prev);
    }
  };

  // ============ TYPING ============
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

  // ============ RESERVATION ACTIONS ============
  const handleReservationAction = async (action) => {
    if (!reservaInfo || !activeConv) return;
    try {
      await api.post('/reservas/chat/command', { reservationId: reservaInfo.reserva_id, action });
      try { await refreshUser(); } catch (err) { console.error('Error refreshing user:', err); }
      if (socketRef.current) {
        const systemMsgMap = {
          aceptar: 'Reserva aceptada por el anfitrión.',
          rechazar: 'Reserva rechazada por el anfitrión.',
          archivar: 'Publicación archivada por el anfitrión.'
        };
        if (systemMsgMap[action]) {
          socketRef.current.emit('send_message', { conversacion_id: activeConv.id, contenido: systemMsgMap[action], tipo: 'texto' });
        }
      }
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
      if (socketRef.current) {
        socketRef.current.emit('send_message', {
          conversacion_id: activeConv.id,
          contenido: `Solicitud de reserva: He solicitado reservar "${selectedProp?.titulo || 'Alojamiento'}" del ${bookingForm.fecha_inicio} al ${bookingForm.fecha_fin}.`,
          tipo: 'texto'
        });
      }
      const res = await api.get(`/chat/conversaciones/${activeConv.id}/reserva`);
      setReservaInfo(res.data);
      const msgRes = await api.get(`/chat/conversaciones/${activeConv.id}/mensajes`);
      setMessages(msgRes.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al solicitar la reserva');
    }
  };

  // ============ HELPERS ============
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

  const isSystemMessage = (contenido) => {
    if (!contenido) return false;
    return contenido.includes('Reserva aceptada') ||
      contenido.includes('Reserva rechazada') ||
      contenido.includes('Publicación archivada') ||
      contenido.includes('Solicitud de reserva') ||
      contenido.includes('SOLICITUD DE RESERVA');
  };

  // ============ RENDER MESSAGE BUBBLE ============
  const renderMessageContent = (msg) => {
    const tipo = msg.tipo || 'texto';
    const meta = msg.metadata || null;

    if (tipo === 'imagen') {
      const url = meta?.url || msg.contenido.replace('[imagen]', '');
      return (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            alt="Imagen enviada"
            style={{
              maxWidth: '200px',
              maxHeight: '180px',
              borderRadius: '8px',
              objectFit: 'cover',
              display: 'block',
              cursor: 'pointer'
            }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </a>
      );
    }

    if (tipo === 'ubicacion') {
      const lat = meta?.lat || parseFloat(msg.contenido.split(',')[0]?.replace('[ubicacion]', '') || 0);
      const lng = meta?.lng || parseFloat(msg.contenido.split(',')[1] || 0);
      const gmapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

      return (
        <div className="chat-location-bubble">
          <div style={{ height: '130px', width: '100%', borderRadius: '8px', overflow: 'hidden', marginBottom: '6px' }}>
            <MapContainer
              center={[lat, lng]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              dragging={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
              attributionControl={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[lat, lng]}>
                <Popup>Mi ubicación</Popup>
              </Marker>
            </MapContainer>
          </div>
          <a
            href={gmapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="chat-location-link"
          >
            <MapPin size={12} />
            <span>Abrir en Google Maps</span>
          </a>
        </div>
      );
    }

    // texto normal
    return <p>{msg.contenido}</p>;
  };

  const isHost = reservaInfo && reservaInfo.host_id === user?.id;

  if (!user) return null;

  return (
    <>
      {/* ============ CALL OVERLAY ============ */}
      {callState && (
        <div className="chat-call-overlay">
          <div className="chat-call-modal">
            {/* Video elements (hidden if audio-only) */}
            {callType === 'video' && (
              <div className="chat-call-video-area">
                <video ref={remoteVideoRef} autoPlay playsInline className="chat-call-remote-video" />
                <video ref={localVideoRef} autoPlay playsInline muted className="chat-call-local-video" />
              </div>
            )}

            {callType === 'audio' && (
              <div className="chat-call-audio-avatar">
                <div className="chat-call-avatar-ring">
                  {callData && activeConv ? getInitials(activeConv) : '??'}
                </div>
              </div>
            )}

            <div className="chat-call-info">
              <span className="chat-call-name">
                {callState === 'incoming'
                  ? callData?.callerName || 'Usuario'
                  : activeConv ? getOtherUserName(activeConv) : ''}
              </span>
              <span className="chat-call-status">
                {callState === 'incoming' && `Llamada de ${callType === 'video' ? 'video' : 'voz'} entrante`}
                {callState === 'outgoing' && 'Llamando...'}
                {callState === 'active' && formatCallDuration(callDuration)}
              </span>
            </div>

            <div className="chat-call-controls">
              {/* Incoming: accept / reject */}
              {callState === 'incoming' && (
                <>
                  <button className="chat-call-btn chat-call-btn-accept" onClick={acceptCall} title="Aceptar">
                    <Phone size={22} />
                  </button>
                  <button className="chat-call-btn chat-call-btn-reject" onClick={rejectCall} title="Rechazar">
                    <PhoneOff size={22} />
                  </button>
                </>
              )}

              {/* Outgoing / Active */}
              {(callState === 'outgoing' || callState === 'active') && (
                <>
                  {callState === 'active' && (
                    <button
                      className={`chat-call-btn chat-call-btn-mute ${isMuted ? 'active' : ''}`}
                      onClick={toggleMute}
                      title={isMuted ? 'Activar micrófono' : 'Silenciar'}
                    >
                      {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                  )}
                  {callState === 'active' && callType === 'video' && (
                    <button
                      className={`chat-call-btn chat-call-btn-video ${isVideoOff ? 'active' : ''}`}
                      onClick={toggleVideo}
                      title={isVideoOff ? 'Activar cámara' : 'Apagar cámara'}
                    >
                      {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                    </button>
                  )}
                  <button className="chat-call-btn chat-call-btn-reject" onClick={hangUp} title="Colgar">
                    <PhoneOff size={22} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ FLOATING BUBBLE ============ */}
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

      {/* ============ CHAT WINDOW ============ */}
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

                {/* ---- Call action buttons in header ---- */}
                <div className="chat-w-header-actions">
                  <button
                    className="chat-w-action-btn"
                    onClick={() => initiateCall('audio')}
                    title="Llamada de voz"
                  >
                    <Phone size={17} />
                  </button>
                  <button
                    className="chat-w-action-btn"
                    onClick={() => initiateCall('video')}
                    title="Videollamada"
                  >
                    <Video size={17} />
                  </button>
                </div>

                <button className="chat-w-close" onClick={() => setOpen(false)}><X size={18} /></button>
              </div>

              {/* Marketplace / reservation bar */}
              {reservaInfo ? (
                <div className="chat-marketplace-bar">
                  <div className="chat-mp-icon"><Home size={18} /></div>
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
                      <button className="chat-mp-btn chat-mp-btn-more" onClick={() => setShowMoreOptions(!showMoreOptions)}>
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
                    <div className="chat-mp-icon"><Home size={18} /></div>
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

              {/* Messages or Booking Form */}
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
                        <input type="date" className="form-control" min={new Date().toISOString().split('T')[0]} style={{ padding: '8px 12px', fontSize: '0.82rem' }} value={bookingForm.fecha_inicio} onChange={e => setBookingForm(prev => ({ ...prev, fecha_inicio: e.target.value }))} required />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Salida</label>
                        <input type="date" className="form-control" min={bookingForm.fecha_inicio || new Date().toISOString().split('T')[0]} style={{ padding: '8px 12px', fontSize: '0.82rem' }} value={bookingForm.fecha_fin} onChange={e => setBookingForm(prev => ({ ...prev, fecha_fin: e.target.value }))} required />
                      </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: '0px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Huéspedes</label>
                      <input type="number" className="form-control" min="1" max={otherUserProperties.find(p => p.id === parseInt(bookingForm.propiedad_id))?.capacidad || 4} style={{ padding: '8px 12px', fontSize: '0.82rem' }} value={bookingForm.num_huespedes} onChange={e => setBookingForm(prev => ({ ...prev, num_huespedes: parseInt(e.target.value) || 1 }))} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: '0px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Mensaje</label>
                      <textarea className="form-control" rows="2" style={{ padding: '8px 12px', fontSize: '0.82rem', minHeight: '60px' }} value={bookingForm.mensaje} onChange={e => setBookingForm(prev => ({ ...prev, mensaje: e.target.value }))} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '10px' }}>
                      <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', borderRadius: '8px' }} onClick={() => setShowBookingModal(false)}>Cancelar</button>
                      <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', borderRadius: '8px', background: 'var(--ucc-green)' }}>Enviar</button>
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
                        className={`chat-w-bubble ${isSys ? 'system' : isMine ? 'mine' : 'other'} ${msg.tipo !== 'texto' && msg.tipo !== undefined ? `bubble-${msg.tipo}` : ''}`}
                      >
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

              {/* ============ INPUT BAR ============ */}
              {!showBookingModal && (
                <div className="chat-w-input-bar">
                  {/* Hidden file inputs */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => { if (e.target.files?.[0]) { handleImageUpload(e.target.files[0]); e.target.value = ''; } }}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={e => { if (e.target.files?.[0]) { handleImageUpload(e.target.files[0]); e.target.value = ''; } }}
                  />

                  {/* Action icons left of input */}
                  <div className="chat-input-actions">
                    <button
                      type="button"
                      className="chat-input-icon-btn"
                      onClick={() => fileInputRef.current?.click()}
                      title="Enviar imagen"
                    >
                      <Image size={18} />
                    </button>
                    <button
                      type="button"
                      className="chat-input-icon-btn"
                      onClick={() => cameraInputRef.current?.click()}
                      title="Tomar foto"
                    >
                      <Camera size={18} />
                    </button>
                    <button
                      type="button"
                      className="chat-input-icon-btn"
                      onClick={handleSendLocation}
                      title="Compartir ubicación"
                    >
                      <MapPin size={18} />
                    </button>
                  </div>

                  <form className="chat-w-input" onSubmit={handleSend} style={{ flex: 1 }}>
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
                </div>
              )}
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
