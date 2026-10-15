import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck, Star, ShieldCheck, Heart, Zap, Award,
  CheckCircle2, AlertCircle, Send, RefreshCw, MessageSquareQuote,
  Sparkles, ThumbsUp, HelpCircle
} from 'lucide-react';
import api from '../../services/api';

const QUESTIONS = [
  // 1. Usabilidad del Sistema (Escala SUS reducida/adaptada)
  {
    id: 'sus_q1',
    dimension: 'Usabilidad (SUS)',
    dimensionIcon: Zap,
    dimensionColor: '#38bdf8',
    question: '1. Me resultó fácil aprender a desbloquear las aplicaciones usando mi ritmo de tecleo.',
    desc: 'Evalúa la curva inicial de aprendizaje del sistema'
  },
  {
    id: 'sus_q2',
    dimension: 'Usabilidad (SUS)',
    dimensionIcon: Zap,
    dimensionColor: '#38bdf8',
    question: '2. Escribir mi frase clave se volvió fluido y natural con la práctica (memoria motora).',
    desc: 'Evalúa la naturalidad al teclear la frase de memoria'
  },
  {
    id: 'sus_q3',
    dimension: 'Usabilidad (SUS)',
    dimensionIcon: Zap,
    dimensionColor: '#38bdf8',
    question: '3. La velocidad de respuesta al autorizar el ingreso es adecuada para el uso cotidiano.',
    desc: 'Evalúa la rapidez y el retardo percibido en el desbloqueo'
  },

  // 2. Percepción de Seguridad y Protección contra Shoulder Surfing
  {
    id: 'sec_q1',
    dimension: 'Seguridad Percibida',
    dimensionIcon: ShieldCheck,
    dimensionColor: '#10b981',
    question: '4. Me siento más seguro sabiendo que un observador (mirón) no puede entrar solo con ver las letras, si no imita mi ritmo.',
    desc: 'Protección biométrica frente a observación directa (Shoulder Surfing)'
  },
  {
    id: 'sec_q2',
    dimension: 'Seguridad Percibida',
    dimensionIcon: ShieldCheck,
    dimensionColor: '#10b981',
    question: '5. Confiaría en TecleoLlave para proteger aplicaciones con datos sensibles (bancos, WhatsApp, galería).',
    desc: 'Confianza de custodia en aplicaciones críticas'
  },

  // 3. Esfuerzo Cognitivo y Fatiga (NASA-TLX simplificado)
  {
    id: 'fatigue_q1',
    dimension: 'Carga Cognitiva y Motora',
    dimensionIcon: Heart,
    dimensionColor: '#a855f7',
    question: '6. Recordar y escribir mi frase requiere poco esfuerzo mental comparado con contraseñas complejas.',
    desc: 'Carga de memoria frente a combinaciones alfanuméricas complejas'
  },
  {
    id: 'fatigue_q2',
    dimension: 'Carga Cognitiva y Motora',
    dimensionIcon: Heart,
    dimensionColor: '#a855f7',
    question: '7. Nivel de comodidad física en dedos y manos al utilizar la frase clave.',
    desc: '1: Mucha molestia/fatiga • 5: Muy cómodo, ninguna molestia física'
  },

  // 4. Tolerancia al Reintento y Adopción (TAM - Technology Acceptance Model)
  {
    id: 'tam_q1',
    dimension: 'Adopción y Tolerancia (TAM)',
    dimensionIcon: Award,
    dimensionColor: '#f59e0b',
    question: '8. Si el sistema deniega el acceso por escribir distraído o caminando, considero comprensible el reintento por seguridad.',
    desc: 'Tolerancia y comprensión ante falsos rechazos situacionales (FRR)'
  },
  {
    id: 'tam_q2',
    dimension: 'Adopción y Tolerancia (TAM)',
    dimensionIcon: Award,
    dimensionColor: '#f59e0b',
    question: '9. Estaría dispuesto a adoptar este sistema como método habitual de seguridad en mi smartphone.',
    desc: 'Intención de uso continuo en el dispositivo móvil diario'
  }
];

const LIKERT_LABELS = {
  1: 'Totalmente en desacuerdo',
  2: 'En desacuerdo',
  3: 'Neutral / Indiferente',
  4: 'De acuerdo',
  5: 'Totalmente de acuerdo'
};

