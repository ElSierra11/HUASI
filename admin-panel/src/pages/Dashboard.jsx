import { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle, 
  ShieldAlert, 
  FileText, 
  UserCheck, 
  Eye, 
  ThumbsUp, 
  ThumbsDown, 
  AlertTriangle,
  FolderOpen,
  Calendar,
  MapPin,
  Briefcase,
  Loader2
} from 'lucide-react';
import api from '../api';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

export default function Dashboard() {
  const [verificaciones, setVerificaciones] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [reportes, setReportes] = useState([]);
  const [extendedStats, setExtendedStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Estados para Modal de Rechazo
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [submittingRejection, setSubmittingRejection] = useState(false);

  // Estados para Modal de Aprobación
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveId, setApproveId] = useState(null);
  const [approvingId, setApprovingId] = useState(null); // ID en proceso

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [verifRes, userRes, repRes, extendedRes] = await Promise.all([
        api.get('/auth/verificacion/admin/pendientes'),
        api.get('/auth/admin/usuarios'),
        api.get('/reportes').catch(() => ({ data: [] })),
        api.get('/auth/admin/dashboard-stats').catch(() => ({ data: null }))
      ]);
      setVerificaciones(verifRes.data);
      setUsuarios(userRes.data);
      setReportes(repRes.data);
      setExtendedStats(extendedRes.data);
    } catch (err) {
      console.error(err);
      showToast('Error al cargar estadísticas', 'error');
    } finally {
      setLoading(false);
    }
  };


  // Abre el modal de confirmación de aprobación
  const openApproveModal = (id) => {
    setApproveId(id);
    setIsApproveModalOpen(true);
  };

  const handleAprobar = async () => {
    if (!approveId) return;
    setIsApproveModalOpen(false);
    setApprovingId(approveId);
    try {
      await api.patch(`/auth/verificacion/admin/${approveId}`, { estado: 'aprobado', notas: 'Verificado por el administrador' });
      setVerificaciones(v => v.filter(item => item.id !== approveId));
      
      // Actualizar contador local
      setUsuarios(prev => prev.map(u => {
        const matchingVerif = verificaciones.find(x => x.id === approveId);
        if (matchingVerif && u.id === matchingVerif.user_id) {
          return { ...u, verificado: true };
        }
        return u;
      }));
      
      showToast('Solicitud aprobada con éxito', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al aprobar la verificación', 'error');
    } finally {
      setApprovingId(null);
      setApproveId(null);
    }
  };

  const openRejectModal = (id) => {
    setRejectId(id);
    setRejectReason('');
    setRejectError('');
    setIsRejectModalOpen(true);
  };

  const handleRechazarConfirm = async () => {
    setRejectError('');
    
    // Validación de razón de rechazo obligatoria
    if (!rejectReason.trim()) {
      setRejectError('Debes indicar un motivo de rechazo.');
      return;
    }
    if (rejectReason.trim().length < 5) {
      setRejectError('El motivo debe tener al menos 5 caracteres.');
      return;
    }

    setSubmittingRejection(true);
    try {
      await api.patch(`/auth/verificacion/admin/${rejectId}`, { 
        estado: 'rechazado', 
        notas: rejectReason.trim() 
      });

      setVerificaciones(v => v.filter(item => item.id !== rejectId));
      setIsRejectModalOpen(false);
      showToast('Solicitud rechazada correctamente', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al rechazar la solicitud', 'error');
    } finally {
      setSubmittingRejection(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  // --- CÁLCULOS ESTADÍSTICOS ---
  const campusStats = {};
  const roleStats = { admin: 0, host: 0, guest: 0, user: 0 };
  let verifCount = 0;

  usuarios.forEach(u => {
    const campus = u.campus || 'No especificado';
    campusStats[campus] = (campusStats[campus] || 0) + 1;
    
    const r = u.role || 'user';
    roleStats[r] = (roleStats[r] || 0) + 1;
    
    if (u.verificado) verifCount++;
  });

  const totalUsuarios = usuarios.length || 1;
  const verifPercent = Math.round((verifCount / totalUsuarios) * 100);

  const totalReportes = reportes.length || 1;
  const resolvedReportesCount = reportes.filter(r => r.estado === 'resuelto').length;
  const reportResolvePercent = Math.round((resolvedReportesCount / totalReportes) * 100);

  const campusData = Object.entries(campusStats)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const maxCampusVal = campusData.length > 0 ? Math.max(...campusData.map(d => d.value), 1) : 1;

  const roleColors = {
    admin: '#f59e0b',
    host: '#0d7c3d',
    guest: '#3b82f6',
    user: '#6b7280',
  };

  const roleLabels = {
    admin: 'Admin',
    host: 'Host',
    guest: 'Guest',
    user: 'Otros',
  };

  const roleData = Object.entries(roleStats)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));

  const totalRoles = roleData.reduce((sum, d) => sum + d.value, 0) || 1;
  
  let accumulatedLength = 0;
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // ~314.16

  // --- ESTADÍSTICAS DE ALOJAMIENTO ---
  const propTotal = extendedStats?.propiedades?.total || 0;
  const propActivas = extendedStats?.propiedades?.activas || 0;
  const propInactivas = extendedStats?.propiedades?.inactivas || 0;
  const propTipos = extendedStats?.propiedades?.tipos || [];

  const typeLabels = {
    cama: 'Cama Sencilla',
    sofa: 'Sofá Cama',
    hamaca: 'Hamaca',
    habitacion: 'Habitación Privada',
    alquiler: 'Alquiler Completo',
    otro: 'Otro Tipo',
  };

  // --- HISTORIAL DE RESERVAS POR MES ---
  const monthsData = extendedStats?.reservas_por_mes || [];
  const maxReservas = monthsData.length > 0 ? Math.max(...monthsData.map(m => m.total), 1) : 1;

  return (
    <div>
      <h2 style={{ marginBottom: 28, fontSize: '2rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>
        Resumen de la Plataforma HUASI
      </h2>
      
      {/* Tarjetas de Estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 40 }}>
        
        {/* Usuarios Registrados */}
        <div className="card" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderLeft: '5px solid var(--primary)', 
          background: 'var(--bg-surface)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Usuarios Registrados</span>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>{usuarios.length}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>Comunidad activa</span>
          </div>
          <div style={{ background: 'rgba(0, 152, 205, 0.1)', color: 'var(--primary)', borderRadius: '14px', padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={26} />
          </div>
        </div>

        {/* Verificados */}
        <div className="card" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderLeft: '5px solid var(--success)',
          background: 'var(--bg-surface)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Estudiantes Verificados</span>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>
              {usuarios.filter(u => u.verificado).length}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {usuarios.filter(u => !u.verificado).length} pendientes de verificar
            </span>
          </div>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '14px', padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={26} />
          </div>
        </div>

        {/* Verificaciones Pendientes */}
        <div className="card" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderLeft: '5px solid var(--warning)',
          background: 'var(--bg-surface)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Solicitudes de Carnet</span>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>{verificaciones.length}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 600 }}>Por revisar</span>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', borderRadius: '14px', padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={26} />
          </div>
        </div>

        {/* Reportes Activos */}
        <div className="card" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderLeft: '5px solid var(--danger)',
          background: 'var(--bg-surface)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>PQRs Activas</span>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>
              {reportes.filter(r => r.estado === 'pendiente').length}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>PQRs de comportamiento</span>
          </div>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '14px', padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={26} />
          </div>
        </div>

      </div>

      {/* Sección de Gráficos y Estadísticas */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', 
        gap: 24, 
        marginBottom: 40 
      }}>
        
        {/* Card 1: Campus */}
        <div className="card" style={{ background: 'var(--bg-surface)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 20, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <MapPin size={18} color="var(--primary)" /> Campus más Activos
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {campusData.length === 0 ? (
              <div style={{ padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Sin datos disponibles</div>
            ) : (
              campusData.map(({ name, value }) => {
                const pct = Math.round((value / totalUsuarios) * 100);
                return (
                  <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600 }}>
                      <span style={{ color: 'var(--text)' }}>{name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{value} {value === 1 ? 'usuario' : 'usuarios'} ({pct}%)</span>
                    </div>
                    <div style={{ width: '100%', height: 10, background: 'var(--bg-surface-hover)', borderRadius: 5, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <div style={{ 
                        width: `${(value / maxCampusVal) * 100}%`, 
                        height: '100%', 
                        background: 'linear-gradient(90deg, var(--primary), var(--success))', 
                        borderRadius: 5,
                        transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                      }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Card 2: Distribución de Roles */}
        <div className="card" style={{ background: 'var(--bg-surface)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 20, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={18} color="var(--primary)" /> Roles de Usuario
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: 20 }}>
            
            {/* SVG Donut */}
            <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="140" height="140" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="transparent"
                  stroke="var(--border)"
                  strokeWidth="10"
                />
                {roleData.map((d) => {
                  const percentage = d.value / totalRoles;
                  const strokeLength = percentage * circumference;
                  const strokeOffset = -accumulatedLength;
                  accumulatedLength += strokeLength;

                  return (
                    <circle
                      key={d.name}
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="transparent"
                      stroke={roleColors[d.name] || '#6b7280'}
                      strokeWidth="10"
                      strokeDasharray={`${strokeLength} ${circumference}`}
                      strokeDashoffset={strokeOffset}
                      strokeLinecap={percentage > 0.05 ? 'round' : 'butt'}
                      style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                    />
                  );
                })}
              </svg>
              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>{usuarios.length}</span>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</span>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {roleData.map((d) => {
                const pct = Math.round((d.value / totalRoles) * 100);
                return (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: roleColors[d.name] }} />
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{roleLabels[d.name] || d.name}:</span>
                    <span style={{ color: 'var(--text-muted)' }}>{d.value} ({pct}%)</span>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* Card 3: Estadísticas de Alojamientos */}
        <div className="card" style={{ background: 'var(--bg-surface)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 20, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={18} color="var(--primary)" /> Resumen de Alojamientos
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>{propTotal}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1, borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{propActivas}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Activos</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}>{propInactivas}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Inactivos</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '110px', overflowY: 'auto', paddingRight: '4px' }}>
              {propTipos.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', paddingTop: 10 }}>Sin alojamientos creados</div>
              ) : (
                propTipos.map((t) => {
                  const pct = Math.round((t.cantidad / (propTotal || 1)) * 100);
                  return (
                    <div key={t.tipo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{typeLabels[t.tipo] || t.tipo}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{t.cantidad} ({pct}%)</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Eficiencia y Operaciones */}
        <div className="card" style={{ background: 'var(--bg-surface)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 20, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle size={18} color="var(--primary)" /> Eficiencia y Operaciones
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Tasa de Verificación */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--text)' }}>Verificación de Vinculación</span>
                <span style={{ fontWeight: 800, color: 'var(--success)' }}>{verifPercent}%</span>
              </div>
              <div style={{ width: '100%', height: 8, background: 'var(--bg-surface-hover)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ 
                  width: `${verifPercent}%`, 
                  height: '100%', 
                  background: 'var(--success)', 
                  borderRadius: 4, 
                  transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
                }} />
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                {verifCount} de {usuarios.length} estudiantes verificados.
              </span>
            </div>

            {/* Tasa de Reportes Resueltos */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--text)' }}>PQRs Tramitadas</span>
                <span style={{ fontWeight: 800, color: reportes.length > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {reportes.length > 0 ? `${reportResolvePercent}%` : '100%'}
                </span>
              </div>
              <div style={{ width: '100%', height: 8, background: 'var(--bg-surface-hover)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ 
                  width: `${reportes.length > 0 ? reportResolvePercent : 100}%`, 
                  height: '100%', 
                  background: 'var(--primary)', 
                  borderRadius: 4, 
                  transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
                }} />
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                {resolvedReportesCount} de {reportes.length} PQRs resueltas.
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* Card 5: Historial Mensual de Reservas */}
      <div className="card" style={{ marginBottom: 40, background: 'var(--bg-surface)' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 20, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle size={18} color="var(--primary)" /> Historial Mensual de Reservas
        </h3>
        
        {monthsData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            No se registran reservas en el historial mensual.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '10px' }}>
              <div style={{ minWidth: '480px' }}>
                <svg viewBox="0 0 500 200" style={{ width: '100%', height: '180px' }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" />
                      <stop offset="100%" stopColor="var(--success)" stopOpacity="0.6" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="30" y1="20" x2="480" y2="20" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 4" />
                  <line x1="30" y1="70" x2="480" y2="70" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 4" />
                  <line x1="30" y1="120" x2="480" y2="120" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 4" />
                  <line x1="30" y1="160" x2="480" y2="160" stroke="var(--border)" strokeWidth="1" />

                  {/* Bars */}
                  {monthsData.map((d, idx) => {
                    const barWidth = 20;
                    const spacing = (440 / Math.max(monthsData.length, 1));
                    const x = 30 + idx * spacing + (spacing - barWidth) / 2;
                    const height = (d.total / maxReservas) * 130;
                    const y = 160 - height;
                    
                    const [year, month] = d.mes.split('-');
                    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                    const mesLabel = `${monthNames[parseInt(month) - 1]} ${year.substring(2)}`;

                    return (
                      <g key={d.mes}>
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={height}
                          fill="url(#barGrad)"
                          rx="4"
                          style={{ transition: 'all 0.5s ease' }}
                        />
                        <text
                          x={x + barWidth / 2}
                          y="176"
                          fill="var(--text-muted)"
                          fontSize="9"
                          fontWeight="700"
                          textAnchor="middle"
                        >
                          {mesLabel}
                        </text>
                        {d.total > 0 && (
                          <text
                            x={x + barWidth / 2}
                            y={y - 5}
                            fill="var(--text)"
                            fontSize="9"
                            fontWeight="800"
                            textAnchor="middle"
                          >
                            {d.total}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Monthly Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              {monthsData.map((d) => {
                const [year, month] = d.mes.split('-');
                const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                const label = `${monthNames[parseInt(month) - 1]} ${year}`;
                return (
                  <div key={d.mes} style={{ background: 'var(--bg-surface-hover)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>{d.total} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>solicitudes</span></div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, fontSize: '0.65rem', marginTop: 4, fontWeight: 600 }}>
                      <span style={{ color: 'var(--success)' }}>{d.aprobadas} OK</span>
                      <span style={{ color: 'var(--text-muted)' }}>{d.pendientes} Pend</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <h2 style={{ marginBottom: 24, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.5px' }}>
        <UserCheck size={24} color="var(--primary)" /> Verificaciones Pendientes de Aprobación
      </h2>

      
      {verificaciones.length === 0 ? (
        <div className="card" style={{ 
          textAlign: 'center', 
          padding: 56, 
          border: '2px dashed var(--border)', 
          background: 'var(--bg-surface-hover)',
          boxShadow: 'none'
        }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            background: 'var(--success-bg)', 
            color: 'var(--success)', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 20px' 
          }}>
            <CheckCircle size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>No hay verificaciones pendientes</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Todo está al día. ¡Buen trabajo!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {verificaciones.map(v => (
            <div key={v.id} className="card" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: 24,
              padding: '24px 32px'
            }}>
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #0d7c3d, #059669)', 
                    color: 'white', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: 700, 
                    fontSize: '0.95rem'
                  }}>
                    {v.nombre?.charAt(0)}{v.apellido?.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                      {v.nombre} {v.apellido}
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{v.email}</span>
                  </div>
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '10px 20px',
                  background: 'var(--bg-surface-hover)',
                  padding: '16px 20px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)'
                }}>
                  <p style={{ fontSize: '0.88rem', margin: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={15} color="var(--primary)" />
                    <strong>Sede UCC:</strong> <span style={{ color: 'var(--text)' }}>{v.universidad}</span>
                  </p>
                  <p style={{ fontSize: '0.88rem', margin: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Briefcase size={15} color="var(--primary)" />
                    <strong>Vínculo:</strong> <span style={{ color: 'var(--text)', textTransform: 'capitalize' }}>{v.tipo}</span>
                  </p>
                  <p style={{ fontSize: '0.88rem', margin: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={15} color="var(--primary)" />
                    <strong>Solicitado:</strong> <span style={{ color: 'var(--text)' }}>{new Date(v.created_at).toLocaleDateString('es-CO')}</span>
                  </p>
                </div>
                
                <div style={{ marginTop: 18, display: 'flex', gap: 12 }}>
                  <a href={v.carnet_url} target="_blank" rel="noreferrer" className="btn" style={{ 
                    background: 'var(--bg-surface-hover)', 
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    padding: '8px 16px', 
                    borderRadius: 8,
                    fontSize: '0.85rem'
                  }}>
                    <Eye size={14} /> Ver Carnet de la UCC
                  </a>
                  {v.documento_url && (
                    <a href={v.documento_url} target="_blank" rel="noreferrer" className="btn" style={{ 
                      background: 'var(--bg-surface-hover)', 
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      padding: '8px 16px', 
                      borderRadius: 8,
                      fontSize: '0.85rem'
                    }}>
                      <Eye size={14} /> Ver Documento Adicional
                    </a>
                  )}
                </div>
              </div>
              
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 12, 
                minWidth: '180px', 
                alignItems: 'stretch',
                borderLeft: '1px solid var(--border)',
                paddingLeft: '24px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <span className="badge badge-pendiente" style={{ display: 'inline-flex', width: '100%', justifyContent: 'center' }}>Pendiente</span>
                </div>
                <button 
                  className="btn btn-success" 
                  onClick={() => openApproveModal(v.id)} 
                  disabled={approvingId === v.id}
                  style={{ borderRadius: 8, fontSize: '0.85rem', width: '100%' }}
                >
                  {approvingId === v.id
                    ? <><Loader2 size={14} className="animate-spin" /> Aprobando...</>
                    : <><ThumbsUp size={14} /> Aprobar</>
                  }
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={() => openRejectModal(v.id)} 
                  style={{ borderRadius: 8, fontSize: '0.85rem', width: '100%' }}
                >
                  <ThumbsDown size={14} /> Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Rechazo de Verificación */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Rechazar Solicitud de Verificación"
        type="warning"
        footer={
          <>
            <button 
              className="btn" 
              onClick={() => setIsRejectModalOpen(false)}
              style={{ background: 'transparent', color: 'var(--text-muted)' }}
              disabled={submittingRejection}
            >
              Cancelar
            </button>
            <button 
              className="btn btn-danger" 
              onClick={handleRechazarConfirm}
              disabled={submittingRejection}
            >
              {submittingRejection
                ? <><Loader2 size={14} className="animate-spin" /> Rechazando...</>
                : 'Confirmar Rechazo'
              }
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Estás a punto de rechazar la solicitud de carnet/verificación de este estudiante. Al hacerlo, se le notificará por correo indicando la razón y tendrá que volver a subir sus documentos.
          </p>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="rejectReason">Razón del Rechazo (Obligatorio)</label>
            <textarea
              id="rejectReason"
              className="form-control"
              placeholder="Ej. La imagen del carnet de la UCC está borrosa o es ilegible. Por favor, sube una foto nítida de tu carnet vigente."
              rows={4}
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                if (rejectError) setRejectError('');
              }}
              style={{ resize: 'none', fontFamily: 'var(--font)' }}
              disabled={submittingRejection}
            />
            {rejectError && (
              <span style={{ 
                color: 'var(--danger)', 
                fontSize: '0.8rem', 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 4, 
                marginTop: 6 
              }}>
                <AlertTriangle size={12} /> {rejectError}
              </span>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmación de Aprobación */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title="Aprobar Solicitud de Verificación"
        type="success"
        footer={
          <>
            <button
              className="btn"
              onClick={() => setIsApproveModalOpen(false)}
              style={{ background: 'transparent', color: 'var(--text-muted)' }}
            >
              Cancelar
            </button>
            <button
              className="btn btn-success"
              onClick={handleAprobar}
            >
              <ThumbsUp size={14} /> Confirmar Aprobación
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          ¿Estás seguro de que deseas <strong style={{ color: 'var(--success)' }}>aprobar</strong> esta solicitud de verificación universitaria?
          El estudiante quedará marcado como verificado y recibirá los beneficios de HUASI.
        </p>
      </Modal>
    </div>
  );
}
