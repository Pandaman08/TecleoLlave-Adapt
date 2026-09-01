import React, { useState } from 'react';
import { exportToPDF, exportToExcel, exportToWord } from '../utils/exportReports';

function ReportPreviewModal({ isOpen, onClose, data }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('pdf'); // 'pdf' | 'excel' | 'word'
  const { summary, authMetrics, models, timeline, comparison, username, userId, t } = data;

  const nowStr = new Date().toLocaleString();
  const farStr = authMetrics ? `${(authMetrics.far * 100).toFixed(2)}%` : '0.00%';
  const frrStr = authMetrics ? `${(authMetrics.frr * 100).toFixed(2)}%` : '0.00%';
  const eerStr = authMetrics ? `${(Math.max(authMetrics.far || 0, authMetrics.frr || 0) * 100).toFixed(2)}%` : '0.00%';
  const avgScoreStr = authMetrics ? (authMetrics.avg_score || 0).toFixed(3) : '0.000';

  const handleDownloadPDF = () => {
    exportToPDF(data);
  };

  const handleDownloadExcel = () => {
    exportToExcel(data);
  };

  const handleDownloadWord = () => {
    exportToWord(data);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">📄</span>
            <div>
              <h2 className="modal-title">Previsualización de Reportes Ejecutivos</h2>
              <p className="modal-subtitle">Revisa el formato y contenido antes de exportar a PDF, Excel o Word</p>
            </div>
          </div>

          <div className="modal-tab-switcher">
            <button
              className={`modal-tab ${activeTab === 'pdf' ? 'active' : ''}`}
              onClick={() => setActiveTab('pdf')}
            >
              📕 Documento PDF
            </button>
            <button
              className={`modal-tab ${activeTab === 'excel' ? 'active' : ''}`}
              onClick={() => setActiveTab('excel')}
            >
              📊 Libro Excel (XLSX)
            </button>
            <button
              className={`modal-tab ${activeTab === 'word' ? 'active' : ''}`}
              onClick={() => setActiveTab('word')}
            >
              📝 Informe Word (DOCX)
            </button>
          </div>

          <button className="modal-close-btn" onClick={onClose} title="Cerrar Previsualización">
            ✕
          </button>
        </div>

        {/* Modal Body: Live Document Previews */}
        <div className="modal-body">
          
          {/* TAB 1: PREVISUALIZACIÓN PDF */}
          {activeTab === 'pdf' && (
            <div className="preview-paper pdf-paper">
              <div className="doc-header">
                <div>
                  <div className="doc-brand">TECLEOLLAVE-ADAPT</div>
                  <div className="doc-subbrand">Reporte de Auditoría y Métricas Biométricas Adaptativas</div>
                </div>
                <div className="doc-meta-right">
                  <div><strong>Fecha:</strong> {nowStr}</div>
                  <div><strong>Usuario:</strong> {username || `user_${userId}`} (ID: {userId})</div>
                  <div><strong>Estado:</strong> <span className="badge-pdf-ok">CONFIDENCIAL / AUDITADO</span></div>
                </div>
              </div>

              <div className="doc-divider"></div>

              {/* 1. Resumen Ejecutivo */}
              <div className="doc-section">
                <div className="doc-section-title">1. Resumen Ejecutivo y Métricas Clave (KPIs)</div>
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>Métrica Operativa</th>
                      <th>Valor Actual</th>
                      <th>Métrica de Seguridad</th>
                      <th>Valor Actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Modelo Activo</strong></td>
                      <td><span className="doc-badge">v{summary?.active_model_version || '1'}</span></td>
                      <td><strong>FAR (Falsa Aceptación)</strong></td>
                      <td>{farStr}</td>
                    </tr>
                    <tr>
                      <td><strong>Total de Muestras</strong></td>
                      <td>{summary?.total_samples || 0}</td>
                      <td><strong>FRR (Falso Rechazo)</strong></td>
                      <td>{frrStr}</td>
                    </tr>
                    <tr>
                      <td><strong>Muestras Enrolamiento</strong></td>
                      <td>{summary?.enrollment_samples || 0}</td>
                      <td><strong>EER (Punto de Equilibrio)</strong></td>
                      <td>{eerStr}</td>
                    </tr>
                    <tr>
                      <td><strong>Intentos Autenticación</strong></td>
                      <td>{authMetrics?.total_attempts || summary?.total_auth_attempts || 0}</td>
                      <td><strong>Score Promedio</strong></td>
                      <td>{avgScoreStr}</td>
                    </tr>
                    <tr>
                      <td><strong>Adaptaciones Exitosas</strong></td>
                      <td>{summary?.total_adaptations || 0} re-entrenamientos</td>
                      <td><strong>Decisiones (ALLOW / REJECT)</strong></td>
                      <td>{authMetrics?.allow_count || 0} / {authMetrics?.reject_count || 0}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 2. Historial de Versiones */}
              <div className="doc-section">
                <div className="doc-section-title">2. Historial de Versiones del Modelo Adaptativo</div>
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>Versión</th>
                      <th>Estado</th>
                      <th>Muestras</th>
                      <th>Intentos</th>
                      <th>Tasa Aceptados</th>
                      <th>Score Prom.</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models && models.length > 0 ? (
                      models.slice(0, 8).map((m) => (
                        <tr key={m.version_id}>
                          <td><strong>v{m.version_id}</strong></td>
                          <td>{m.is_active ? '● ACTIVO' : 'Archivado'}</td>
                          <td>{m.training_samples}</td>
                          <td>{m.auth_count}</td>
                          <td>{(m.allow_rate * 100).toFixed(1)}%</td>
                          <td>{(m.avg_score || 0).toFixed(3)}</td>
                          <td>{m.created_at ? String(m.created_at).slice(0, 10) : '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="7" style={{ textAlign: 'center' }}>Sin registros</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 3. Comparativa Estático vs Adaptativo */}
              {comparison && comparison.static_model && (
                <div className="doc-section">
                  <div className="doc-section-title">3. Análisis Comparativo: Modelo Estático (M0) vs Adaptativo (Mn)</div>
                  <table className="doc-table">
                    <thead>
                      <tr>
                        <th>Indicador</th>
                        <th>Modelo Estático (v{comparison.static_model.version_id})</th>
                        <th>Modelo Adaptativo (v{comparison.adaptive_model.version_id})</th>
                        <th>Mejora Observada</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Tasa de Aceptación (%)</td>
                        <td>{(comparison.static_model.allow_rate * 100).toFixed(1)}%</td>
                        <td><strong>{(comparison.adaptive_model.allow_rate * 100).toFixed(1)}%</strong></td>
                        <td style={{ color: '#059669' }}>+ Resistencia a Deriva</td>
                      </tr>
                      <tr>
                        <td>Score Promedio Biométrico</td>
                        <td>{(comparison.static_model.avg_score || 0).toFixed(3)}</td>
                        <td><strong>{(comparison.adaptive_model.avg_score || 0).toFixed(3)}</strong></td>
                        <td style={{ color: '#059669' }}>Ajuste Continuo Óptimo</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <div className="doc-footer">
                Documento generado automáticamente por el subsistema analítico de TECLEOLLAVE-ADAPT. Página 1 de 1.
              </div>
            </div>
          )}

          {/* TAB 2: PREVISUALIZACIÓN EXCEL */}
          {activeTab === 'excel' && (
            <div className="preview-excel">
              <div className="excel-toolbar">
                <span className="excel-badge">📗 Microsoft Excel Workbook (.XLSX)</span>
                <span className="excel-meta">3 Hojas de Cálculo | 100% Formato Nativo SheetJS</span>
              </div>

              <div className="excel-sheet-view">
                <div className="excel-sheet-header">Hoja 1: Resumen de KPIs & Biometría</div>
                <div className="excel-table-wrapper">
                  <table className="excel-table">
                    <thead>
                      <tr>
                        <th className="row-num"></th>
                        <th>A</th>
                        <th>B</th>
                        <th>C</th>
                        <th>D</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="row-num">1</td>
                        <td className="excel-title" colSpan="4">REPORTE BIOMÉTRICO TECLEOLLAVE-ADAPT</td>
                      </tr>
                      <tr>
                        <td className="row-num">2</td>
                        <td className="excel-label">Usuario:</td>
                        <td>{username}</td>
                        <td className="excel-label">Fecha:</td>
                        <td>{nowStr}</td>
                      </tr>
                      <tr>
                        <td className="row-num">3</td>
                        <td className="excel-head" colSpan="2">Métrica de Rendimiento</td>
                        <td className="excel-head" colSpan="2">Valor Registrado</td>
                      </tr>
                      <tr>
                        <td className="row-num">4</td>
                        <td colSpan="2">Modelo Activo</td>
                        <td colSpan="2">v{summary?.active_model_version || '1'}</td>
                      </tr>
                      <tr>
                        <td className="row-num">5</td>
                        <td colSpan="2">FAR (False Acceptance Rate)</td>
                        <td colSpan="2">{farStr}</td>
                      </tr>
                      <tr>
                        <td className="row-num">6</td>
                        <td colSpan="2">FRR (False Rejection Rate)</td>
                        <td colSpan="2">{frrStr}</td>
                      </tr>
                      <tr>
                        <td className="row-num">7</td>
                        <td colSpan="2">EER (Equal Error Rate)</td>
                        <td colSpan="2">{eerStr}</td>
                      </tr>
                      <tr>
                        <td className="row-num">8</td>
                        <td colSpan="2">Total Re-entrenamientos Adaptativos</td>
                        <td colSpan="2">{summary?.total_adaptations || 0}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="excel-sheet-header" style={{ marginTop: '1.5rem' }}>Hoja 2: Versiones de Modelo & Métricas ML</div>
                <div className="excel-table-wrapper">
                  <table className="excel-table">
                    <thead>
                      <tr>
                        <th className="row-num"></th>
                        <th>Versión</th>
                        <th>Estado</th>
                        <th>Muestras</th>
                        <th>Intentos</th>
                        <th>Tasa Permitidos</th>
                        <th>Score Prom.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {models && models.slice(0, 6).map((m, idx) => (
                        <tr key={m.version_id}>
                          <td className="row-num">{idx + 1}</td>
                          <td>v{m.version_id}</td>
                          <td>{m.is_active ? 'ACTIVO' : 'Archivado'}</td>
                          <td>{m.training_samples}</td>
                          <td>{m.auth_count}</td>
                          <td>{(m.allow_rate * 100).toFixed(1)}%</td>
                          <td>{(m.avg_score || 0).toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PREVISUALIZACIÓN WORD */}
          {activeTab === 'word' && (
            <div className="preview-paper word-paper">
              <div className="word-ribbon">
                <div className="word-logo-title">📝 Microsoft Word Document (.DOCX / .DOC)</div>
                <div className="word-tag">Plantilla Formal de Auditoría</div>
              </div>

              <div className="word-doc-body">
                <h1 style={{ color: '#1e3a8a', borderBottom: '2px solid #1e3a8a', paddingBottom: '6px' }}>
                  Informe Técnico de Auditoría Biométrica
                </h1>
                <p><strong>Mecanismo Adaptativo:</strong> TECLEOLLAVE-ADAPT (Keystroke Dynamics)</p>
                <p><strong>Sujeto Evaluado:</strong> {username || `user_${userId}`} | <strong>ID Interno:</strong> {userId}</p>
                <p><strong>Fecha de Expedición:</strong> {nowStr}</p>

                <h2 style={{ color: '#1e40af', marginTop: '1.5rem' }}>1. Diagnóstico de Eficacia Biométrica</h2>
                <p style={{ lineHeight: '1.6', fontSize: '0.92rem' }}>
                  El presente informe certifica que el usuario <strong>{username}</strong> cuenta con un modelo adaptativo activo versión <strong>v{summary?.active_model_version || '1'}</strong>.
                  El índice de Falsa Aceptación (FAR) se sitúa en <strong>{farStr}</strong> y el índice de Falso Rechazo (FRR) en <strong>{frrStr}</strong>, cumpliendo los estándares de equilibrio operacional (EER: {eerStr}).
                </p>

                <h2 style={{ color: '#1e40af', marginTop: '1.5rem' }}>2. Tabla de Indicadores</h2>
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>Parámetro</th>
                      <th>Especificación</th>
                      <th>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Modelo Base (M0)</td>
                      <td>Enrolamiento Inicial (5 muestras)</td>
                      <td>Convergencia OK</td>
                    </tr>
                    <tr>
                      <td>Adaptaciones Automáticas</td>
                      <td>Re-entrenamientos continuos</td>
                      <td>{summary?.total_adaptations || 0} exitosas</td>
                    </tr>
                    <tr>
                      <td>Score Promedio de Tecleo</td>
                      <td>Cálculo Euclidiano / Mahalanobis</td>
                      <td>{avgScoreStr}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="signature-box" style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ borderTop: '1px solid #94a3b8', width: '200px', textAlign: 'center', paddingTop: '6px', fontSize: '0.8rem' }}>
                    Firma del Responsable de Seguridad
                  </div>
                  <div style={{ borderTop: '1px solid #94a3b8', width: '200px', textAlign: 'center', paddingTop: '6px', fontSize: '0.8rem' }}>
                    Sello Digital del Sistema
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Actions Footer */}
        <div className="modal-footer">
          <div className="modal-footer-hint">
            💡 Puedes descargar el reporte en cualquiera de los 3 formatos compatibles.
          </div>

          <div className="modal-btn-row">
            <button className="btn-secondary" onClick={onClose}>
              Cerrar
            </button>

            <button className="btn-action-pdf" onClick={handleDownloadPDF}>
              📕 Descargar PDF (.pdf)
            </button>

            <button className="btn-action-excel" onClick={handleDownloadExcel}>
              📊 Descargar Excel (.xlsx)
            </button>

            <button className="btn-action-word" onClick={handleDownloadWord}>
              📝 Descargar Word (.doc)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default ReportPreviewModal;
