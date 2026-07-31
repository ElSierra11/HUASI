import React, { useState } from 'react';
import {
  Search, Filter, Plus, Trash2, Edit3, Save, X, Check, AlertTriangle, AlertCircle,
  Clock, Calendar, User, Dumbbell, Utensils, FileText, Download, Shield, Bell,
  LogOut, Sun, Moon, ChevronRight, Activity, Flame, Scale, Target, MessageSquare,
  BarChart2, Eye, CheckCircle2, Award, Zap, Camera, ShieldCheck, HeartPulse
} from 'lucide-react';
import './CoachDashboard.css';

// Initial Mock Dataset matching the user's setup
const INITIAL_STUDENTS = [
  {
    id: 1,
    name: 'Denilson Rincones',
    email: 'denilson@gym.com',
    objective: 'Tonificar y reducir porcentaje de grasa corporal',
    height: 1.67,
    startWeight: 85.5,
    currentWeight: 83.0,
    goalWeight: 75.0,
    riskLevel: 'high',
    riskReason: 'Sin check-in hace 8 días',
    status: 'activo',
    joinDate: '2026-05-10',
    bodyFat: '22%',
    weightHistory: [
      { date: '15 May', weight: 85.5 },
      { date: '01 Jun', weight: 84.2 },
      { date: '15 Jun', weight: 83.0 },
      { date: '01 Jul', weight: 81.5 },
      { date: '15 Jul', weight: 83.3 },
      { date: '31 Jul', weight: 83.0 }
    ],
    workoutPlan: [
      { id: 101, day: 'Lunes', exercise: 'Press de Banca Plano con Barra', muscle: 'Pecho', sets: 4, reps: '8-10', rir: 'RIR 1-2', rest: '90 seg' },
      { id: 102, day: 'Lunes', exercise: 'Press Inclinado con Mancuernas', muscle: 'Pecho Superior', sets: 3, reps: '10-12', rir: 'RIR 2', rest: '75 seg' },
      { id: 103, day: 'Lunes', exercise: 'Aperturas en Polea Alta', muscle: 'Pecho Aislamiento', sets: 3, reps: '12-15', rir: 'RIR 0', rest: '60 seg' }
    ],
    dietPlan: {
      calories: 2200,
      protein: 175,
      carbs: 220,
      fats: 65,
      meals: [
        { time: 'Desayuno (08:00)', items: '4 huevos enteros, 80g avena cocida, 1 banano' },
        { time: 'Almuerzo (13:00)', items: '200g pechuga de pollo, 150g arroz integral, ensalada verde' },
        { time: 'Cena (20:00)', items: '200g filete de tilapia, 200g camote asado, espárragos' }
      ]
    },
    notes: [
      { date: '28/07/2026', text: 'Mencionó molestia leve en el hombro derecho al hacer press inclinado. Ajustar rango de movimiento.' }
    ],
    pendingCheckin: {
      date: '29/07/2026',
      weight: 83.0,
      energy: 8,
      compliance: '85%',
      comments: 'Me sentí fuerte en la sesión de piernas. En la dieta estuve flojo el fin de semana.'
    }
  },
  {
    id: 2,
    name: 'Breidy Yelena Diaz',
    email: 'yelenabreidy@gmail.com',
    objective: 'Aumento de masa muscular e hipertrofia',
    height: 1.62,
    startWeight: 56.0,
    currentWeight: 60.5,
    goalWeight: 63.0,
    riskLevel: 'medium',
    riskReason: 'Reporte pendiente de revisión',
    status: 'activo',
    joinDate: '2026-03-01',
    bodyFat: '19%',
    weightHistory: [
      { date: '01 Mar', weight: 56.0 },
      { date: '01 Abr', weight: 57.2 },
      { date: '01 May', weight: 58.5 },
      { date: '01 Jun', weight: 59.8 },
      { date: '31 Jul', weight: 60.5 }
    ],
    workoutPlan: [
      { id: 201, day: 'Martes', exercise: 'Sentadilla Trasera Profunda', muscle: 'Cuádriceps', sets: 4, reps: '6-8', rir: 'RIR 1', rest: '120 seg' }
    ],
    dietPlan: {
      calories: 2400,
      protein: 130,
      carbs: 310,
      fats: 60,
      meals: []
    },
    notes: [],
    pendingCheckin: null
  },
  {
    id: 3,
    name: 'Maria Estela Garcia',
    email: 'mariaestelagarciaartuz@gmail.com',
    objective: 'Recomposición corporal y tono muscular',
    height: 1.65,
    startWeight: 68.0,
    currentWeight: 64.2,
    goalWeight: 62.0,
    riskLevel: 'good',
    riskReason: 'Al día - Excelente adherencia',
    status: 'activo',
    joinDate: '2026-01-15',
    bodyFat: '23%',
    weightHistory: [
      { date: '15 Ene', weight: 68.0 },
      { date: '15 Mar', weight: 66.5 },
      { date: '15 May', weight: 65.1 },
      { date: '31 Jul', weight: 64.2 }
    ],
    workoutPlan: [],
    dietPlan: { calories: 1800, protein: 140, carbs: 160, fats: 50, meals: [] },
    notes: [],
    pendingCheckin: null
  }
];

