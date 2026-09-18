import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import AulaLayout from '../../components/aula/AulaLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  BookOpen,
  GraduationCap,
  PenTool,
  Gamepad2,
  Crown,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  Zap,
  TrendingUp,
  User,
  ChevronRight
} from 'lucide-react';

export default function AulaDashboard() {
  const { username, userId } = useAuth();
  const navigate = useNavigate();

  const [userData, setUserData] = useState(null);
  const [modelSummary, setModelSummary] = useState(null);
  const [driftInfo, setDriftInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentDashboard();
  }, [userId]);

  const loadStudentDashboard = async () => {
    setLoading(true);
    try {
      if (userId) {
        const [sumRes, driftRes] = await Promise.all([
          api.get(`/dashboard/summary/${userId}`).catch(() => ({ data: null })),
          api.get(`/adaptive/drift/${userId}`).catch(() => ({ data: null }))
        ]);
        setModelSummary(sumRes.data);
        setDriftInfo(driftRes.data);
      }
    } catch (e) {
      console.error('Error cargando datos del estudiante:', e);
    } finally {
      setLoading(false);
    }
  };

  const courses = [
    {
      id: 'seg-info',
      title: 'Seguridad de la Información',
      code: 'SI-801',
      teacher: 'Ing. Supervisor de Ciberseguridad',
      progress: 75,
      nextTask: 'Actividad 01: Transcripción de Directivas de Criptografía',
      dueDate: 'Mañana, 23:59',
      color: '#4f46e5',
      badge: 'En Curso'
    },
    {
      id: 'ia-bio',
      title: 'Biometría Conductual e Inteligencia Artificial',
      code: 'IA-802',
      teacher: 'Área de Ciencias de la Computación',
      progress: 60,
      nextTask: 'Laboratorio: Evaluación de Dinámica de Tecleo',
      dueDate: 'Viernes, 18:00',
      color: '#0ea5e9',
      badge: 'En Curso'
    },
    {
      id: 'sis-dist',
      title: 'Sistemas Distribuidos y Tolerancia a Fallos',
      code: 'SD-803',
      teacher: 'Área de Arquitectura de Software',
      progress: 88,
      nextTask: 'Entrega Final: Redes Resilientes',
      dueDate: 'Próxima semana',
      color: '#10b981',
      badge: 'Al Día'
    }
  ];

  return (
    <AulaLayout>
      {/* Welcome Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.12) 0%, rgba(99, 102, 241, 0.04) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.75rem 2rem',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--brand-500)'
            }}>
              Semestre Académico 2026-II
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Campus Virtual de Ingeniería
            </span>
          </div>

          <h1 style={{
            fontSize: '1.65rem',
            fontWeight: 800,
            margin: '0 0 0.5rem 0',
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em'
          }}>
            Bienvenido al Aula Virtual, {username || 'Estudiante'} 👋
          </h1>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Tus actividades académicas y ejercicios de aula cuentan con autenticación continua mediante <strong>dinámica de tecleo</strong>. El sistema protege tu sesión mientras estudias y realizas actividades.
          </p>
        </div>

        {/* Biometric Status Quick Widget */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '1.25rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          minWidth: '260px',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Estado Biométrico
            </span>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'var(--success)'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)', display: 'inline-block' }}></span>
              ACTIVO
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Modelo Perfil</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--brand-500)' }}>
                M{modelSummary?.active_model_version || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Deriva (Drift)</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {driftInfo?.severity || 'ESTABLE'}
              </div>
            </div>
          </div>

          <NavLink
            to="/aula/perfil"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--brand-500)',
              textDecoration: 'none',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--border-subtle)'
            }}
          >
            <span>Ver ficha biométrica</span>
            <ChevronRight size={14} />
          </NavLink>
        </div>
      </div>

      {/* Grid: Mis Cursos Matriculados */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
              Mis Cursos Universitarios
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Asignaturas activas durante el ciclo académico
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem'
        }}>
          {courses.map((course) => (
            <div
              key={course.id}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-canvas)',
                    color: course.color,
                    border: `1px solid ${course.color}30`
                  }}>
                    {course.code}
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)'
                  }}>
                    {course.badge}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: 'var(--text-primary)' }}>
                  {course.title}
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
                  {course.teacher}
                </p>

                {/* Progress bar */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Progreso del curso</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{course.progress}%</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--bg-canvas)', overflow: 'hidden' }}>
                    <div style={{ width: `${course.progress}%`, height: '100%', backgroundColor: course.color, borderRadius: '3px' }}></div>
                  </div>
                </div>

                {/* Next task box */}
                <div style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: 'var(--brand-500)', fontWeight: 600, marginBottom: '0.25rem' }}>
                    <Clock size={12} />
                    <span>Próxima Actividad</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {course.nextTask}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    Vence: {course.dueDate}
                  </div>
                </div>
              </div>

              <NavLink
                to="/aula/actividades"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'background 0.2s'
                }}
              >
                <span>Ir a Actividades del Curso</span>
                <ArrowRight size={15} />
              </NavLink>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Interactive Activities (Escritura, Mario 30 Niveles, Ajedrez) */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
            Actividades Académicas e Interactivas de Dinámica de Tecleo
          </h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Realiza actividades académicas y desafíos donde el sistema registra tu cadencia de pulsación sin alterar tu experiencia
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem'
        }}>
          {/* Card 1: Actividades de Escritura */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                color: 'var(--brand-500)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <PenTool size={24} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: 'var(--text-primary)' }}>
                Talleres de Redacción y Transcripción
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                Ejercicios guiados de redacción técnica sobre directivas de seguridad. El sistema captura tiempos de pulsación (Hold Time) y latencias entre teclas para enriquecer tu perfil adaptativo.
              </p>
            </div>
            <NavLink
              to="/aula/actividades"
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <span>Comenzar Actividad de Escritura</span>
              <ArrowRight size={16} />
            </NavLink>
          </div>

          {/* Card 2: Juego Mario Bros 30 Niveles */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <Gamepad2 size={24} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Super Mario: 30 Niveles
                </h3>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: '#d97706',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '999px'
                }}>
                  PAUSA ACTIVA
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                Minijuego clásico de plataformas 2D con 30 niveles para relajarse y no aburrirse en el aula. <strong>Actividad externa recreativa: No mide telemetría ni recopila métricas de tecleo.</strong>
              </p>
            </div>
            <NavLink
              to="/aula/juego-mario"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.65rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#f59e0b',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)'
              }}
            >
              <span>Jugar Mario 30 Niveles 🍄</span>
              <ArrowRight size={16} />
            </NavLink>
          </div>

          {/* Card 3: Ajedrez Táctico */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <Crown size={24} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Ajedrez Universitario
                </h3>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--success)',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '999px'
                }}>
                  RECREATIVO
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                Partida recreativa de ajedrez para ejercitar la mente durante pausas de estudio. <strong>Actividad externa recreativa: No mide telemetría ni recopila métricas de tecleo.</strong>
              </p>
            </div>
            <NavLink
              to="/aula/juego-ajedrez"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.65rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--success)',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
              }}
            >
              <span>Jugar Ajedrez Táctico ♟️</span>
              <ArrowRight size={16} />
            </NavLink>
          </div>
        </div>
      </div>
    </AulaLayout>
  );
}
