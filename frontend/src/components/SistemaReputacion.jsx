import React, { useState } from 'react';
import { Star, Award, ShieldCheck, CheckCircle2, MessageSquare, ThumbsUp, Sparkles } from 'lucide-react';

export default function SistemaReputacion({ targetUser, initialRating = 4.8, initialReviews = [] }) {
  const [rating, setRating] = useState(initialRating);
  const [reviews, setReviews] = useState(initialReviews.length > 0 ? initialReviews : [
    {
      id: 1,
      author: 'Arnold Mendoza',
      role: 'Estudiante UCC - Santa Marta',
      date: '20/07/2026',
      rating: 5,
      comment: 'Excelente anfitrión, el lugar es muy limpio y seguro. Totalmente recomendado para estancias universitarias.',
      badge: 'Huésped Verificado'
    },
    {
      id: 2,
      author: 'María Isabel Díaz',
      role: 'Docente UCC - Barranquilla',
      date: '12/07/2026',
      rating: 4.8,
      comment: 'Muy buena atención y excelente ubicación cerca a la universidad.',
      badge: 'Comunidad Solidaria'
    }
  ]);

  // Rating Form state
  const [newRating, setNewRating] = useState({
    hospitalidad: 5,
    limpieza: 5,
    veracidad: 5,
    convivencia: 5,
    comment: ''
  });
  const [showReviewForm, setShowReviewForm] = useState(false);

  const calculateAverage = (r) => {
    return ((r.hospitalidad + r.limpieza + r.veracidad + r.convivencia) / 4).toFixed(1);
  };

  const handleAddReview = (e) => {
    e.preventDefault();
    if (!newRating.comment.trim()) return;

    const avg = calculateAverage(newRating);
    const item = {
      id: Date.now(),
      author: 'Tú (Usuario Verificado)',
      role: 'Estudiante UCC',
      date: new Date().toLocaleDateString('es-CO'),
      rating: parseFloat(avg),
      comment: newRating.comment,
      badge: 'Evaluación Reciente'
    };

    setReviews([item, ...reviews]);
    setNewRating({ hospitalidad: 5, limpieza: 5, veracidad: 5, convivencia: 5, comment: '' });
    setShowReviewForm(false);
  };

  const isTrustedHost = rating >= 4.5;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: 20 }}>
      {/* Header & Badges */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <Award size={20} className="text-ucc-green" />
            <span>Sistema de Reputación Solidaria UCC</span>
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Índice de confianza y evaluaciones comunitarias entre estudiantes y docentes.
          </span>
        </div>

        {/* Badges Display */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isTrustedHost && (
            <div style={{ background: 'rgba(13, 124, 61, 0.12)', border: '1px solid rgba(13, 124, 61, 0.4)', color: '#0d7c3d', padding: '6px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} /> ANFITRIÓN DESTACADO UCC
            </div>
          )}
          <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#d97706', padding: '6px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Star size={16} fill="#d97706" /> {rating} / 5.0 ({reviews.length} Reseñas)
          </div>
        </div>
      </div>

      {/* Criteria Rating Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', padding: 12, borderRadius: 10 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Hospitalidad UCC</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>4.9 ★</div>
        </div>
        <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', padding: 12, borderRadius: 10 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Limpieza & Orden</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>4.8 ★</div>
        </div>
        <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', padding: 12, borderRadius: 10 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Veracidad Publicación</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>5.0 ★</div>
        </div>
        <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', padding: 12, borderRadius: 10 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Convivencia Solidaria</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>4.9 ★</div>
        </div>
      </div>

      {/* Add Review Button & Form */}
      <div>
        {!showReviewForm ? (
          <button
            onClick={() => setShowReviewForm(true)}
            style={{ background: 'var(--ucc-green)', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <MessageSquare size={16} /> Escribir Reseña sobre este Alojamiento
          </button>
        ) : (
          <form onSubmit={handleAddReview} style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)' }}>Evaluar Alojamiento Solidario</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Hospitalidad (1-5)</label>
                <input type="number" min="1" max="5" value={newRating.hospitalidad} onChange={e => setNewRating({ ...newRating, hospitalidad: Number(e.target.value) })} className="form-control" style={{ padding: 6, fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Limpieza (1-5)</label>
                <input type="number" min="1" max="5" value={newRating.limpieza} onChange={e => setNewRating({ ...newRating, limpieza: Number(e.target.value) })} className="form-control" style={{ padding: 6, fontSize: '0.85rem' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Comentario / Experiencia</label>
              <textarea rows="2" value={newRating.comment} onChange={e => setNewRating({ ...newRating, comment: e.target.value })} placeholder="Escribe tu opinión respecto al hospedaje..." className="form-control" style={{ padding: 8, fontSize: '0.85rem' }} required />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowReviewForm(false)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Cancelar</button>
              <button type="submit" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem', background: 'var(--ucc-green)' }}>Publicar Reseña</button>
            </div>
          </form>
        )}
      </div>

      {/* Reviews List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {reviews.map((rev) => (
          <div key={rev.id} style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800 }}>
                  {rev.author[0]}
                </div>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text)' }}>{rev.author}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>{rev.role} • {rev.date}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: 6, color: '#d97706', fontSize: '0.8rem', fontWeight: 800 }}>
                <Star size={14} fill="#d97706" /> {rev.rating}
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text)', lineHeight: '1.4' }}>"{rev.comment}"</p>
          </div>
        ))}
      </div>
    </div>
  );
}
