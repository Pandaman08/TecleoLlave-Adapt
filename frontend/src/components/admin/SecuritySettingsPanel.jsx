import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Lock,
  Unlock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sliders,
  Users,
  ShieldCheck,
  Save
} from 'lucide-react';
import api from '../../services/api';

export default function SecuritySettingsPanel() {
  const [policy, setPolicy] = useState({
    max_failed_attempts: 5,
    lockout_duration_seconds: 15,
    is_enabled: true
  });
  const [usersStatus, setUsersStatus] = useState([]);
  const [loadingPolicy, setLoadingPolicy] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [unlockingUserId, setUnlockingUserId] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Cargar política de seguridad desde el backend
  const fetchPolicy = useCallback(async () => {
    try {
      setLoadingPolicy(true);
      const res = await api.get('/admin/security/policy');
      setPolicy({
        max_failed_attempts: res.data.max_failed_attempts ?? 5,
        lockout_duration_seconds: res.data.lockout_duration_seconds ?? 15,
        is_enabled: Boolean(res.data.is_enabled)
      });
    } catch (err) {
      console.error('Error cargando política de seguridad:', err);
      setErrorMessage('No se pudo cargar la política de seguridad.');
    } finally {
      setLoadingPolicy(false);
    }
  }, []);

  // Cargar estado de bloqueo de usuarios
  const fetchUsersStatus = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const res = await api.get('/admin/security/users-status');
      setUsersStatus(res.data || []);
    } catch (err) {
      console.error('Error cargando estado de usuarios:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicy();
    fetchUsersStatus();
  }, [fetchPolicy, fetchUsersStatus]);

  // Guardar cambios en la política
  const handleSavePolicy = async (e) => {
    e?.preventDefault();
    setSavingPolicy(true);
    setFeedbackMessage(null);
    setErrorMessage(null);

    try {
      const payload = {
        max_failed_attempts: Number(policy.max_failed_attempts),
        lockout_duration_seconds: Number(policy.lockout_duration_seconds),
        is_enabled: Boolean(policy.is_enabled)
      };
      const res = await api.put('/admin/security/policy', payload);
      setFeedbackMessage(res.data?.message || '¡Política de seguridad actualizada con éxito!');
      await fetchPolicy();
      await fetchUsersStatus();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err) {
      const detail = err.response?.data?.detail || err.message;
      setErrorMessage(`Error guardando política: ${detail}`);
    } finally {
      setSavingPolicy(false);
    }
  };

  // Desbloqueo administrativo de un usuario
  const handleUnlockUser = async (userId, username) => {
    setUnlockingUserId(userId);
    setFeedbackMessage(null);
    setErrorMessage(null);

    try {
      const res = await api.post(`/admin/security/unlock-user/${userId}`);
      setFeedbackMessage(res.data?.message || `Cuenta de '${username}' desbloqueada correctamente.`);
      await fetchUsersStatus();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err) {
      const detail = err.response?.data?.detail || err.message;
      setErrorMessage(`Error al desbloquear usuario: ${detail}`);
    } finally {
      setUnlockingUserId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.2s ease' }}>
      {/* Header del Panel */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem 1.75rem',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--brand-500)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            <ShieldAlert size={15} />
            <span>Configuración Exclusiva de Administrador</span>
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
            Políticas de Seguridad y Límite de Intentos de Frase
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Configura el número máximo de intentos fallidos en la frase de verificación y la duración del bloqueo temporal para prevenir accesos no autorizados.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => { fetchPolicy(); fetchUsersStatus(); }}
          disabled={loadingPolicy || loadingUsers}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
        >
          <RefreshCw size={14} className={(loadingPolicy || loadingUsers) ? 'animate-spin' : ''} />
          <span>Actualizar Datos</span>
        </button>
      </div>

      {/* Mensajes de Feedback */}
      {feedbackMessage && (
        <div style={{
          backgroundColor: 'var(--success-bg)',
          border: '1px solid var(--success-border)',
          color: 'var(--success)',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.86rem',
          fontWeight: 600
        }}>
          <CheckCircle2 size={18} />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div style={{
          backgroundColor: 'var(--danger-bg)',
          border: '1px solid var(--danger-border)',
          color: 'var(--danger)',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.86rem',
          fontWeight: 600
        }}>
          <AlertTriangle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Grid de 2 Columnas: Formulario de Configuración y Tabla de Usuarios */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Tarjeta 1: Parámetros de la Política */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <Sliders size={18} style={{ color: 'var(--brand-500)' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Parámetros de Bloqueo de Frase
            </h3>
          </div>

          <form onSubmit={handleSavePolicy} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {/* Límite de Intentos */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Máximo de Intentos Permitidos en la Frase
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={policy.max_failed_attempts}
                  onChange={(e) => setPolicy(prev => ({ ...prev, max_failed_attempts: e.target.value }))}
                  required
                  style={{
                    width: '100px',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-canvas)',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
                    fontWeight: 700
                  }}
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  intentos consecutivos (configurado: 5)
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                Si una persona falla la frase este número de veces, la cuenta se bloquea automáticamente.
              </span>
            </div>

            {/* Duración del Bloqueo */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Duración del Bloqueo Temporal (Segundos)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="number"
                  min="5"
                  max="3600"
                  value={policy.lockout_duration_seconds}
                  onChange={(e) => setPolicy(prev => ({ ...prev, lockout_duration_seconds: e.target.value }))}
                  required
                  style={{
                    width: '100px',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-canvas)',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
                    fontWeight: 700
                  }}
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  segundos de inhabilitación (ej. 15s para pruebas rápidas, 60s, 300s)
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                Tiempo durante el cual el usuario no podrá intentar autenticarse, salvo desbloqueo manual.
              </span>
            </div>

            {/* Switch de Activación */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-canvas)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                  Estado de la Política de Bloqueo
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {policy.is_enabled ? 'Bloqueo temporal ACTIVO' : 'Bloqueo temporal DESACTIVADO'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={policy.is_enabled}
                onChange={(e) => setPolicy(prev => ({ ...prev, is_enabled: e.target.checked }))}
                style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--brand-500)' }}
              />
            </div>

            {/* Botón Guardar */}
            <button
              type="submit"
              disabled={savingPolicy}
              className="btn-primary"
              style={{
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                marginTop: '0.25rem'
              }}
            >
              <Save size={16} />
              <span>{savingPolicy ? 'Guardando Cambios...' : 'Guardar Configuración de Bloqueo'}</span>
            </button>
          </form>
        </div>

        {/* Tarjeta 2: Monitoreo de Usuarios y Desbloqueo */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} style={{ color: 'var(--brand-500)' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Monitoreo de Cuentas ({usersStatus.length})
              </h3>
            </div>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
            Visualiza los intentos fallidos de los usuarios y desbloquea manualmente cualquier cuenta inhabilitada.
          </p>

          <div style={{ overflowX: 'auto', maxHeight: '340px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.5rem 0.6rem' }}>Usuario</th>
                  <th style={{ padding: '0.5rem 0.6rem' }}>Fallos Frase</th>
                  <th style={{ padding: '0.5rem 0.6rem' }}>Estado</th>
                  <th style={{ padding: '0.5rem 0.6rem' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {usersStatus.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No hay usuarios registrados con perfil conductual.
                    </td>
                  </tr>
                ) : (
                  usersStatus.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.65rem 0.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {u.username}
                      </td>
                      <td style={{ padding: '0.65rem 0.6rem' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: u.failed_attempts > 0 ? 'var(--danger)' : 'var(--text-muted)'
                        }}>
                          {u.failed_attempts} / {policy.max_failed_attempts}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.6rem' }}>
                        {u.is_locked ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            color: 'var(--danger)',
                            fontWeight: 700,
                            fontSize: '0.72rem'
                          }}>
                            <Lock size={12} />
                            Bloqueado ({u.remaining_seconds ? `${u.remaining_seconds}s` : `${u.remaining_minutes || 1}m`})
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            color: 'var(--success)',
                            fontWeight: 700,
                            fontSize: '0.72rem'
                          }}>
                            <ShieldCheck size={12} />
                            Normal
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.65rem 0.6rem' }}>
                        {u.is_locked || u.failed_attempts > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleUnlockUser(u.id, u.username)}
                            disabled={unlockingUserId === u.id}
                            className="btn-secondary"
                            style={{
                              fontSize: '0.72rem',
                              padding: '0.25rem 0.55rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              color: 'var(--brand-500)',
                              borderColor: 'var(--brand-500)'
                            }}
                            title="Restablecer intentos y desbloquear cuenta"
                          >
                            <Unlock size={12} />
                            <span>{unlockingUserId === u.id ? 'Desbloqueando...' : 'Desbloquear'}</span>
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
