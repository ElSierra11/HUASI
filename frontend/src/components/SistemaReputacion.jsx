import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Award, ShieldCheck, MessageSquare, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import HuasiAlert from '../utils/alerts';

export default function SistemaReputacion({
  targetUser,
  initialRating = 0,
  initialReviews = [],
  propiedadId,
  userReservation,
  onReviewAdded
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState(initialReviews || []);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newRating, setNewRating] = useState({
    calificacion: 5,
    comentario: ''
  });

  // Sincronizar reseñas cuando cambian los props desde la API
  useEffect(() => {
    if (Array.isArray(initialReviews)) {
      setReviews(initialReviews);
    }
  }, [initialReviews]);

  // Normalizar estructura de cada reseña (compatible con Backend SQL y datos legacy)
  const normalizeReview = (rev) => {
    let authorName = 'Usuario UCC';
    if (rev.autor_nombre) {
      authorName = `${rev.autor_nombre} ${rev.autor_apellido || ''}`.trim();
    } else if (rev.author) {
      authorName = rev.author;
    }

    const ratingVal = Number(rev.calificacion || rev.rating || 5);
    const commentText = rev.comentario || rev.comment || '';
    
    let formattedDate = 'Reciente';
    if (rev.created_at || rev.date) {
      try {
        const d = new Date(rev.created_at || rev.date);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
        }
      } catch {
        formattedDate = rev.date || 'Reciente';
      }
    }

    return {
      id: rev.id,
      author: authorName,
      initial: authorName.charAt(0).toUpperCase() || 'U',
      rating: ratingVal,
      comment: commentText,
      date: formattedDate,
      role: rev.role || 'Estudiante UCC • Comunidad Solidaria',
      badge: rev.badge || 'Huésped Verificado UCC'
    };
  };

  // Calcular promedio real de estrellas
  const currentReviews = reviews.map(normalizeReview);
  const totalReviews = currentReviews.length;
  const computedRating = totalReviews > 0
    ? (currentReviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : (Number(initialRating) > 0 ? Number(initialRating).toFixed(1) : 'Nuevo');

  const isTrustedHost = parseFloat(computedRating) >= 4.5;

  const handleOpenReviewForm = () => {
    if (!user) {
      HuasiAlert.warning('Inicia Sesión', 'Debes iniciar sesión con tu cuenta institucional para evaluar un alojamiento.');
      navigate('/login');
      return;
    }

    // Verificar si el usuario tiene una reserva completada para esta propiedad
    if (!userReservation || userReservation.estado !== 'completada') {
      HuasiAlert.info(
        'Evaluación Verificada',
        'Para garantizar la confianza y seguridad de la comunidad HUASI, solo los estudiantes o docentes con estadía completada en este alojamiento pueden dejar una reseña.'
      );
      return;
    }

    setShowReviewForm(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newRating.comentario.trim()) {
      HuasiAlert.warning('Comentario requerido', 'Por favor ingresa tu opinión o experiencia.');
      return;
    }

    if (!userReservation?.id) {
      HuasiAlert.error('Error', 'No se encontró la reserva asociada a este alojamiento.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/resenas', {
        reserva_id: userReservation.id,
        calificacion: newRating.calificacion,
        comentario: newRating.comentario
      });

      HuasiAlert.success('¡Reseña Publicada!', 'Tu experiencia ha sido compartida públicamente con toda la comunidad universitaria.');
      setShowReviewForm(false);
      setNewRating({ calificacion: 5, comentario: '' });

      if (typeof onReviewAdded === 'function') {
        onReviewAdded();
      }
    } catch (err) {
      HuasiAlert.error('Error', err.response?.data?.error || 'No se pudo registrar la reseña');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: 22 }}>
      {/* Header & Badges */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <Award size={22} className="text-ucc-green" />
            <span>Sistema de Reputación Solidaria UCC</span>
          </h3>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Evaluaciones y experiencias compartidas por la comunidad universitaria {targetUser ? `sobre ${targetUser}` : ''}.
          </span>
        </div>

        {/* Badges Display */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isTrustedHost && totalReviews > 0 && (
            <div style={{ background: 'rgba(13, 124, 61, 0.12)', border: '1px solid rgba(13, 124, 61, 0.4)', color: '#0d7c3d', padding: '6px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} /> ANFITRIÓN DESTACADO UCC
            </div>
          )}
          <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#d97706', padding: '6px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Star size={16} fill="#d97706" /> {computedRating} / 5.0 ({totalReviews} {totalReviews === 1 ? 'Reseña' : 'Reseñas'})
          </div>
        </div>
      </div>

      {/* Write Review Button / Form Trigger */}
      <div>
        {!showReviewForm ? (
          <button
            onClick={handleOpenReviewForm}
            style={{ background: 'var(--ucc-green)', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <MessageSquare size={16} /> Evaluar este Alojamiento
          </button>
        ) : (
          <form onSubmit={handleSubmitReview} style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text)' }}>Calificar tu estancia en este alojamiento</h4>
            
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Calificación General (1 a 5 estrellas)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewRating(r => ({ ...r, calificacion: star }))}
                    style={{
                      border: '1px solid var(--border)',
                      background: newRating.calificacion >= star ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-card)',
                      color: newRating.calificacion >= star ? '#d97706' : 'var(--text-muted)',
                      borderRadius: 8,
                      width: 42,
                      height: 42,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 700
                    }}
                  >
                    <Star size={18} fill={newRating.calificacion >= star ? '#d97706' : 'transparent'} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Tu Opinión y Recomendación Comunitaria</label>
              <textarea
                rows="3"
                value={newRating.comentario}
                onChange={e => setNewRating(r => ({ ...r, comentario: e.target.value }))}
                placeholder="Describe qué tal estuvo la estancia, hospitalidad del anfitrión, limpieza, cercanía a la sede..."
                className="form-control"
                style={{ padding: 10, fontSize: '0.88rem' }}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.82rem', background: 'var(--ucc-green)' }}
                disabled={submitting}
              >
                {submitting ? 'Publicando...' : 'Publicar Reseña'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Reviews List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {totalReviews === 0 ? (
          <div style={{ background: 'var(--bg-main)', border: '1px dashed var(--border)', borderRadius: 12, padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>Aún no hay reseñas para este alojamiento</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>Las opiniones y calificaciones de los huéspedes que se alojen aquí aparecerán en esta sección de forma pública.</p>
          </div>
        ) : (
          currentReviews.map((rev) => (
            <div key={rev.id} style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800 }}>
                    {rev.initial}
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.92rem', color: 'var(--text)', display: 'block' }}>{rev.author}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>{rev.role} • {rev.date}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(245, 158, 11, 0.12)', padding: '4px 10px', borderRadius: 8, color: '#d97706', fontSize: '0.85rem', fontWeight: 800 }}>
                  <Star size={15} fill="#d97706" /> {rev.rating} / 5
                </div>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--text)', lineHeight: '1.45' }}>
                "{rev.comment}"
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
