import { useEffect, useState } from 'react'
import api from '../services/api'

function Dashboard() {
  const [health, setHealth] = useState(null)
  const [summary, setSummary] = useState(null)
  const [authMetrics, setAuthMetrics] = useState(null)
  const [timeSeries, setTimeSeries] = useState([])
  const [models, setModels] = useState([])
  const [adaptation, setAdaptation] = useState(null)
  const [adaptationTimeline, setAdaptationTimeline] = useState([])
  const [candidateStatus, setCandidateStatus] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(1)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadDashboard()
  }, [userId])

  const loadDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      // Health check
      const healthRes = await api.get('/health')
      setHealth(healthRes.data)

      // Load all metrics for user
      const [
        summaryRes,
        authMetricsRes,
        timeSeriesRes,
        modelsRes,
        adaptationRes,
        timelineRes,
        candidateRes,
        comparisonRes
      ] = await Promise.all([
        api.get(`/dashboard/summary/${userId}`),
        api.get(`/dashboard/auth-metrics/${userId}`),
        api.get(`/dashboard/time-series/${userId}`),
        api.get(`/dashboard/models/${userId}`),
        api.get(`/dashboard/adaptation/${userId}`),
        api.get(`/dashboard/adaptation-timeline/${userId}`),
        api.get(`/dashboard/candidate-status/${userId}`),
        api.get(`/dashboard/comparison/${userId}`)
      ].map(p => p.catch(() => ({ data: null }))))

      setSummary(summaryRes.data)
      setAuthMetrics(authMetricsRes.data)
      setTimeSeries(timeSeriesRes.data || [])
      setModels(modelsRes.data || [])
      setAdaptation(adaptationRes.data)
      setAdaptationTimeline(timelineRes.data || [])
      setCandidateStatus(candidateRes.data)
      setComparison(comparisonRes.data)
    } catch (err) {
      setError('Error cargando dashboard: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="card">Cargando dashboard...</div>
  }

  return (
    <div>
      {error && (
        <div className="card" style={{ background: '#fadbd8', color: '#e74c3c' }}>
          {error}
        </div>
      )}

      <div className="card">
        <h2>Estado del Sistema</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <strong>API Status:</strong>
            <span className={health?.status === 'ok' ? ' status-ok' : ' status-error'}>
              {health?.status?.toUpperCase() || 'DESCONOCIDO'}
            </span>
          </div>
          <div>
            <strong>Base de Datos:</strong>
            <span className={health?.db === 'connected' ? ' status-ok' : ' status-error'}>
              {health?.db?.toUpperCase() || 'DESCONOCIDO'}
            </span>
          </div>
          <div>
            <strong>Versión:</strong> {health?.version || 'N/A'}
          </div>
        </div>
      </div>

      {summary && (
        <div className="card">
          <h2>Resumen de Usuario</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div><strong>Usuario:</strong> {summary.username}</div>
            <div><strong>Modelo Activo:</strong> v{summary.active_model_version || 'N/A'}</div>
            <div><strong>Total Muestras:</strong> {summary.total_samples}</div>
            <div><strong>Muestras Enrolamiento:</strong> {summary.enrollment_samples}</div>
            <div><strong>Muestras Autenticación:</strong> {summary.auth_samples}</div>
            <div><strong>Intentos Auth:</strong> {summary.total_auth_attempts}</div>
            <div><strong>Adaptaciones:</strong> {summary.total_adaptations}</div>
          </div>
        </div>
      )}

      {authMetrics && (
        <div className="card">
          <h2>Métricas de Autenticación (30 días)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div><strong>Total Intentos:</strong> {authMetrics.total_attempts}</div>
            <div><strong>Permitidos:</strong> <span className="status-ok">{authMetrics.allow_count}</span></div>
            <div><strong>Challenge:</strong> <span style={{color: '#f39c12'}}>{authMetrics.challenge_count}</span></div>
            <div><strong>Rechazados:</strong> <span className="status-error">{authMetrics.reject_count}</span></div>
            <div><strong>FAR:</strong> {(authMetrics.far * 100).toFixed(2)}%</div>
            <div><strong>FRR:</strong> {(authMetrics.frr * 100).toFixed(2)}%</div>
            <div><strong>Score Promedio:</strong> {authMetrics.avg_score.toFixed(3)}</div>
          </div>
        </div>
      )}

      {timeSeries.length > 0 && (
        <div className="card">
          <h2>Serie Temporal (Score Promedio)</h2>
          <div style={{ marginTop: '1rem', height: '200px', position: 'relative' }}>
            <svg width="100%" height="100%" viewBox="0 0 600 200" preserveAspectRatio="none">
              {(() => {
                const maxScore = Math.max(...timeSeries.map(d => d.avg_score || 0), 1)
                const minScore = Math.min(...timeSeries.map(d => d.avg_score || 0), 0)
                const points = timeSeries.map((d, i) => {
                  const x = (i / (timeSeries.length - 1)) * 580 + 10
                  const y = 190 - ((d.avg_score - minScore) / (maxScore - minScore || 1)) * 180
                  return `${x},${y}`
                }).join(' ')
                return (
                  <>
                    <polyline fill="none" stroke="#3498db" strokeWidth="2" points={points} />
                    {timeSeries.map((d, i) => {
                      const x = (i / (timeSeries.length - 1)) * 580 + 10
                      const y = 190 - ((d.avg_score - minScore) / (maxScore - minScore || 1)) * 180
                      return <circle key={i} cx={x} cy={y} r="3" fill="#3498db" />
                    })}
                  </>
                )
              })()}
            </svg>
          </div>
        </div>
      )}

      {models.length > 0 && (
        <div className="card">
          <h2>Versiones de Modelo</h2>
          <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#ecf0f1' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Versión</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Activo</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Muestras Entren.</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Intentos Auth</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Tasa Permitidos</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Score Promedio</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Creado</th>
                </tr>
              </thead>
              <tbody>
                {models.map(m => (
                  <tr key={m.version_id}>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>v{m.version_id}</td>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                      {m.is_active ? <span className="status-ok">Sí</span> : 'No'}
                    </td>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{m.training_samples}</td>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{m.auth_count}</td>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{(m.allow_rate * 100).toFixed(1)}%</td>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{m.avg_score.toFixed(3)}</td>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{m.created_at?.split('T')[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adaptation && (
        <div className="card">
          <h2>Adaptación</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div><strong>Eventos Totales:</strong> {adaptation.total_events}</div>
            <div><strong>Candidatos Creados:</strong> {adaptation.candidate_created}</div>
            <div><strong>Candidatos Aceptados:</strong> <span className="status-ok">{adaptation.candidate_accepted}</span></div>
            <div><strong>Candidatos Rechazados:</strong> <span className="status-error">{adaptation.candidate_rejected}</span></div>
            <div><strong>Muestras Encoladas:</strong> {adaptation.sample_enqueued}</div>
            <div><strong>Modelo Actual:</strong> v{adaptation.current_model_version || 'N/A'}</div>
            <div><strong>Última Adaptación:</strong> {adaptation.last_adaptation ? new Date(adaptation.last_adaptation).toLocaleString() : 'N/A'}</div>
          </div>
        </div>
      )}

      {adaptationTimeline.length > 0 && (
        <div className="card">
          <h2>Historial de Adaptación</h2>
          <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#ecf0f1' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Acción</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Modelo Ant.</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Modelo Nuevo</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Razón</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {adaptationTimeline.slice(0, 20).map(e => (
                  <tr key={e.id}>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                      <span style={{ 
                        color: e.action.includes('accepted') ? '#27ae60' : 
                               e.action.includes('rejected') ? '#e74c3c' : '#3498db' }}>
                        {e.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                      {e.old_model_version_id ? `v${e.old_model_version_id}` : '—'}
                    </td>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                      {e.new_model_version_id ? `v${e.new_model_version_id}` : '—'}
                    </td>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{e.reason || '—'}</td>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {candidateStatus && (
        <div className="card">
          <h2>Estado del Pool de Candidatos</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div><strong>Pool Actual:</strong> {candidateStatus.pool_size} / {candidateStatus.min_required}</div>
            <div><strong>Ventana:</strong> {candidateStatus.window_size}</div>
            <div><strong>Modelo Actual:</strong> v{candidateStatus.current_model_version || 'N/A'}</div>
            <div><strong>Candidato Pendiente:</strong> 
              {candidateStatus.pending_candidate ? 
                `ID: ${candidateStatus.pending_candidate.id} (${candidateStatus.pending_candidate.status})` : 'Ninguno'}
            </div>
          </div>
          {candidateStatus.pool_samples.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <strong>Muestras en Pool:</strong>
              <ul style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                {candidateStatus.pool_samples.slice(0, 10).map(s => (
                  <li key={s.id}>{new Date(s.created_at).toLocaleString()}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {comparison && comparison.static_model && (
        <div className="card">
          <h2>Comparación: Estático vs Adaptativo</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '4px' }}>
              <h3>Modelo Estático (v{comparison.static_model.version_id})</h3>
              <div><strong>Creado:</strong> {comparison.static_model.created_at?.split('T')[0]}</div>
              <div><strong>Intentos Auth:</strong> {comparison.static_model.auth_count}</div>
              <div><strong>Tasa Permitidos:</strong> {(comparison.static_model.allow_rate * 100).toFixed(1)}%</div>
              <div><strong>Score Promedio:</strong> {comparison.static_model.avg_score.toFixed(3)}</div>
            </div>
            <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '4px' }}>
              <h3>Modelo Adaptativo (v{comparison.adaptive_model.version_id})</h3>
              <div><strong>Creado:</strong> {comparison.adaptive_model.created_at?.split('T')[0]}</div>
              <div><strong>Intentos Auth:</strong> {comparison.adaptive_model.auth_count}</div>
              <div><strong>Tasa Permitidos:</strong> {(comparison.adaptive_model.allow_rate * 100).toFixed(1)}%</div>
              <div><strong>Score Promedio:</strong> {comparison.adaptive_model.avg_score.toFixed(3)}</div>
            </div>
          </div>
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#e8f8f5', borderRadius: '4px' }}>
            <strong>Mejora:</strong>
            <div>Tasa Permitidos: {(comparison.improvement.allow_rate_delta * 100).toFixed(1)}%</div>
            <div>Score Promedio: {comparison.improvement.avg_score_delta.toFixed(3)}</div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: '2rem', textAlign: 'center', color: '#7f8c8d' }}>
        <button className="btn btn-primary" onClick={loadDashboard} style={{ marginRight: '1rem' }}>
          🔄 Actualizar
        </button>
        <select value={userId} onChange={(e) => setUserId(Number(e.target.value))} style={{ padding: '0.5rem', marginLeft: '1rem' }}>
          <option value={1}>Usuario 1</option>
          <option value={2}>Usuario 2</option>
          <option value={3}>Usuario 3</option>
          <option value={4}>Usuario 4</option>
          <option value={5}>Usuario 5</option>
          <option value={6}>Usuario 6</option>
          <option value={7}>Usuario 7</option>
          <option value={8}>Usuario 8</option>
          <option value={9}>Usuario 9</option>
          <option value={10}>Usuario 10</option>
          <option value={11}>Usuario 11</option>
          <option value={12}>Usuario 12</option>
          <option value={13}>Usuario 13</option>
          <option value={14}>Usuario 14</option>
        </select>
      </div>
    </div>
  )
}

export default Dashboard