import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import {
  Send, MessageCircle, X, ArrowLeft, ChevronDown, Home, Eye,
  Phone, Video, Image, MapPin, Camera,
  PhoneOff, VideoOff, Mic, MicOff, Search, Download,
  Check, CheckCheck, Clock, Play, Pause, Trash2, Volume2
} from 'lucide-react';
import api from '../api';
import { notifyChatMessage, notifyIncomingCall, startRingtone, stopRingtone } from '../utils/notifications';

// ── Leaflet (lazy — sólo se carga si hay mensajes de ubicación) ──
let LeafletLoaded = false;
let MapContainer, TileLayer, Marker, L;

async function loadLeaflet() {
  if (LeafletLoaded) return true;
  try {
    const rl = await import('react-leaflet');
    MapContainer = rl.MapContainer;
    TileLayer = rl.TileLayer;
    Marker = rl.Marker;
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

// ── WebRTC STUN & TURN servers (Conexión 100% garantizada en 4G/5G y NAT móvil) ──
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
};

// ── Control de reproducción concurrente de notas de voz ──
let globalActiveAudio = null;

// ── Audio message bubble — reproductor sobrio tipo WhatsApp con iconos SVG ──
function AudioMessageBubble({ url, duration = 0, isMine }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    const onLoaded = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setAudioDuration(Math.round(audio.duration));
      }
    };
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnd = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (globalActiveAudio === audio) globalActiveAudio = null;
    };
    const onPause = () => {
      setIsPlaying(false);
      if (globalActiveAudio === audio) globalActiveAudio = null;
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.pause();
      if (globalActiveAudio === audio) globalActiveAudio = null;
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('pause', onPause);
    };
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (globalActiveAudio && globalActiveAudio !== audioRef.current) {
        try { globalActiveAudio.pause(); } catch {
          // Audio ya pausado o desvinculado
        }
      }
      globalActiveAudio = audioRef.current;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => console.warn('Error al reproducir audio:', err));
    }
  };

  const handleSeek = (e) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    if (audioRef.current && !isNaN(t)) audioRef.current.currentTime = t;
  };

  const formatSecs = (sec) => {
    const s = Math.floor(sec || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${String(rem).padStart(2, '0')}`;
  };

  const maxVal = audioDuration > 0 ? audioDuration : (currentTime > 0 ? currentTime : 1);
  const currentVal = Math.min(currentTime, maxVal);

  return (
    <div className={`chat-audio-player ${isMine ? 'mine' : 'other'}`}>
      <button
        type="button"
        className="chat-audio-play-btn"
        onClick={togglePlay}
        title={isPlaying ? 'Pausar nota de voz' : 'Reproducir nota de voz'}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
      </button>

      <div className="chat-audio-body">
        <input
          type="range"
          min="0"
          max={maxVal}
          step="0.1"
          value={currentVal}
          onChange={handleSeek}
          className="chat-audio-slider"
        />
        <div className="chat-audio-meta">
          <span className="chat-audio-time">
            {formatSecs(isPlaying || currentTime > 0 ? currentTime : audioDuration)}
          </span>
          <Volume2 size={12} className="chat-audio-vol-icon" />
        </div>
      </div>
    </div>
  );
}

// ── Location bubble — mini mapa estático sin dependencias ──
function LocationBubble({ lat, lng, isMine = false }) {
  const [leafletReady, setLeafletReady] = useState(false);
  const gmapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const osmStaticUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=210x130&markers=${lat},${lng}`;

  useEffect(() => {
    loadLeaflet().then(ok => setLeafletReady(ok));
  }, []);

  return (
    <div className={`chat-location-bubble ${isMine ? 'mine' : 'other'}`}>
      {leafletReady && MapContainer ? (
        <div style={{ height: 130, width: 210, borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
          <MapContainer
            center={[lat, lng]} zoom={15}
            scrollWheelZoom={false} dragging={false} zoomControl={false}
            attributionControl={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[lat, lng]} />
          </MapContainer>
        </div>
      ) : (
        <a href={gmapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
          <img
            src={osmStaticUrl}
            alt="Mapa de ubicación"
            style={{ width: 210, height: 130, borderRadius: 8, display: 'block', objectFit: 'cover', marginBottom: 6 }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        </a>
      )}
      <a href={gmapsUrl} target="_blank" rel="noopener noreferrer" className={`chat-location-link ${isMine ? 'mine' : 'other'}`}>
        <MapPin size={13} />
        <span>Abrir en Google Maps</span>
      </a>
    </div>
  );
}

export default function ChatWidget({ isFullPage = false }) {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── Helpers ──
  const getOtherUserId = useCallback((conv) => {
    if (!conv || !user) return null;
    return conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
  }, [user]);

  const getOtherUserName = useCallback((conv) => {
    if (!conv || !user) return '';
    return conv.user1_id === user.id ? `${conv.user2_nombre} ${conv.user2_apellido}` : `${conv.user1_nombre} ${conv.user1_apellido}`;
  }, [user]);

  const getInitials = useCallback((conv) => {
    if (!conv || !user) return '';
    return conv.user1_id === user.id ? `${conv.user2_nombre?.[0] || ''}${conv.user2_apellido?.[0] || ''}` : `${conv.user1_nombre?.[0] || ''}${conv.user1_apellido?.[0] || ''}`;
  }, [user]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr), now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    if (diff === 1) return 'Ayer';
    if (diff < 7) return d.toLocaleDateString('es-CO', { weekday: 'short' });
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });
  };

  // ── Chat state ──
  const [open, setOpen] = useState(isFullPage);
  const [conversaciones, setConversaciones] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [typing, setTyping] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
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

  // ── Voice Recording State & Refs ──
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const recordingStreamRef = useRef(null);

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
  const remoteAudioRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const callTimerRef = useRef(null);
  const callTimeoutRef = useRef(null);
  // ── Refs para evitar stale closures en handlers de socket ──
  const callTypeRef = useRef('audio');
  const callDataRef = useRef(null);
  const callStateRef = useRef(null);

  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);
  useEffect(() => { callTypeRef.current = callType; }, [callType]);
  useEffect(() => { callDataRef.current = callData; }, [callData]);
  useEffect(() => { callStateRef.current = callState; }, [callState]);



  // Cerrar visor de imagen con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedImage(null);
    };
    if (selectedImage) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage]);

  // ── Call timer ──
  useEffect(() => {
    if (callState === 'active') {
      callTimerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);
      return () => clearInterval(callTimerRef.current);
    }
  }, [callState]);

  const formatCallDuration = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const formatRecordingTime = (sec) => {
    const s = Math.floor(sec || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${String(rem).padStart(2, '0')}`;
  };

  // ── Limpieza de grabador de voz al desmontar ──
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // ── Auto-select conversation via URL search params (?user=id o ?conv=id) ──
  useEffect(() => {
    if (!user) return;
    const targetUserId = searchParams?.get('user');
    const targetConvId = searchParams?.get('conv') || searchParams?.get('conversacion');
    if (targetUserId) {
      api.post('/chat/conversaciones', { otro_usuario_id: parseInt(targetUserId) })
        .then(res => {
          const convId = res.data.conversacion_id;
          return api.get('/chat/conversaciones').then(r => {
            setConversaciones(r.data);
            const found = r.data.find(c => c.id === convId);
            if (found) {
              setActiveConv(found);
              setOpen(true);
            }
          });
        })
        .catch(err => console.error('Error opening target chat by user:', err));
    } else if (targetConvId) {
      api.get('/chat/conversaciones').then(r => {
        setConversaciones(r.data);
        const found = r.data.find(c => String(c.id) === String(targetConvId));
        if (found) {
          setActiveConv(found);
          setOpen(true);
        }
      }).catch(() => {});
    }
  }, [user, searchParams]);

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
    stopRingtone();
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current?.getTracks().forEach(t => t.stop());
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setCallState(null);
    setCallData(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  const getLocalStream = async (type) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: type === 'video' ? { facingMode: 'user', width: 640, height: 480 } : false
    });
    localStreamRef.current = stream;
    if (localVideoRef.current && type === 'video') localVideoRef.current.srcObject = stream;
    return stream;
  };

  const flushCandidates = async (pc) => {
    while (pendingCandidatesRef.current && pendingCandidatesRef.current.length > 0) {
      const cand = pendingCandidatesRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.warn('Error aplicando candidato ICE en cola:', err);
      }
    }
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
      const stream = (e.streams && e.streams[0]) ? e.streams[0] : new MediaStream([e.track]);
      remoteStreamRef.current = stream;
      if (callTypeRef.current === 'audio') {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
          remoteAudioRef.current.play?.().catch(() => {});
        }
      } else {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.play?.().catch(() => {});
        }
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') endCall();
    };
    return pc;
  }, [endCall]);

  // Sincronizar streams remotos y locales con los elementos de audio/video cuando cambie el estado o tipo de llamada
  useEffect(() => {
    if (remoteStreamRef.current) {
      if (callType === 'audio' && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
        remoteAudioRef.current.play?.().catch(() => {});
      }
      if (callType === 'video' && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.play?.().catch(() => {});
      }
    }
    if (callType === 'video' && localStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [callState, callType]);

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
      const isActive = currentConv && String(currentConv.id) === String(msg.conversacion_id);

      if (isActive) {
        if (msg.sender_id !== user.id) {
          socket.emit('mark_read', { conversacion_id: msg.conversacion_id });
          api.put(`/chat/conversaciones/${msg.conversacion_id}/leer`).catch(() => {});
        }
        setMessages(prev => prev.some(m => String(m.id) === String(msg.id)) ? prev : [...prev, msg]);
      } else if (msg.sender_id !== user.id) {
        socket.emit('message_delivered', { messageId: msg.id, conversacion_id: msg.conversacion_id });
      }

      setConversaciones(prev => {
        const exists = prev.some(c => String(c.id) === String(msg.conversacion_id));
        if (!exists) {
          api.get('/chat/conversaciones').then(r => setConversaciones(r.data)).catch(() => {});
          return prev;
        }
        const preview = msg.tipo === 'imagen' ? 'Foto' : msg.tipo === 'audio' ? 'Nota de voz' : msg.tipo === 'ubicacion' ? 'Ubicación' : msg.contenido;
        return prev.map(c => String(c.id) === String(msg.conversacion_id)
          ? { ...c, ultimo_mensaje: preview, ultimo_mensaje_fecha: msg.created_at, no_leidos: (msg.sender_id !== user.id && !isActive) ? (c.no_leidos || 0) + 1 : c.no_leidos }
          : c
        ).sort((a, b) => new Date(b.ultimo_mensaje_fecha || b.updated_at) - new Date(a.ultimo_mensaje_fecha || a.updated_at));
      });

      if (msg.sender_id !== user.id && (!isActive || document.hidden)) {
        setUnreadTotal(p => p + 1);
        const senderName = msg.sender_nombre ? `${msg.sender_nombre} ${msg.sender_apellido || ''}`.trim() : 'Estudiante HUASI';
        const preview = msg.tipo === 'imagen' ? 'Te envió una foto' : msg.tipo === 'audio' ? 'Te envió una nota de voz' : msg.tipo === 'ubicacion' ? 'Compartió su ubicación' : msg.contenido;
        notifyChatMessage({ senderName, messageText: preview, conversacionId: msg.conversacion_id });
      }
    });

    // Confirmación de lectura (doble check verde en tiempo real)
    socket.on('messages_read', ({ conversacion_id }) => {
      setMessages(prev => prev.map(m =>
        String(m.conversacion_id) === String(conversacion_id) ? { ...m, leido: true, entregado: true } : m
      ));
      setConversaciones(prev => prev.map(c =>
        String(c.id) === String(conversacion_id) ? { ...c, no_leidos: 0 } : c
      ));
      api.get('/chat/no-leidos').then(r => setUnreadTotal(r.data.no_leidos)).catch(() => {});
    });

    // Confirmación de entrega (doble check gris en tiempo real)
    socket.on('message_delivered', ({ messageId, conversacion_id }) => {
      setMessages(prev => prev.map(m => {
        if (messageId && String(m.id) === String(messageId)) return { ...m, entregado: true };
        if (conversacion_id && String(m.conversacion_id) === String(conversacion_id) && !m.leido) return { ...m, entregado: true };
        return m;
      }));
    });

    socket.on('new_property_published', (d) => window.dispatchEvent(new CustomEvent('huasi:property-published', { detail: d })));
    socket.on('user_typing', (d) => setTyping(d.conversacion_id));
    socket.on('user_stop_typing', (d) => {
      if (d?.conversacion_id) setTyping(p => String(p) === String(d.conversacion_id) ? false : p);
      else setTyping(false);
    });

    // ── WebRTC signaling ──
    socket.on('call_incoming', (data) => {
      setCallData(data);
      setCallType(data.callType || 'audio');
      setCallState('incoming');
      notifyIncomingCall({
        callerName: data.callerName || 'Usuario HUASI',
        callType: data.callType || 'audio'
      });
    });

    socket.on('call_accepted', async (data) => {
      stopRingtone();
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
      const peerId = data.receiverId;
      const cType = callTypeRef.current;
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

    socket.on('call_rejected', (data) => {
      stopRingtone();
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
      if (data?.reason === 'offline') {
        alert(data.message || 'El usuario no se encuentra en línea en este momento.');
      }
      endCall();
    });
    socket.on('call_ended', () => {
      stopRingtone();
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
      endCall();
    });

    socket.on('webrtc_offer', async (data) => {
      const { offer, fromId } = data;
      const cType = callTypeRef.current;
      try {
        const stream = await getLocalStream(cType);
        const pc = createPeerConnection(fromId);
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushCandidates(pc);
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
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          await flushCandidates(peerConnectionRef.current);
        }
      } catch (err) { console.error('webrtc_answer error:', err); }
    });

    socket.on('webrtc_ice_candidate', async ({ candidate }) => {
      try {
        if (peerConnectionRef.current && candidate) {
          if (peerConnectionRef.current.remoteDescription) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            pendingCandidatesRef.current.push(candidate);
          }
        }
      } catch (err) { console.error('ICE candidate error:', err); }
    });

    return () => socket.disconnect();
  }, [user, createPeerConnection, endCall]);

  // ── Load conversations when widget or page opens ──
  useEffect(() => {
    if (!user || (!open && !isFullPage)) return;
    api.get('/chat/conversaciones')
      .then(res => {
        setConversaciones(res.data);
        if (res.data.length > 0 && !activeConvRef.current && !searchParams?.get('user') && !searchParams?.get('conv')) {
          // En escritorio en página completa seleccionamos la primera conversación
          if (isFullPage && window.innerWidth >= 768) {
            setActiveConv(res.data[0]);
          }
        }
      })
      .catch(err => console.error('Error loading chats:', err));
  }, [user, open, isFullPage, searchParams]);

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
    if (!activeConv) return;

    const fetchMsgs = () => {
      api.get(`/chat/conversaciones/${activeConv.id}/mensajes`)
        .then(r => {
          setMessages(r.data);
          setConversaciones(p => p.map(c => c.id === activeConv.id ? { ...c, no_leidos: 0 } : c));
        })
        .catch(() => {});
    };
    fetchMsgs();
    const iv = setInterval(fetchMsgs, 2500);

    api.get(`/chat/conversaciones/${activeConv.id}/reserva`).then(r => setReservaInfo(r.data)).catch(() => setReservaInfo(null));

    const otherId = getOtherUserId(activeConv);
    if (otherId) {
      api.get(`/propiedades?host_id=${otherId}`)
        .then(r => {
          const props = r.data.propiedades || [];
          setOtherUserProperties(props);
          if (props.length > 0) setBookingForm(p => ({ ...p, propiedad_id: props[0].id }));
        })
        .catch(() => setOtherUserProperties([]));
    }

    if (socketRef.current) socketRef.current.emit('mark_read', { conversacion_id: activeConv.id });
    api.put(`/chat/conversaciones/${activeConv.id}/leer`).then(() => {
      api.get('/chat/no-leidos').then(r => setUnreadTotal(r.data.no_leidos)).catch(() => {});
    }).catch(() => {});

    return () => {
      clearInterval(iv);
      setReservaInfo(null);
      setOtherUserProperties([]);
      setShowBookingModal(false);
    };
  }, [activeConv, getOtherUserId]);

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

  // ── Send multiple image(s) ──
  const handleImageUpload = async (fileList) => {
    if (!fileList || !activeConv) return;
    const files = Array.from(fileList);
    if (files.length === 0) return;

    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append('imagen', file);
        const uploadRes = await api.post('/chat/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        let url = uploadRes.data.url;
        if (url && url.includes('/uploads/chat/')) {
          url = `/api/chat${url.substring(url.lastIndexOf('/uploads/chat/'))}`;
        }
        const contenido = `[imagen]${url}`;
        if (socketRef.current?.connected) {
          socketRef.current.emit('send_message', { conversacion_id: activeConv.id, contenido, tipo: 'imagen', metadata: { url, nombre: file.name } });
        } else {
          const res = await api.post(`/chat/conversaciones/${activeConv.id}/mensajes`, { contenido, tipo: 'imagen', metadata: { url, nombre: file.name } });
          setMessages(p => p.some(m => m.id === res.data.id) ? p : [...p, res.data]);
        }
      } catch (err) {
        console.error('Error subiendo imagen:', err);
        alert(`No se pudo enviar la imagen "${file.name}".`);
      }
    }
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

  // ── Voice Recording handlers ──
  const startVoiceRecording = async () => {
    if (!activeConv) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Tu navegador no permite la grabación de audio o no estás en una conexión segura (HTTPS).');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      audioChunksRef.current = [];

      let options = {};
      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options = { mimeType: 'audio/webm;codecs=opus' };
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: 'audio/mp4' };
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          options = { mimeType: 'audio/ogg;codecs=opus' };
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accediendo al micrófono:', err);
      alert('No se pudo acceder al micrófono. Por favor verifica los permisos en tu navegador.');
    }
  };

  const cancelVoiceRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('Error cancelando grabación:', err);
      }
    }
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach(t => t.stop());
      recordingStreamRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const stopAndSendVoiceRecording = () => {
    if (!mediaRecorderRef.current || !activeConv) return;
    const duration = recordingDuration;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    mediaRecorderRef.current.onstop = async () => {
      try {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (recordingStreamRef.current) {
          recordingStreamRef.current.getTracks().forEach(t => t.stop());
          recordingStreamRef.current = null;
        }

        if (audioBlob.size < 500) {
          setIsRecording(false);
          setRecordingDuration(0);
          return;
        }

        const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([audioBlob], `audio-${Date.now()}.${ext}`, { type: mimeType });

        const fd = new FormData();
        fd.append('audio', file);
        fd.append('duration', String(duration));

        const res = await api.post('/chat/upload-audio', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        let url = res.data.url;
        if (url && url.includes('/uploads/chat/')) {
          url = `/api/chat${url.substring(url.lastIndexOf('/uploads/chat/'))}`;
        }

        const contenido = `[audio]${url}`;
        const metadata = { url, duration };

        if (socketRef.current?.connected) {
          socketRef.current.emit('send_message', {
            conversacion_id: activeConv.id,
            contenido,
            tipo: 'audio',
            metadata
          });
        } else {
          const postRes = await api.post(`/chat/conversaciones/${activeConv.id}/mensajes`, {
            contenido,
            tipo: 'audio',
            metadata
          });
          setMessages(p => p.some(m => m.id === postRes.data.id) ? p : [...p, postRes.data]);
        }
      } catch (err) {
        console.error('Error enviando nota de voz:', err);
        alert('No se pudo enviar la nota de voz.');
      } finally {
        setIsRecording(false);
        setRecordingDuration(0);
      }
    };

    try {
      mediaRecorderRef.current.stop();
    } catch (err) {
      console.warn('Error al detener grabador:', err);
      cancelVoiceRecording();
    }
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
    if (!activeConv) return;
    const peerId = getOtherUserId(activeConv);
    const receiverName = getOtherUserName(activeConv);
    const callerName = user ? `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Usuario HUASI' : 'Usuario HUASI';

    setCallType(type);
    setCallState('outgoing');
    setCallData({
      peerId,
      callerId: user?.id,
      callerName,
      receiverName,
      conversacion_id: activeConv.id,
      callType: type
    });
    startRingtone();

    // Timeout de 35 segundos para llamadas salientes sin respuesta
    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
    callTimeoutRef.current = setTimeout(() => {
      if (callStateRef.current === 'outgoing') {
        stopRingtone();
        alert('El usuario no respondió la llamada.');
        endCall();
      }
    }, 35000);

    if (socketRef.current) {
      socketRef.current.emit('call_request', {
        conversacion_id: activeConv.id,
        receiverId: peerId,
        callType: type,
        callerName
      });
    }
  };

  const acceptCall = () => {
    stopRingtone();
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    const cd = callDataRef.current;
    if (!cd || !socketRef.current) return;
    socketRef.current.emit('call_accept', { callerId: cd.callerId, conversacion_id: cd.conversacion_id, callType: cd.callType });
  };

  const rejectCall = () => {
    stopRingtone();
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    const cd = callDataRef.current;
    if (!cd || !socketRef.current) return;
    socketRef.current.emit('call_reject', { callerId: cd.callerId });
    endCall();
  };

  const hangUp = () => {
    stopRingtone();
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    const cd = callDataRef.current;
    if (socketRef.current) {
      const peerId = cd?.callerId || cd?.peerId || (activeConvRef.current ? getOtherUserId(activeConvRef.current) : null);
      if (peerId) socketRef.current.emit('call_end', { peerId });
    }
    endCall();
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !nextMuted; });
    setIsMuted(nextMuted);
  };

  const toggleVideo = () => {
    const nextVideoOff = !isVideoOff;
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !nextVideoOff; });
    setIsVideoOff(nextVideoOff);
  };

  // ── Reservation actions ──
  const handleReservationAction = async (action) => {
    if (!reservaInfo || !activeConv) return;
    try {
      await api.post('/reservas/chat/command', { reservationId: reservaInfo.reserva_id, action });
      try { await refreshUser(); } catch (refreshErr) { console.debug(refreshErr); }
      // Nota: /reservas/chat/command ya inserta el mensaje de auditoría en la base de datos.
      // Recargamos la información de la reserva y los mensajes para mostrarlos inmediatamente sin duplicar.
      const [res, msgRes] = await Promise.all([
        api.get(`/chat/conversaciones/${activeConv.id}/reserva`),
        api.get(`/chat/conversaciones/${activeConv.id}/mensajes`)
      ]);
      setReservaInfo(res.data);
      setMessages(msgRes.data);
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
    let tipo = msg.tipo || 'texto';
    if (tipo === 'texto' && contenido.startsWith('[imagen]')) tipo = 'imagen';
    if (tipo === 'texto' && contenido.startsWith('[ubicacion]')) tipo = 'ubicacion';
    if (tipo === 'texto' && contenido.startsWith('[audio]')) tipo = 'audio';

    let meta = msg.metadata;
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch { meta = null; }
    }

    const isMine = msg.sender_id === user?.id;

    if (tipo === 'audio') {
      let rawUrl = meta?.url || msg.contenido.replace('[audio]', '').trim();
      let url = rawUrl;
      if (url.includes('/uploads/chat/')) {
        const sub = url.substring(url.lastIndexOf('/uploads/chat/'));
        url = `/api/chat${sub}`;
      } else if (!url.startsWith('http') && !url.startsWith('/')) {
        url = `/api/chat/uploads/chat/${url}`;
      }
      return <AudioMessageBubble url={url} duration={meta?.duration || 0} isMine={isMine} />;
    }

    if (tipo === 'imagen') {
      let rawUrl = meta?.url || msg.contenido.replace('[imagen]', '').trim();
      let url = rawUrl;
      if (url.includes('/uploads/chat/')) {
        const sub = url.substring(url.lastIndexOf('/uploads/chat/'));
        url = `/api/chat${sub}`;
      } else if (!url.startsWith('http') && !url.startsWith('/')) {
        url = `/api/chat/uploads/chat/${url}`;
      }

      return (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setSelectedImage(url)}
          style={{ cursor: 'pointer', display: 'inline-block', position: 'relative' }}
          title="Toca para ampliar la imagen"
        >
          <img
            src={url}
            alt="Imagen enviada"
            style={{ maxWidth: 220, maxHeight: 200, borderRadius: 10, objectFit: 'cover', display: 'block' }}
            onError={e => {
              e.target.style.display = 'none';
              const parent = e.target.parentElement;
              if (parent && !parent.querySelector('.chat-img-fallback')) {
                const fb = document.createElement('span');
                fb.className = 'chat-img-fallback';
                fb.innerText = 'Ver imagen adjunta';
                fb.style.cssText = isMine
                  ? 'display:inline-flex;align-items:center;gap:6px;padding:6px 12px;font-size:0.8rem;color:#ffffff;text-decoration:underline;background:rgba(255,255,255,0.2);border-radius:8px;'
                  : 'display:inline-flex;align-items:center;gap:6px;padding:6px 12px;font-size:0.8rem;color:#0d7c3d;text-decoration:underline;background:rgba(13,124,61,0.08);border-radius:8px;';
                parent.appendChild(fb);
              }
            }}
          />
        </div>
      );
    }

    if (tipo === 'ubicacion') {
      const parts = msg.contenido.replace('[ubicacion]', '').split(',');
      const lat = meta?.lat ?? parseFloat(parts[0] || 0);
      const lng = meta?.lng ?? parseFloat(parts[1] || 0);
      if (!lat || !lng) return <p>Ubicación compartida</p>;
      return <LocationBubble lat={lat} lng={lng} isMine={isMine} />;
    }

    return <p>{msg.contenido}</p>;
  };

  // ── Render message status (Doble check con iconos SVG profesionales) ──
  const renderMessageStatus = (msg) => {
    if (msg.sender_id !== user?.id) return null;
    if (msg._pending) {
      return <Clock size={12} className="chat-status-icon pending" title="Enviando" />;
    }
    if (msg.leido) {
      return <CheckCheck size={14} className="chat-status-icon read" title="Leído" />;
    }
    if (msg.entregado) {
      return <CheckCheck size={14} className="chat-status-icon delivered" title="Entregado" />;
    }
    return <Check size={14} className="chat-status-icon sent" title="Enviado" />;
  };

  // ── RENDER PANTALLA COMPLETA DE LLAMADA ──
  const renderCallOverlay = () => {
    const isIncoming = callState === 'incoming';
    const isOutgoing = callState === 'outgoing';
    const displayName = isIncoming
      ? (callData?.callerName || 'Usuario HUASI')
      : (callData?.receiverName || (activeConv ? getOtherUserName(activeConv) : 'Usuario HUASI'));

    const displayInitials = isIncoming
      ? (callData?.callerName ? callData.callerName.slice(0, 2).toUpperCase() : (activeConv ? getInitials(activeConv) : '??'))
      : (callData?.receiverName ? callData.receiverName.slice(0, 2).toUpperCase() : (activeConv ? getInitials(activeConv) : '??'));

    return (
      <div className="chat-call-overlay">
        <div className="chat-call-modal">
          {callType === 'video' ? (
            <div className="chat-call-video-area">
              <video ref={remoteVideoRef} autoPlay playsInline className="chat-call-remote-video" />
              <video ref={localVideoRef} autoPlay playsInline muted className="chat-call-local-video" />
            </div>
          ) : (
            <div className="chat-call-audio-avatar">
              <div className="chat-call-avatar-ring">
                {displayInitials}
              </div>
            </div>
          )}

          <div className="chat-call-info">
            <span className="chat-call-badge">
              {callType === 'video' ? 'Videollamada HUASI' : 'Llamada de voz HUASI'}
            </span>
            <span className="chat-call-name">
              {displayName}
            </span>
            <span className="chat-call-status">
              {isIncoming && 'Llamada entrante...'}
              {isOutgoing && `Llamando...`}
              {callState === 'active' && formatCallDuration(callDuration)}
            </span>
          </div>

          <div className="chat-call-controls">
            {isIncoming && (
              <>
                <button className="chat-call-btn chat-call-btn-accept" onClick={acceptCall} title="Aceptar llamada">
                  <Phone size={24} />
                  <span className="chat-call-btn-label">Aceptar</span>
                </button>
                <button className="chat-call-btn chat-call-btn-reject" onClick={rejectCall} title="Rechazar llamada">
                  <PhoneOff size={24} />
                  <span className="chat-call-btn-label">Rechazar</span>
                </button>
              </>
            )}

            {(isOutgoing || callState === 'active') && (
              <>
                {callState === 'active' && (
                  <button className={`chat-call-btn chat-call-btn-mute${isMuted ? ' active' : ''}`} onClick={toggleMute} title={isMuted ? 'Activar micrófono' : 'Silenciar'}>
                    {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                    <span className="chat-call-btn-label">{isMuted ? 'Mudo' : 'Silenciar'}</span>
                  </button>
                )}
                {callState === 'active' && callType === 'video' && (
                  <button className={`chat-call-btn chat-call-btn-video${isVideoOff ? ' active' : ''}`} onClick={toggleVideo} title={isVideoOff ? 'Activar cámara' : 'Apagar cámara'}>
                    {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
                    <span className="chat-call-btn-label">Cámara</span>
                  </button>
                )}
                <button className="chat-call-btn chat-call-btn-reject" onClick={hangUp} title="Colgar llamada">
                  <PhoneOff size={24} />
                  <span className="chat-call-btn-label">Colgar</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── VISOR DE IMAGEN A PANTALLA COMPLETA (LIGHTBOX CON BOTÓN RETORNAR) ──
  const renderImageLightbox = () => {
    if (!selectedImage) return null;
    return (
      <div className="chat-image-lightbox" onClick={() => setSelectedImage(null)}>
        <div className="chat-lightbox-header" onClick={e => e.stopPropagation()}>
          <button className="chat-lightbox-back-btn" onClick={() => setSelectedImage(null)} title="Retornar al chat">
            <ArrowLeft size={19} />
            <span>Retornar al chat</span>
          </button>
          <div className="chat-lightbox-actions">
            <a
              href={selectedImage}
              download="imagen-huasi.jpg"
              target="_blank"
              rel="noopener noreferrer"
              className="chat-lightbox-action-btn"
              title="Descargar imagen"
            >
              <Download size={17} />
              <span>Descargar</span>
            </a>
            <button className="chat-lightbox-close-btn" onClick={() => setSelectedImage(null)} title="Cerrar">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="chat-lightbox-content" onClick={e => e.stopPropagation()}>
          <img src={selectedImage} alt="Imagen ampliada" className="chat-lightbox-img" />
        </div>
      </div>
    );
  };

  // ── RENDER LISTA DE CONVERSACIONES ──
  const renderConversationList = () => {
    const filteredConvs = conversaciones.filter(c => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = getOtherUserName(c).toLowerCase();
      const last = (c.ultimo_mensaje || '').toLowerCase();
      return name.includes(q) || last.includes(q);
    });

    return (
      <>
        <div className="chat-search-bar">
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            className="chat-search-input"
            placeholder="Buscar por nombre o mensaje..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="chat-w-list" style={{ flex: 1 }}>
          {filteredConvs.length === 0 ? (
            <div className="chat-w-empty">
              <MessageCircle size={40} strokeWidth={1} />
              <p>Sin conversaciones</p>
              <span>Reserva un alojamiento para iniciar un chat.</span>
            </div>
          ) : (
            filteredConvs.map(conv => (
              <div key={conv.id} className={`chat-w-list-item ${activeConv?.id === conv.id ? 'active' : ''}`} onClick={() => setActiveConv(conv)}>
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
    );
  };

  // ── RENDER CONVERSACIÓN ACTIVA ──
  const renderActiveConversation = (isFull) => {
    return (
      <>
        {/* HEADER */}
        <div className="chat-w-header">
          <button className="chat-w-back" onClick={() => { setActiveConv(null); setReservaInfo(null); setShowMoreOptions(false); }} title="Volver">
            <ArrowLeft size={18} />
          </button>
          <div className="chat-w-avatar-sm">{getInitials(activeConv)}</div>
          <div className="chat-w-header-info">
            <span className="chat-w-header-name">{getOtherUserName(activeConv)}</span>
            {typing === activeConv.id && <span className="chat-w-typing">Escribiendo...</span>}
          </div>
          <div className="chat-w-header-actions">
            <button className="chat-w-action-btn" onClick={() => initiateCall('audio')} title="Llamada de voz"><Phone size={17} /></button>
            <button className="chat-w-action-btn" onClick={() => initiateCall('video')} title="Videollamada"><Video size={17} /></button>
          </div>
          {!isFull && (
            <button className="chat-w-close" onClick={() => setOpen(false)} title="Cerrar"><X size={18} /></button>
          )}
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
                <button className="chat-mp-btn" style={{ background: '#0d7c3d', color: 'white' }} onClick={() => setShowBookingModal(true)}>Solicitar reserva</button>
              </div>
            </div>
          )
        )}

        {/* MODAL RESERVA INLINE */}
        {showBookingModal ? (
          <div style={{ flex: 1, padding: 16, overflowY: 'auto', background: '#f8fafc' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Solicitar Reserva</h4>
            <form onSubmit={handleCreateReservation} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Alojamiento</label>
                <select className="form-control" style={{ padding: '8px 12px', fontSize: '0.85rem' }} value={bookingForm.propiedad_id} onChange={e => setBookingForm(p => ({ ...p, propiedad_id: e.target.value }))}>
                  {otherUserProperties.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Llegada</label>
                  <input type="date" className="form-control" style={{ padding: '8px 10px', fontSize: '0.8rem' }} value={bookingForm.fecha_inicio} onChange={e => setBookingForm(p => ({ ...p, fecha_inicio: e.target.value }))} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Salida</label>
                  <input type="date" className="form-control" style={{ padding: '8px 10px', fontSize: '0.8rem' }} value={bookingForm.fecha_fin} onChange={e => setBookingForm(p => ({ ...p, fecha_fin: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Mensaje para el anfitrión</label>
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
                    {renderMessageStatus(msg)}
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* INPUT BAR O GRABADOR DE NOTA DE VOZ */}
        {!showBookingModal && (
          isRecording ? (
            <div className="chat-rec-bar">
              <div className="chat-rec-indicator">
                <span className="chat-rec-dot" />
                <span className="chat-rec-time">{formatRecordingTime(recordingDuration)}</span>
                <span className="chat-rec-label">Grabando nota de voz...</span>
              </div>
              <div className="chat-rec-controls">
                <button
                  type="button"
                  className="chat-rec-cancel-btn"
                  onClick={cancelVoiceRecording}
                  title="Descartar nota de voz"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  type="button"
                  className="chat-rec-send-btn"
                  onClick={stopAndSendVoiceRecording}
                  title="Enviar nota de voz"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="chat-w-input-bar">
              {/* Hidden file inputs: MULTIPLE IMAGES & CAMERA */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleImageUpload(e.target.files);
                    e.target.value = '';
                  }
                }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={e => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleImageUpload(e.target.files);
                    e.target.value = '';
                  }
                }}
              />

              <div className={`chat-input-actions ${newMsg.trim().length > 0 ? 'is-typing' : ''}`}>
                <button
                  type="button"
                  className="chat-input-icon-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Enviar fotos"
                >
                  <Image size={18} />
                </button>
                <button
                  type="button"
                  className="chat-input-icon-btn chat-extra-btn"
                  onClick={() => cameraInputRef.current?.click()}
                  title="Tomar foto con cámara"
                >
                  <Camera size={18} />
                </button>
                <button
                  type="button"
                  className="chat-input-icon-btn chat-extra-btn"
                  onClick={handleSendLocation}
                  title="Compartir ubicación"
                >
                  <MapPin size={18} />
                </button>
              </div>

              {/* Texto + Acción Dinámica (Enviar si hay texto / Grabar audio si está vacío) */}
              <form onSubmit={handleSend} className="chat-form-wrap">
                <input
                  type="text"
                  className="chat-text-input"
                  placeholder="Escribe un mensaje..."
                  value={newMsg}
                  onChange={handleTyping}
                />
                {newMsg.trim().length > 0 ? (
                  <button type="submit" className="chat-send-btn" title="Enviar mensaje">
                    <Send size={17} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="chat-mic-btn"
                    onClick={startVoiceRecording}
                    title="Grabar nota de voz"
                  >
                    <Mic size={18} />
                  </button>
                )}
              </form>
            </div>
          )
        )}
      </>
    );
  };

  // ── RENDER PLACEHOLDER EN MODO ESCRITORIO (FULLPAGE) ──
  const renderPlaceholder = () => (
    <div className="chat-fp-placeholder">
      <div className="chat-fp-placeholder-icon">
        <MessageCircle size={52} strokeWidth={1.2} />
      </div>
      <h3>Tus conversaciones HUASI</h3>
      <p>Selecciona un chat de la lista izquierda para enviar mensajes, fotos, compartir ubicación o realizar llamadas de voz y video en tiempo real.</p>
    </div>
  );

  const isHost = reservaInfo && reservaInfo.host_id === user?.id;
  if (!user) return null;

  // ── MODO 1: PÁGINA COMPLETA (/chat en Android o Escritorio) ──
  if (isFullPage) {
    return (
      <div className="chat-fullpage-container">
        {/* Remote audio stream */}
        <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

        {/* Full-screen call overlay */}
        {callState && renderCallOverlay()}

        {/* Full-screen Image Lightbox con botón Retornar */}
        {renderImageLightbox()}

        {/* SIDEBAR: Lista de conversaciones */}
        <div className={`chat-fp-sidebar ${activeConv ? 'hidden-mobile' : ''}`}>
          <div className="chat-w-header">
            <MessageCircle size={22} />
            <span className="chat-w-header-name" style={{ flex: 1 }}>Mensajes</span>
          </div>
          {renderConversationList()}
        </div>

        {/* MAIN: Chat activo o placeholder */}
        <div className={`chat-fp-main ${!activeConv ? 'hidden-mobile' : ''}`}>
          {activeConv ? renderActiveConversation(true) : renderPlaceholder()}
        </div>
      </div>
    );
  }

  // ── MODO 2: WIDGET FLOTANTE (Messenger style en otras páginas) ──
  return (
    <>
      {/* Remote audio stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

      {/* Call overlay */}
      {callState && renderCallOverlay()}

      {/* Full-screen Image Lightbox con botón Retornar */}
      {renderImageLightbox()}

      {/* FLOATING BUBBLE */}
      <button className="chat-fab" onClick={() => { setOpen(!open); if (!open) setActiveConv(null); }} title="Mensajes">
        {open ? <ChevronDown size={26} /> : <MessageCircle size={26} />}
        {!open && unreadTotal > 0 && <span className="chat-fab-badge">{unreadTotal > 9 ? '9+' : unreadTotal}</span>}
      </button>

      {/* FLOATING CHAT WINDOW */}
      {open && (
        <div className="chat-widget">
          {activeConv ? renderActiveConversation(false) : (
            <>
              <div className="chat-w-header">
                <MessageCircle size={20} />
                <span className="chat-w-header-name" style={{ flex: 1 }}>Mensajes</span>
                <button className="chat-w-close" onClick={() => setOpen(false)} title="Cerrar"><X size={18} /></button>
              </div>
              {renderConversationList()}
            </>
          )}
        </div>
      )}
    </>
  );
}
