import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Home, 
  TrendingUp, 
  RefreshCw,
  Award,
  Filter
} from 'lucide-react';
import api from '../api';
import { useToast } from '../components/Toast';

export default function EstadisticasMensuales() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCampus, setSelectedCampus] = useState('Todos');
  const { showToast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/admin/estadisticas-mensuales');
      setData(res.data);
    } catch (err) {
      console.error(err);
      showToast('Error al cargar reportes mensuales', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!data) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "REPORTES MENSUALES Y ACTIVIDAD HUASI\n\n";

    csvContent += "DESGLOSE POR CAMPUS\n";
    csvContent += "Campus,Total Alojamientos,Alojamientos Activos\n";
    data.campus.forEach(c => {
      csvContent += `"${c.campus}",${c.total_alojamientos},${c.activos}\n`;
    });

    csvContent += "\nHISTORICO MENSUAL DE RESERVAS\n";
    csvContent += "Mes,Total Reservas,Aceptadas,Rechazadas\n";
    data.historico_reservas.forEach(h => {
      csvContent += `"${h.mes}",${h.total_reservas},${h.reservas_aceptadas},${h.reservas_rechazadas}\n`;
    });

    csvContent += "\nNUEVOS ALOJAMIENTOS POR MES\n";
    csvContent += "Mes,Nuevos Alojamientos\n";
    data.propiedades_mensuales.forEach(p => {
      csvContent += `"${p.mes}",${p.nuevos_alojamientos}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Mensual_HUASI_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Reporte CSV descargado con éxito', 'success');
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  const campusList = data?.campus || [];
  const filteredCampus = selectedCampus === 'Todos' 
    ? campusList 
    : campusList.filter(c => c.campus === selectedCampus);

  const totalAlojamientosGral = campusList.reduce((acc, curr) => acc + curr.total_alojamientos, 0);
  const totalActivosGral = campusList.reduce((acc, curr) => acc + curr.activos, 0);
  const totalReservasGral = data?.historico_reservas?.reduce((acc, curr) => acc + curr.total_reservas, 0) || 0;
  const totalAceptadasGral = data?.historico_reservas?.reduce((acc, curr) => acc + curr.reservas_aceptadas, 0) || 0;
  const tasaAceptacion = totalReservasGral > 0 ? Math.round((totalAceptadasGral / totalReservasGral) * 100) : 100;

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <BarChart3 size={28} style={{ color: 'var(--primary)' }} />
            <span>Estadísticas y Reportes Mensuales</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
            Indicadores agregados de impacto social y movilidad estudiantil.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={fetchStats}
            className="btn btn-secondary"
            style={{ padding: '9px 14px', fontSize: '0.85rem' }}
          >
            <RefreshCw size={15} /> Actualizar
          </button>
          <button
            onClick={exportToCSV}
            className="btn btn-primary"
            style={{ padding: '9px 16px', fontSize: '0.85rem', background: 'var(--primary)' }}
          >
            <Download size={16} /> Exportar CSV / Excel
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="card" style={{ padding: 18, borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Alojamientos Totales</span>
            <Home size={20} style={{ color: 'var(--primary)' }} />
          </div>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, color: 'var(--text)' }}>{totalAlojamientosGral}</h3>
          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700, marginTop: 4, display: 'inline-block' }}>
            {totalActivosGral} activos actualmente
          </span>
        </div>

        <div className="card" style={{ padding: 18, borderLeft: '4px solid #00a8e0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Solicitudes</span>
            <Calendar size={20} style={{ color: '#00a8e0' }} />
          </div>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, color: 'var(--text)' }}>{totalReservasGral}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'inline-block' }}>
            Histórico acumulado
          </span>
        </div>

        <div className="card" style={{ padding: 18, borderLeft: '4px solid #16a34a' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reservas Aceptadas</span>
            <CheckCircle2 size={20} style={{ color: '#16a34a' }} />
          </div>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, color: '#16a34a' }}>{totalAceptadasGral}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'inline-block' }}>
            Estadías confirmadas
          </span>
        </div>

        <div className="card" style={{ padding: 18, borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tasa de Aceptación</span>
            <TrendingUp size={20} style={{ color: '#f59e0b' }} />
          </div>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, color: 'var(--text)' }}>{tasaAceptacion}%</h3>
          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700, marginTop: 4, display: 'inline-block' }}>
            Efectividad del programa
          </span>
        </div>
      </div>

      {/* Filter by Campus */}
      <div className="card" style={{ padding: 18, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={18} style={{ color: 'var(--primary)' }} />
            <span>Impacto y Cobertura por Campus</span>
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={15} style={{ color: 'var(--text-muted)' }} />
            <select
              value={selectedCampus}
              onChange={e => setSelectedCampus(e.target.value)}
              className="form-control"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
            >
              <option value="Todos">Todos los Campus</option>
              {campusList.map(c => (
                <option key={c.campus} value={c.campus}>{c.campus}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Campus / Sede</th>
                <th style={{ textAlign: 'center' }}>Total Alojamientos</th>
                <th style={{ textAlign: 'center' }}>Alojamientos Activos</th>
                <th style={{ textAlign: 'right' }}>Porcentaje de Cobertura</th>
              </tr>
            </thead>
            <tbody>
              {filteredCampus.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                    No hay información disponible para el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                filteredCampus.map((c, idx) => {
                  const pct = totalAlojamientosGral > 0 ? Math.round((c.total_alojamientos / totalAlojamientosGral) * 100) : 0;
                  return (
                    <tr key={idx}>
                      <td>
                        <strong>{c.campus}</strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-info">{c.total_alojamientos}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-success">{c.activos}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>
                        {pct}% del total
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly History Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
        {/* Monthly Reservations */}
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} style={{ color: 'var(--primary)' }} />
            <span>Histórico Mensual de Solicitudes</span>
          </h3>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Mes</th>
                <th style={{ textAlign: 'center' }}>Solicitudes</th>
                <th style={{ textAlign: 'center' }}>Aceptadas</th>
                <th style={{ textAlign: 'center' }}>Rechazadas</th>
              </tr>
            </thead>
            <tbody>
              {data?.historico_reservas?.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 16 }}>
                    Sin datos aún.
                  </td>
                </tr>
              ) : (
                data?.historico_reservas?.map((h, idx) => (
                  <tr key={idx}>
                    <td><strong>{h.mes}</strong></td>
                    <td style={{ textAlign: 'center' }}>{h.total_reservas}</td>
                    <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>{h.reservas_aceptadas}</td>
                    <td style={{ textAlign: 'center', color: '#dc2626' }}>{h.reservas_rechazadas}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Monthly Property Listings */}
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Home size={18} style={{ color: 'var(--primary)' }} />
            <span>Nuevos Alojamientos Publicados</span>
          </h3>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Mes</th>
                <th style={{ textAlign: 'right' }}>Publicaciones Creadas</th>
              </tr>
            </thead>
            <tbody>
              {data?.propiedades_mensuales?.length === 0 ? (
                <tr>
                  <td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 16 }}>
                    Sin datos aún.
                  </td>
                </tr>
              ) : (
                data?.propiedades_mensuales?.map((p, idx) => (
                  <tr key={idx}>
                    <td><strong>{p.mes}</strong></td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>
                      +{p.nuevos_alojamientos} alojamientos
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
