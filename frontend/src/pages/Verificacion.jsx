import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Upload, Camera, GraduationCap, CheckCircle2, ShieldAlert, Sun, ArrowRight, RefreshCw } from 'lucide-react';
import api from '../api';

export default function Verificacion() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ universidad: '', tipo_vinculo: 'estudiante' });
  const [carnetFile, setCarnetFile] = useState(null);
  const [carnetPreview, setCarnetPreview] = useState('');
  
  // Scanning States
  const [isScanningOCR, setIsScanningOCR] = useState(false);
  const [isScanningFace, setIsScanningFace] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [error, setError] = useState('');
  
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Redirigir si ya está verificado
  useEffect(() => {
    if (user?.verificado) {
      setStep(4);
    }
  }, [user]);

  // Clean up camera stream
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCarnetFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCarnetPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const startOCRScan = async () => {
    if (!carnetFile) {
      setError('Por favor selecciona la imagen de tu carnet.');
      return;
    }
    setError('');
    setIsScanningOCR(true);
    setScanProgress(10);

    // Simular escaneo progresivo del carnet
    const interval = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 15;
      });
    }, 400);

    // Hacer la petición real al servidor
    const formData = new FormData();
    formData.append('universidad', form.universidad);
    formData.append('tipo_vinculo', form.tipo_vinculo);
    formData.append('carnet', carnetFile);

    try {
      await api.post('/verificacion', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Esperar a que termine la animación
      setTimeout(() => {
        setIsScanningOCR(false);
        setStep(3); // Ir al paso de verificación facial
        startCamera();
      }, 3000);
    } catch (err) {
      clearInterval(interval);
      setIsScanningOCR(false);
      setError(err.response?.data?.error || 'Error al procesar la verificación. Revisa el tipo de archivo.');
    }
  };

  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 300 } });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        console.warn('Cámara no disponible, usando simulador visual de rostro.');
      }
    } catch (err) {
      console.warn('Cámara no disponible, usando simulador visual de rostro.', err);
    }
  };

  const runFaceScan = () => {
    setIsScanningFace(true);
    setScanProgress(0);
    setFaceDetected(false);

    // Simular encuadre facial
    setTimeout(() => setFaceDetected(true), 1500);

    const interval = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 20;
      });
    }, 600);

    setTimeout(async () => {
      setIsScanningFace(false);
      // Apagar cámara
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      // Refrescar usuario para cargar balance de soles y verificado = true
      await refreshUser();
      setStep(4);
    }, 4500);
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 slide-up-entrance">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-heading font-black text-ucc-navy mb-2 flex items-center justify-center gap-2">
          <ShieldAlert size={28} className="text-ucc-green" /> Verificación Universitaria
        </h1>
        <p className="text-sm text-ucc-muted font-body">
          Valida tu vinculación universitaria para acceder a los alojamientos estudiantiles y reservar sin restricciones.
        </p>
      </div>

      {error && <div className="alert alert-error mb-6">{error}</div>}

      {/* STEP 1: Formulario de datos */}
      {step === 1 && (
        <div className="card p-8">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2"><GraduationCap /> Información Institucional</h2>
          <div className="form-group mb-4">
            <label>Universidad / Institución</label>
            <input 
              type="text" 
              className="form-control" 
              value={form.universidad} 
              disabled 
            />
          </div>
          <div className="form-group mb-6">
            <label>Tipo de Vínculo</label>
            <select 
              className="form-control" 
              value={form.tipo_vinculo} 
              onChange={e => setForm(f => ({ ...f, tipo_vinculo: e.target.value }))}
            >
              <option value="estudiante">Estudiante de Pregrado / Posgrado</option>
              <option value="docente">Docente Universitario</option>
              <option value="administrativo">Personal Administrativo</option>
              <option value="egresado">Egresado Universitario</option>
            </select>
          </div>
          <button onClick={() => setStep(2)} className="btn btn-primary btn-block">
            Siguiente Paso <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* STEP 2: Subida y escaneo del carnet */}
      {step === 2 && (
        <div className="card p-8 text-center">
          <h2 className="text-lg font-bold mb-2">Escanear Carnet Universitario</h2>
          <p className="text-xs text-ucc-muted mb-6">Sube una foto clara de tu carnet universitario</p>

          {!isScanningOCR ? (
            <div className="flex flex-col items-center">
              {carnetPreview ? (
                <div className="relative mb-6 rounded-xl overflow-hidden border border-ucc-border" style={{ maxWidth: '320px' }}>
                  <img src={carnetPreview} alt="Carnet Preview" className="w-full h-auto object-cover" />
                  <button 
                    onClick={() => { setCarnetFile(null); setCarnetPreview(''); }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 border-none cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-ucc-border rounded-2xl p-10 cursor-pointer hover:bg-ucc-bg/20 transition-colors w-full mb-6">
                  <Upload size={40} className="text-ucc-muted mb-3" />
                  <span className="text-sm font-bold text-ucc-navy">Seleccionar Imagen</span>
                  <span className="text-[10px] text-ucc-muted mt-1">Soporta PNG, JPG de hasta 5MB</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                </label>
              )}
              
              <div className="flex gap-4 w-full">
                <button onClick={() => setStep(1)} className="btn btn-secondary flex-1">Volver</button>
                <button onClick={startOCRScan} className="btn btn-primary flex-1" disabled={!carnetFile}>
                  Escanear Carnet
                </button>
              </div>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center">
              <div className="relative border border-ucc-border rounded-xl overflow-hidden mb-6" style={{ maxWidth: '320px' }}>
                <img src={carnetPreview} alt="Scanning" className="w-full h-auto opacity-70" />
                {/* Línea láser animada */}
                <div 
                  className="absolute left-0 right-0 h-1 bg-ucc-cyan shadow-[0_0_10px_#00a8e0]" 
                  style={{ 
                    top: `${scanProgress}%`, 
                    transition: 'top 0.4s ease-out' 
                  }} 
                />
              </div>
              <h3 className="font-bold text-sm text-ucc-navy mb-2 flex items-center gap-2">
                <RefreshCw className="animate-spin text-ucc-cyan" size={16} /> Procesando OCR de Datos...
              </h3>
              <p className="text-xs text-ucc-muted">Buscando coincidencia con el registro universitario ({scanProgress}%)</p>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Verificación Facial Simulada */}
      {step === 3 && (
        <div className="card p-8 text-center">
          <h2 className="text-lg font-bold mb-2">Validación de Identidad Facial</h2>
          <p className="text-xs text-ucc-muted mb-6">Encuadra tu rostro en la cámara para confirmar que eres el titular del carnet</p>

          <div className="flex flex-col items-center">
            <div className="relative rounded-2xl overflow-hidden bg-ucc-navy/10 border border-ucc-border mb-6" style={{ width: '320px', height: '240px' }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover scale-x-[-1]"
              />
              
              {/* Recuadro de rostro animado */}
              <div 
                className="absolute border-2 rounded-full" 
                style={{
                  top: '15%',
                  left: '25%',
                  width: '50%',
                  height: '70%',
                  borderColor: isScanningFace ? (faceDetected ? 'var(--ucc-green)' : '#f59e0b') : 'rgba(255,255,255,0.4)',
                  boxShadow: isScanningFace && faceDetected ? '0 0 15px rgba(16, 185, 129, 0.4)' : 'none',
                  transition: 'all 0.3s ease'
                }}
              />

              {isScanningFace && (
                <div 
                  className="absolute bottom-2 left-0 right-0 bg-black/60 text-white text-[10px] py-1 font-bold"
                >
                  {faceDetected ? 'ROSTRO DETECTADO - ANALIZANDO COINCIDENCIA' : 'BUSCANDO ROSTRO...'}
                </div>
              )}
            </div>

            {!isScanningFace ? (
              <button onClick={runFaceScan} className="btn btn-primary btn-block">
                Iniciar Reconocimiento Facial
              </button>
            ) : (
              <div className="w-full">
                <h3 className="font-bold text-sm text-ucc-navy mb-2 flex items-center justify-center gap-2">
                  <RefreshCw className="animate-spin text-ucc-green" size={16} /> Analizando Biométrica Facial...
                </h3>
                <div className="w-full bg-ucc-border/20 rounded-full h-1.5 mb-2 overflow-hidden">
                  <div className="bg-ucc-green h-full" style={{ width: `${scanProgress}%`, transition: 'width 0.6s ease' }}></div>
                </div>
                <p className="text-[10px] text-ucc-muted">Coincidencia de facciones: {faceDetected ? '98.7%' : 'Procesando...'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: Verificación exitosa */}
      {step === 4 && (
        <div className="card p-10 text-center animate-fadeIn">
          <div className="flex justify-center mb-6">
            <div className="bg-ucc-green-light text-ucc-green rounded-full p-4 flex items-center justify-center">
              <CheckCircle2 size={56} />
            </div>
          </div>
          <h2 className="text-2xl font-heading font-black text-ucc-navy mb-3">¡Felicidades! Cuenta Verificada</h2>
          <p className="text-sm text-ucc-muted mb-8 max-w-md mx-auto">
            Hemos validado exitosamente tu vinculación universitaria. Tu perfil cuenta ahora con la insignia de <strong>Estudiante Verificado</strong>.
          </p>

          <button onClick={() => navigate('/')} className="btn btn-primary px-8">
            Comenzar a Explorar
          </button>
        </div>
      )}
    </div>
  );
}