export default function CoachDashboard() {
  const [students, setStudents] = useState(INITIAL_STUDENTS);
  const [selectedStudentId, setSelectedStudentId] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('todos'); // 'todos', 'activos', 'riesgo', 'inactivos'
  const [activeTab, setActiveTab] = useState('resumen'); // 'pendientes', 'vista-general', 'resumen', 'rutina', 'dieta', 'notas'
  const [photoView, setPhotoView] = useState('frontal'); // 'frontal', 'perfil', 'espalda'
  const [selectedDay, setSelectedDay] = useState('Lunes');
  
  // Modals state
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  // Selected student instance
  const selectedStudent = students.find(s => s.id === selectedStudentId) || students[0];

  // Filtering students
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.email.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (filterCategory === 'activos') return student.status === 'activo';
    if (filterCategory === 'riesgo') return student.riskLevel === 'high' || student.riskLevel === 'medium';
    if (filterCategory === 'inactivos') return student.status === 'inactivo';
    return true;
  });

  // Calculate SVG Weight Chart points dynamically
  const renderSvgChart = () => {
    const history = selectedStudent.weightHistory;
    if (!history || history.length === 0) return null;

    const width = 500;
    const height = 180;
    const padding = 30;

    const weights = history.map(h => h.weight);
    const minWeight = Math.min(...weights, selectedStudent.goalWeight) - 2;
    const maxWeight = Math.max(...weights, selectedStudent.startWeight) + 2;

    const getX = (index) => padding + (index / (history.length - 1)) * (width - 2 * padding);
    const getY = (weight) => height - padding - ((weight - minWeight) / (maxWeight - minWeight)) * (height - 2 * padding);

    const pointsString = history.map((h, i) => `${getX(i)},${getY(h.weight)}`).join(' ');
    const goalY = getY(selectedStudent.goalWeight);

    return (
      <svg className="sc-chart-svg" viewBox={`0 0 ${width} ${height}`}>
        {/* Grid horizontal lines */}
        {[minWeight, (minWeight + maxWeight) / 2, maxWeight].map((val, idx) => {
          const y = getY(val);
          return (
            <line key={idx} x1={padding} y1={y} x2={width - padding} y2={y} className="sc-chart-grid-line" />
          );
        })}

        {/* Goal line (Green dashed) */}
        <line x1={padding} y1={goalY} x2={width - padding} y2={goalY} className="sc-goal-line" />
        <text x={width - padding - 40} y={goalY - 6} fill="#10b981" fontSize="10" fontWeight="700">META: {selectedStudent.goalWeight} KG</text>

        {/* Main Weight Curve */}
        <polyline points={pointsString} className="sc-chart-line" />

        {/* Points and labels */}
        {history.map((h, i) => {
          const x = getX(i);
          const y = getY(h.weight);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="5" className="sc-chart-point" />
              <text x={x} y={y - 10} className="sc-chart-value-label">{h.weight} kg</text>
              <text x={x} y={height - 8} className="sc-chart-label">{h.date}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  // Add new session note
  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const updatedStudents = students.map(s => {
      if (s.id === selectedStudentId) {
        return {
          ...s,
          notes: [{ date: new Date().toLocaleDateString('es-ES'), text: newNoteText }, ...s.notes]
        };
      }
      return s;
    });

    setStudents(updatedStudents);
    setNewNoteText('');
  };

  // Handle PDF Export / Print
  const handleExportPdf = () => {
    window.print();
  };

  return (
    <div className="sc-dashboard-container">
      {/* ==================== HEADER ==================== */}
      <header className="sc-header">
        <div className="sc-header-left">
          <div className="sc-brand-logo">
            <div className="sc-logo-badge-icon">
              <Dumbbell size={22} />
            </div>
            <div className="sc-brand-title">
              <div className="sc-brand-name-wrapper">
                <h1 className="sc-brand-name">SIERRA COACHING</h1>
                <span className="sc-badge-official">OFFICIAL</span>
              </div>
              <span className="sc-brand-subtitle">Asesoría de Alto Rendimiento • Entrenamiento & Nutrición</span>
            </div>
          </div>

          <div className="sc-header-center-meta">
            <div className="sc-meta-pill active">
              <ShieldCheck size={14} /> ASESORÍA ACTIVA
            </div>
            <div className="sc-meta-pill">
              <Zap size={14} /> @sierrafitn_
            </div>
          </div>
        </div>

        <div className="sc-header-right">
          <div className="sc-user-info">
            <span>Conectado como:</span>
            <span className="sc-user-name">Alejandro Sierra Rincones</span>
          </div>

          <div className="sc-icon-btn" onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)} title="Notificaciones">
            <Bell size={18} />
            <span className="sc-notif-dot"></span>
          </div>

          <div className="sc-icon-btn" title="Modo de pantalla">
            <Moon size={18} />
          </div>

          <button className="sc-btn-logout">
            <LogOut size={16} /> SALIR
          </button>
        </div>
      </header>

      {/* ==================== MAIN BODY ==================== */}
      <div className="sc-body-layout">
        {/* SIDEBAR: MIS ALUMNOS */}
        <aside className="sc-sidebar">
          <div className="sc-sidebar-header">
            <div className="sc-sidebar-title">
              <Users size={18} color="var(--sc-primary)" />
              <span>MIS ALUMNOS</span>
              <span className="sc-student-count-badge">{students.length}</span>
            </div>

            <button className="sc-btn-add-student" onClick={() => setIsAddStudentModalOpen(true)}>
              <Plus size={15} /> Nuevo
            </button>
          </div>

          {/* Search Box */}
          <div className="sc-search-box">
            <Search size={16} className="sc-search-icon" />
            <input
              type="text"
              placeholder="Buscar alumno por nombre o email..."
              className="sc-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter Tabs */}
          <div className="sc-filter-tabs">
            {['todos', 'activos', 'riesgo', 'inactivos'].map((cat) => (
              <button
                key={cat}
                className={`sc-filter-btn ${filterCategory === cat ? 'active' : ''}`}
                onClick={() => setFilterCategory(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {/* Student Cards List */}
          <div className="sc-student-list">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className={`sc-student-card ${selectedStudentId === student.id ? 'selected' : ''}`}
                onClick={() => setSelectedStudentId(student.id)}
              >
                <div className="sc-student-info-left">
                  <div className="sc-student-avatar">
                    {student.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  <div className="sc-student-meta">
                    <span className="sc-student-name">{student.name}</span>
                    <span className="sc-student-email">{student.email}</span>
                  </div>
                </div>

                <div className={`sc-risk-badge ${student.riskLevel === 'high' ? 'high' : student.riskLevel === 'medium' ? 'medium' : 'good'}`}>
                  {student.riskLevel === 'high' && <AlertTriangle size={12} />}
                  {student.riskLevel === 'medium' && <Clock size={12} />}
                  {student.riskLevel === 'good' && <CheckCircle2 size={12} />}
                  <span>{student.riskLevel === 'high' ? 'En Riesgo' : student.riskLevel === 'medium' ? 'Atención' : 'Al día'}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="sc-content-area">
          {/* STUDENT DETAIL HEADER & TAB NAVIGATION */}
          <div className="sc-student-detail-header">
            <div className="sc-student-title-section">
              <span className="sc-subtitle-tag">FICHA DEL ALUMNO</span>
              <h2 className="sc-student-selected-name">{selectedStudent.name}</h2>
            </div>

            <div className="sc-nav-tabs-wrapper">
              <button
                className={`sc-nav-tab ${activeTab === 'pendientes' ? 'active' : ''}`}
                onClick={() => setActiveTab('pendientes')}
              >
                <Clock size={15} /> Pendientes
                {selectedStudent.pendingCheckin && <span className="sc-tab-badge">1</span>}
              </button>
              <button
                className={`sc-nav-tab ${activeTab === 'vista-general' ? 'active' : ''}`}
                onClick={() => setActiveTab('vista-general')}
              >
                <BarChart2 size={15} /> Vista General
              </button>
              <button
                className={`sc-nav-tab ${activeTab === 'resumen' ? 'active' : ''}`}
                onClick={() => setActiveTab('resumen')}
              >
                <Activity size={15} /> Resumen
              </button>
              <button
                className={`sc-nav-tab ${activeTab === 'rutina' ? 'active' : ''}`}
                onClick={() => setActiveTab('rutina')}
              >
                <Dumbbell size={15} /> Editar Rutina
              </button>
              <button
                className={`sc-nav-tab ${activeTab === 'dieta' ? 'active' : ''}`}
                onClick={() => setActiveTab('dieta')}
              >
                <Utensils size={15} /> Editar Dieta
              </button>
              <button
                className={`sc-nav-tab ${activeTab === 'notas' ? 'active' : ''}`}
                onClick={() => setActiveTab('notas')}
              >
                <FileText size={15} /> Notas de Sesión
              </button>
            </div>

            <button className="sc-btn-export-pdf" onClick={handleExportPdf}>
              <Download size={16} /> EXPORTAR PDF
            </button>
          </div>

          {/* TAB CONTENT: RESUMEN */}
          {activeTab === 'resumen' && (
            <div className="sc-tab-content-grid">
              {/* METRICAS DE PROGRESO */}
              <div className="sc-metrics-container">
                <div className="sc-section-header">
                  <div className="sc-section-title">
                    <Target size={18} color="var(--sc-primary)" />
                    <span>MÉTRICAS DE PROGRESO</span>
                  </div>
                  <button className="sc-btn-outline" onClick={() => setIsEditStudentModalOpen(true)}>
                    <Edit3 size={14} /> Editar Datos Alumno
                  </button>
                </div>

                <div className="sc-metrics-grid">
                  <div className="sc-metric-card">
                    <span className="sc-metric-label">OBJETIVO</span>
                    <span className="sc-metric-value">{selectedStudent.objective}</span>
                  </div>
                  <div className="sc-metric-card">
                    <span className="sc-metric-label">ESTATURA</span>
                    <span className="sc-metric-value">{selectedStudent.height} m</span>
                  </div>
                  <div className="sc-metric-card">
                    <span className="sc-metric-label">PESO DE PARTIDA</span>
                    <span className="sc-metric-value">{selectedStudent.startWeight} kg</span>
                  </div>
                  <div className="sc-metric-card">
                    <span className="sc-metric-label">PESO ÚLTIMO REGISTRO</span>
                    <span className="sc-metric-value highlight">{selectedStudent.currentWeight} kg</span>
                    <span className="sc-metric-subtext">
                      <TrendingDown size={14} /> -{(selectedStudent.startWeight - selectedStudent.currentWeight).toFixed(1)} kg totales
                    </span>
                  </div>
                </div>
              </div>

              {/* HISTORIAL CORPORAL & FOTOS SUBIDAS */}
              <div className="sc-dashboard-row-2">
                {/* HISTORIAL CORPORAL (GRAFICO SVG) */}
                <div className="sc-card-box">
                  <div className="sc-section-header">
                    <div className="sc-section-title">
                      <Activity size={18} color="var(--sc-primary)" />
                      <span>HISTORIAL CORPORAL — VARIACIÓN DE PESO (KG)</span>
                    </div>
                    <span className="sc-metric-value highlight">{selectedStudent.currentWeight} KG</span>
                  </div>

                  <div className="sc-chart-wrapper">
                    {renderSvgChart()}
                  </div>
                </div>

                {/* FOTOS SUBIDAS COMPARATOR */}
                <div className="sc-card-box">
                  <div className="sc-section-header">
                    <div className="sc-section-title">
                      <Camera size={18} color="var(--sc-primary)" />
                      <span>FOTOS SUBIDAS</span>
                    </div>
                  </div>

                  <div className="sc-photo-comparer">
                    <div className="sc-photo-views-tab">
                      {['frontal', 'perfil', 'espalda'].map(view => (
                        <button
                          key={view}
                          className={`sc-photo-view-btn ${photoView === view ? 'active' : ''}`}
                          onClick={() => setPhotoView(view)}
                        >
                          {view.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    <div className="sc-photo-display-grid">
                      <div className="sc-photo-card">
                        <div className="sc-photo-tag">INICIO ({selectedStudent.weightHistory[0]?.date})</div>
                        <div className="sc-photo-img-placeholder">
                          <User size={36} />
                          <span style={{ fontSize: '0.75rem' }}>Vista {photoView}</span>
                        </div>
                      </div>

                      <div className="sc-photo-card">
                        <div className="sc-photo-tag">ACTUAL ({selectedStudent.weightHistory[selectedStudent.weightHistory.length - 1]?.date})</div>
                        <div className="sc-photo-img-placeholder">
                          <User size={36} color="var(--sc-primary)" />
                          <span style={{ fontSize: '0.75rem', color: '#fff' }}>Vista {photoView}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: PENDIENTES (CHECK-IN) */}
          {activeTab === 'pendientes' && (
            <div className="sc-card-box">
              <div className="sc-section-header">
                <div className="sc-section-title">
                  <Clock size={18} color="var(--sc-primary)" />
                  <span>CHECK-IN SEMANAL PENDIENTE DE REVISIÓN</span>
                </div>
              </div>

              {selectedStudent.pendingCheckin ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="sc-metrics-grid">
                    <div className="sc-metric-card">
                      <span className="sc-metric-label">FECHA DE ENVÍO</span>
                      <span className="sc-metric-value">{selectedStudent.pendingCheckin.date}</span>
                    </div>
                    <div className="sc-metric-card">
                      <span className="sc-metric-label">PESO REGISTRADO</span>
                      <span className="sc-metric-value highlight">{selectedStudent.pendingCheckin.weight} kg</span>
                    </div>
                    <div className="sc-metric-card">
                      <span className="sc-metric-label">NIVEL DE ENERGÍA (1-10)</span>
                      <span className="sc-metric-value">{selectedStudent.pendingCheckin.energy} / 10</span>
                    </div>
                    <div className="sc-metric-card">
                      <span className="sc-metric-label">ADHERENCIA AL PLAN</span>
                      <span className="sc-metric-value">{selectedStudent.pendingCheckin.compliance}</span>
                    </div>
                  </div>

                  <div className="sc-metric-card">
                    <span className="sc-metric-label">COMENTARIOS Y SENSACIONES DEL ALUMNO</span>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#fff', lineHeight: '1.5' }}>
                      "{selectedStudent.pendingCheckin.comments}"
                    </p>
                  </div>

                  <div className="sc-modal-actions" style={{ justifyContent: 'flex-start' }}>
                    <button className="sc-btn-primary">
                      <CheckCircle2 size={16} /> Marcar como Revisado & Enviar Feedback
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--sc-text-dim)', fontSize: '0.9rem' }}>No hay check-ins pendientes para este alumno.</p>
              )}
            </div>
          )}

          {/* TAB CONTENT: EDITAR RUTINA */}
          {activeTab === 'rutina' && (
            <div className="sc-routine-builder">
              <div className="sc-card-box">
                <div className="sc-section-header">
                  <div className="sc-section-title">
                    <Dumbbell size={18} color="var(--sc-primary)" />
                    <span>PRESCRIPCIÓN DE ENTRENAMIENTO — PLAN VIGENTE</span>
                  </div>
                  <button className="sc-btn-primary">
                    <Plus size={15} /> Agregar Ejercicio
                  </button>
                </div>

                <div className="sc-days-row">
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(day => (
                    <button
                      key={day}
                      className={`sc-day-btn ${selectedDay === day ? 'active' : ''}`}
                      onClick={() => setSelectedDay(day)}
                    >
                      {day}
                    </button>
                  ))}
                </div>

                <div className="sc-table-container">
                  <table className="sc-custom-table">
                    <thead>
                      <tr>
                        <th>EJERCICIO</th>
                        <th>GRUPO MUSCULAR</th>
                        <th>SERIES</th>
                        <th>REPETICIONES</th>
                        <th>RIR / RPE</th>
                        <th>DESCANSO</th>
                        <th>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStudent.workoutPlan.map(item => (
                        <tr key={item.id}>
                          <td><strong>{item.exercise}</strong></td>
                          <td>{item.muscle}</td>
                          <td><input className="sc-input-cell" defaultValue={item.sets} style={{ width: 50 }} /></td>
                          <td><input className="sc-input-cell" defaultValue={item.reps} style={{ width: 80 }} /></td>
                          <td><input className="sc-input-cell" defaultValue={item.rir} style={{ width: 90 }} /></td>
                          <td><input className="sc-input-cell" defaultValue={item.rest} style={{ width: 80 }} /></td>
                          <td>
                            <button className="sc-icon-btn" style={{ width: 30, height: 30 }} title="Eliminar">
                              <Trash2 size={14} color="var(--sc-danger)" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: EDITAR DIETA */}
          {activeTab === 'dieta' && (
            <div className="sc-diet-grid">
              <div className="sc-macro-summary-box">
                <div className="sc-section-title">
                  <Flame size={18} color="var(--sc-primary)" />
                  <span>DISTRIBUCIÓN DE MACROS</span>
                </div>

                <div style={{ textAlign: 'center', margin: '10px 0' }}>
                  <span style={{ fontSize: '2rem', fontWeight: '800', color: '#fff' }}>{selectedStudent.dietPlan.calories}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--sc-text-dim)', display: 'block' }}>KCAL TOTALES / DÍA</span>
                </div>

                <div className="sc-macro-bar-container">
                  <div className="sc-macro-segment protein" style={{ width: '35%' }}></div>
                  <div className="sc-macro-segment carbs" style={{ width: '45%' }}></div>
                  <div className="sc-macro-segment fats" style={{ width: '20%' }}></div>
                </div>

                <div className="sc-macro-legend">
                  <span><span className="sc-macro-dot" style={{ background: '#3b82f6' }}></span>Proteína: {selectedStudent.dietPlan.protein}g</span>
                  <span><span className="sc-macro-dot" style={{ background: '#10b981' }}></span>Carbos: {selectedStudent.dietPlan.carbs}g</span>
                  <span><span className="sc-macro-dot" style={{ background: '#f59e0b' }}></span>Grasas: {selectedStudent.dietPlan.fats}g</span>
                </div>
              </div>

              <div className="sc-card-box">
                <div className="sc-section-header">
                  <div className="sc-section-title">
                    <Utensils size={18} color="var(--sc-primary)" />
                    <span>ESTRUCTURA DE COMIDAS</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedStudent.dietPlan.meals.map((m, idx) => (
                    <div key={idx} className="sc-metric-card">
                      <span className="sc-metric-label">{m.time}</span>
                      <p style={{ margin: 0, color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>{m.items}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: NOTAS DE SESION */}
          {activeTab === 'notas' && (
            <div className="sc-card-box">
              <div className="sc-section-header">
                <div className="sc-section-title">
                  <FileText size={18} color="var(--sc-primary)" />
                  <span>BITÁCORA Y NOTAS PRIVADAS DEL ENTRENADOR</span>
                </div>
              </div>

              <form onSubmit={handleAddNote} style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  placeholder="Agregar nueva nota de sesión..."
                  className="sc-form-input"
                  style={{ flex: 1 }}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                />
                <button type="submit" className="sc-btn-primary">
                  <Save size={16} /> Guardar Nota
                </button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                {selectedStudent.notes.map((note, idx) => (
                  <div key={idx} className="sc-metric-card">
                    <span className="sc-metric-label">{note.date}</span>
                    <p style={{ margin: 0, color: '#fff', fontSize: '0.9rem' }}>{note.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ==================== MODAL: EDITAR DATOS ALUMNO ==================== */}
      {isEditStudentModalOpen && (
        <div className="sc-modal-overlay">
          <div className="sc-modal-card">
            <div className="sc-modal-header">
              <h3 className="sc-modal-title">EDITAR DATOS DE {selectedStudent.name.toUpperCase()}</h3>
              <button className="sc-modal-close-btn" onClick={() => setIsEditStudentModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="sc-form-group">
              <label className="sc-form-label">Objetivo Principal</label>
              <input className="sc-form-input" defaultValue={selectedStudent.objective} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="sc-form-group">
                <label className="sc-form-label">Estatura (m)</label>
                <input className="sc-form-input" defaultValue={selectedStudent.height} />
              </div>
              <div className="sc-form-group">
                <label className="sc-form-label">Peso Objetivo (kg)</label>
                <input className="sc-form-input" defaultValue={selectedStudent.goalWeight} />
              </div>
            </div>

            <div className="sc-modal-actions">
              <button className="sc-btn-outline" onClick={() => setIsEditStudentModalOpen(false)}>Cancelar</button>
              <button className="sc-btn-primary" onClick={() => setIsEditStudentModalOpen(false)}>
                <Save size={16} /> Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