export default function SurveyTab({ participant, onSurveySaved }) {
  const [answers, setAnswers] = useState({
    sus_q1: 5,
    sus_q2: 5,
    sus_q3: 5,
    sec_q1: 5,
    sec_q2: 5,
    fatigue_q1: 5,
    fatigue_q2: 5,
    tam_q1: 5,
    tam_q2: 5
  });

  const [overallScore, setOverallScore] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [submittedData, setSubmittedData] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Cargar respuestas previas si existen
  useEffect(() => {
    let isMounted = true;
    const fetchPreviousSurvey = async () => {
      if (!participant?.id) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.get(`/mobile/study/survey/${participant.id}`);
        if (isMounted && res.data?.has_survey && res.data.survey) {
          const s = res.data.survey;
          setSubmittedData(s);
          if (s.responses) {
            setAnswers(prev => ({ ...prev, ...s.responses }));
          }
          if (s.overall_score) {
            setOverallScore(s.overall_score);
          }
          if (s.comment) {
            setComment(s.comment);
          }
        }
      } catch (err) {
        // Fallback a localStorage si está sin red
        try {
          const cached = localStorage.getItem(`tl_survey_${participant?.id}`);
          if (cached && isMounted) {
            const parsed = JSON.parse(cached);
            setSubmittedData(parsed);
            if (parsed.responses) setAnswers(parsed.responses);
            if (parsed.overall_score) setOverallScore(parsed.overall_score);
            if (parsed.comment) setComment(parsed.comment);
          }
        } catch {}
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchPreviousSurvey();
    return () => { isMounted = false; };
  }, [participant?.id]);

  const handleSelectOption = (questionId, value) => {
    try { navigator.vibrate?.(10); } catch {}
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const calculateLiveSus = () => {
    const vals = Object.values(answers);
    if (!vals.length) return 85.0;
    const raw = vals.reduce((acc, v) => acc + (v - 1), 0);
    const maxPossible = vals.length * 4;
    return Math.round((raw / maxPossible) * 100 * 10) / 10;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!participant?.id) {
      setErrorMsg('Debes registrarte o iniciar sesión con tu código de participante.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      try { navigator.vibrate?.(25); } catch {}

      const payload = {
        participant_id: participant.id,
        overall_score: overallScore,
        responses: answers,
        comment: comment.trim() || null
      };

      const res = await api.post('/mobile/study/survey', payload);
      const data = res.data;

      setSubmittedData({
        ...payload,
        sus_score: data.sus_score,
        security_perception: data.security_perception,
        usability_score: data.usability_score,
        fatigue_level: data.fatigue_level,
        adoption_willingness: data.adoption_willingness
      });

      // Guardar copia local de respaldo
      try {
        localStorage.setItem(`tl_survey_${participant.id}`, JSON.stringify(data));
      } catch {}

      setSuccessMsg('¡Cuestionario guardado exitosamente! Tus respuestas han sido sincronizadas para el análisis empírico del artículo.');
      if (onSurveySaved) {
        onSurveySaved(data);
      }
    } catch (err) {
      console.error('Error enviando formulario:', err);
      // Guardar localmente
      const localData = {
        participant_id: participant.id,
        overall_score: overallScore,
        responses: answers,
        comment: comment.trim(),
        sus_score: calculateLiveSus(),
        offline: true
      };
      try {
        localStorage.setItem(`tl_survey_${participant.id}`, JSON.stringify(localData));
      } catch {}
      setSubmittedData(localData);
      setSuccessMsg('Cuestionario guardado localmente en el dispositivo. Se sincronizará automáticamente con el servidor cuando haya conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSus = calculateLiveSus();
  const susGrade = currentSus >= 80 ? 'Excelente (A)' : currentSus >= 68 ? 'Aceptable / Bueno (B)' : 'Marginal (C)';

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: '0.8rem' }}>
        <RefreshCw size={24} className="tl-spin" color="var(--tl-accent)" />
        <span style={{ fontSize: '0.8rem', color: 'var(--tl-text-secondary)' }}>Cargando cuestionario científico...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2.5rem' }}>
      {/* 1. Encabezado del Cuestionario Científico */}
      <div className="tl-card" style={{
        background: 'linear-gradient(135deg, var(--tl-bg-surface) 0%, rgba(56, 189, 248, 0.08) 100%)',
        border: '1px solid var(--tl-border)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
              <ClipboardCheck size={20} color="var(--tl-accent)" />
              <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--tl-text-primary)' }}>
                Cuestionario Científico
              </h2>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--tl-text-secondary)', margin: 0, lineHeight: 1.4 }}>
              Evaluación de Usabilidad, Seguridad y Aceptación de la Biometría de Tecleo para el <strong>Artículo de Investigación UNT</strong>.
            </p>
          </div>
          <span style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '12px',
            background: submittedData ? 'var(--tl-success-light)' : 'var(--tl-accent-light)',
            color: submittedData ? 'var(--tl-success)' : 'var(--tl-accent)',
            whiteSpace: 'nowrap'
          }}>
            {submittedData ? '✓ Registrado' : 'Estudio Activo'}
          </span>
        </div>

        {/* Resumen de Métrica SUS en Vivo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '0.85rem',
          padding: '0.65rem 0.85rem',
          background: 'var(--tl-bg-surface-elevated)',
          borderRadius: '12px',
          border: '1px solid var(--tl-border)'
        }}>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--tl-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Puntuación SUS Proyectada
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--tl-accent)' }}>
              {currentSus} <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--tl-text-secondary)' }}>/ 100 pts</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--tl-text-muted)' }}>
              Calificación Estándar
            </div>
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              color: currentSus >= 80 ? 'var(--tl-success)' : 'var(--tl-warning)'
            }}>
              {susGrade}
            </span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div style={{
          padding: '0.75rem',
          borderRadius: '12px',
          background: 'var(--tl-success-light)',
          border: '1px solid var(--tl-success)',
          color: 'var(--tl-success)',
          fontSize: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          padding: '0.75rem',
          borderRadius: '12px',
          background: 'var(--tl-danger-light)',
          border: '1px solid var(--tl-danger)',
          color: 'var(--tl-danger)',
          fontSize: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. Formulario de Preguntas por Dimensiones */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        {QUESTIONS.map((q, idx) => {
          const currentValue = answers[q.id] || 3;
          const DimIcon = q.dimensionIcon;

          return (
            <div key={q.id} className="tl-card" style={{ padding: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                <DimIcon size={14} color={q.dimensionColor} />
                <span style={{
                  fontSize: '0.64rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: q.dimensionColor,
                  letterSpacing: '0.04em'
                }}>
                  {q.dimension}
                </span>
              </div>

              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--tl-text-primary)', lineHeight: 1.35, marginBottom: '0.2rem' }}>
                {q.question}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--tl-text-muted)', marginBottom: '0.65rem' }}>
                {q.desc}
              </div>

              {/* Selector de Escala Likert de 1 a 5 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.35rem' }}>
                {[1, 2, 3, 4, 5].map((val) => {
                  const isSelected = currentValue === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSelectOption(q.id, val)}
                      style={{
                        padding: '0.55rem 0',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid var(--tl-accent)' : '1px solid var(--tl-border)',
                        background: isSelected ? 'var(--tl-accent-light)' : 'var(--tl-bg-surface-elevated)',
                        color: isSelected ? 'var(--tl-accent)' : 'var(--tl-text-secondary)',
                        fontWeight: isSelected ? 800 : 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{val}</span>
                      <span style={{ fontSize: '0.52rem', opacity: 0.75 }}>
                        {val === 1 ? 'Mín' : val === 5 ? 'Máx' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div style={{
                textAlign: 'center',
                fontSize: '0.68rem',
                color: 'var(--tl-accent)',
                fontWeight: 600,
                marginTop: '0.35rem'
              }}>
                {LIKERT_LABELS[currentValue]}
              </div>
            </div>
          );
        })}

        {/* 3. Calificación Global de Satisfacción (1 a 5 Estrellas) */}
        <div className="tl-card" style={{ padding: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
            <Sparkles size={14} color="#f59e0b" />
            <span style={{ fontSize: '0.64rem', fontWeight: 700, textTransform: 'uppercase', color: '#f59e0b' }}>
              Satisfacción Global
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.65rem' }}>
            10. ¿Cuál es tu calificación global general para el sistema TecleoLlave?
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => {
                  try { navigator.vibrate?.(10); } catch {}
                  setOverallScore(star);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease'
                }}
              >
                <Star
                  size={32}
                  fill={star <= overallScore ? '#f59e0b' : 'none'}
                  color={star <= overallScore ? '#f59e0b' : 'var(--tl-border)'}
                  strokeWidth={1.8}
                />
              </button>
            ))}
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.74rem', color: 'var(--tl-text-secondary)', fontWeight: 600 }}>
            {overallScore === 5 ? 'Excelente experiencia' : overallScore === 4 ? 'Muy buena experiencia' : overallScore === 3 ? 'Aceptable' : 'Por mejorar'}
          </div>
        </div>

        {/* 4. Comentarios Cualitativos para Citas del Artículo */}
        <div className="tl-card" style={{ padding: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
            <MessageSquareQuote size={14} color="var(--tl-accent)" />
            <span style={{ fontSize: '0.64rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--tl-accent)' }}>
              Aportes Cualitativos para el Paper
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--tl-text-primary)', marginBottom: '0.35rem' }}>
            11. Comentarios, sugerencias o impresiones sobre el tecleo biométrico:
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--tl-text-muted)', marginBottom: '0.5rem' }}>
            ¿Qué aspecto te pareció más innovador o qué sugerencia aportarías para futuras versiones?
          </div>

          <textarea
            className="tl-input"
            rows={3}
            placeholder="Ej. Me pareció muy seguro contra mirones y fácil de usar después de la calibración..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{ width: '100%', resize: 'none', fontSize: '0.76rem', lineHeight: '1.4' }}
          />
        </div>

        {/* Botón de Envío */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="tl-btn-primary"
          style={{
            padding: '0.85rem',
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginTop: '0.3rem',
            boxShadow: '0 4px 14px rgba(56, 189, 248, 0.25)'
          }}
        >
          {isSubmitting ? (
            <>
              <RefreshCw size={16} className="tl-spin" />
              <span>Guardando en el Observatorio...</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>{submittedData ? 'Actualizar Respuestas del Paper' : 'Enviar Respuestas para el Artículo'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
