import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Genera y descarga un archivo PDF directamente en el cliente (React).
 */
export function exportToPDF({ summary, authMetrics, models, timeline, comparison, username, userId, t }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const nowStr = new Date().toLocaleString();

  // Título y Encabezado
  doc.setFontSize(18);
  doc.setTextColor(30, 27, 75); // Indigo oscuro
  doc.text('TECLEOLLAVE-ADAPT — Reporte Biométrico', 14, 18);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate muted
  doc.text(`Usuario: ${username || `User_${userId}`} (ID: ${userId}) | Generado: ${nowStr}`, 14, 24);

  let currentY = 30;

  // 1. Tabla de KPIs y Métricas
  doc.setFontSize(11);
  doc.setTextColor(49, 46, 129);
  doc.text('1. Resumen de Métricas Clave (KPIs)', 14, currentY);
  currentY += 4;

  const farStr = authMetrics ? `${(authMetrics.far * 100).toFixed(2)}%` : '0.00%';
  const frrStr = authMetrics ? `${(authMetrics.frr * 100).toFixed(2)}%` : '0.00%';
  const eerStr = authMetrics ? `${(Math.max(authMetrics.far || 0, authMetrics.frr || 0) * 100).toFixed(2)}%` : '0.00%';
  const avgScoreStr = authMetrics ? authMetrics.avg_score.toFixed(3) : '0.000';

  const kpiData = [
    ['Modelo Activo', `v${summary?.active_model_version || 'N/A'}`, 'FAR (False Acceptance)', farStr],
    ['Total Muestras', summary?.total_samples || 0, 'FRR (False Rejection)', frrStr],
    ['Muestras Enrolamiento', summary?.enrollment_samples || 0, 'EER (Equal Error Rate)', eerStr],
    ['Intentos Autenticación', authMetrics?.total_attempts || 0, 'Score Promedio', avgScoreStr],
    ['Adaptaciones Exitosas', summary?.total_adaptations || 0, 'Permitidos / Rechazados', `${authMetrics?.allow_count || 0} / ${authMetrics?.reject_count || 0}`]
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Métrica', 'Valor', 'Métrica', 'Valor']],
    body: kpiData,
    theme: 'grid',
    headStyles: { fillStyle: 'F', fillColor: [99, 102, 241], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    styles: { cellPadding: 2 }
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // 2. Historial de Modelos
  doc.setFontSize(11);
  doc.setTextColor(49, 46, 129);
  doc.text('2. Versiones de Modelo Biométrico', 14, currentY);
  currentY += 4;

  const modelRows = (models || []).map(m => [
    `v${m.version_id}`,
    m.is_active ? 'ACTIVO' : 'Archivado',
    m.training_samples,
    m.auth_count,
    `${(m.allow_rate * 100).toFixed(1)}%`,
    m.avg_score.toFixed(3),
    m.created_at ? String(m.created_at).split('T')[0] : '—'
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Versión', 'Estado', 'Muestras', 'Intentos', 'Tasa Permitidos', 'Score Prom.', 'Creado']],
    body: modelRows.length ? modelRows : [['—', '—', '—', '—', '—', '—', '—']],
    theme: 'striped',
    headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    styles: { cellPadding: 2 }
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // 3. Comparación Estático vs Adaptativo
  if (comparison && comparison.static_model && comparison.adaptive_model) {
    doc.setFontSize(11);
    doc.setTextColor(49, 46, 129);
    doc.text('3. Comparación: Modelo Estático (M0) vs Adaptativo (Mn)', 14, currentY);
    currentY += 4;

    const sM = comparison.static_model;
    const aM = comparison.adaptive_model;
    const imprv = comparison.improvement || {};

    const compRows = [
      ['Tasa de Permitidos (%)', `${(sM.allow_rate * 100).toFixed(1)}%`, `${(aM.allow_rate * 100).toFixed(1)}%`, `${((imprv.allow_rate_delta || 0) * 100).toFixed(1)}%`],
      ['Score Promedio Biométrico', sM.avg_score.toFixed(3), aM.avg_score.toFixed(3), (imprv.avg_score_delta || 0).toFixed(3)],
      ['Total Intentos Evaluados', sM.auth_count, aM.auth_count, '—']
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Métrica', 'Modelo Estático (M0)', `Modelo Adaptativo (v${aM.version_id})`, 'Diferencia']],
      body: compRows,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      styles: { cellPadding: 2 }
    });

    currentY = doc.lastAutoTable.finalY + 10;
  }

  // 4. Timeline de Adaptaciones
  doc.setFontSize(11);
  doc.setTextColor(49, 46, 129);
  doc.text('4. Timeline de Adaptaciones del Perfil', 14, currentY);
  currentY += 4;

  const timelineRows = (timeline || []).slice(0, 15).map(e => [
    String(e.action || '').replace(/_/g, ' ').toUpperCase(),
    e.old_model_version_id ? `v${e.old_model_version_id}` : '—',
    e.new_model_version_id ? `v${e.new_model_version_id}` : '—',
    String(e.reason || '—').slice(0, 40),
    String(e.created_at || '').replace('T', ' ').slice(0, 19)
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Acción / Evento', 'Modelo Ant.', 'Nuevo Modelo', 'Razón / Detalle', 'Fecha']],
    body: timelineRows.length ? timelineRows : [['—', '—', '—', '—', '—']],
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    styles: { cellPadding: 2 }
  });

  doc.save(`tecleollave_report_user_${userId}.pdf`);
}

/**
 * Genera y descarga un archivo Excel (.xlsx) directamente en el cliente (React) usando SheetJS (xlsx).
 */
export function exportToExcel({ summary, authMetrics, models, timeline, comparison, username, userId, t }) {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Resumen & KPIs
  const summaryData = [
    ['TECLEOLLAVE-ADAPT — Reporte Biométrico General'],
    [`Usuario: ${username || `User_${userId}`} (ID: ${userId}) | Fecha: ${new Date().toLocaleString()}`],
    [],
    ['Métrica', 'Valor'],
    ['Usuario', username || `User_${userId}`],
    ['Modelo Activo', `v${summary?.active_model_version || 'N/A'}`],
    ['Total Muestras', summary?.total_samples || 0],
    ['Muestras Enrolamiento', summary?.enrollment_samples || 0],
    ['Muestras Autenticación', summary?.auth_samples || 0],
    ['Intentos Autenticación', authMetrics?.total_attempts || 0],
    ['Intentos Permitidos', authMetrics?.allow_count || 0],
    ['Intentos Challenge', authMetrics?.challenge_count || 0],
    ['Intentos Rechazados', authMetrics?.reject_count || 0],
    ['FAR (False Acceptance Rate)', authMetrics ? `${(authMetrics.far * 100).toFixed(2)}%` : '0.00%'],
    ['FRR (False Rejection Rate)', authMetrics ? `${(authMetrics.frr * 100).toFixed(2)}%` : '0.00%'],
    ['EER (Equal Error Rate)', authMetrics ? `${(Math.max(authMetrics.far || 0, authMetrics.frr || 0) * 100).toFixed(2)}%` : '0.00%'],
    ['Score Promedio Biométrico', authMetrics ? authMetrics.avg_score.toFixed(4) : '0.0000'],
    ['Total Adaptaciones Exitosas', summary?.total_adaptations || 0]
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen General');

  // Hoja 2: Modelos Biométricos
  const modelHeaders = [['Versión', 'Estado', 'Muestras Entren.', 'Intentos Auth', 'Tasa Permitidos (%)', 'Score Promedio', 'Fecha Creación']];
  const modelRows = (models || []).map(m => [
    `v${m.version_id}`,
    m.is_active ? 'Sí' : 'No',
    m.training_samples,
    m.auth_count,
    Number((m.allow_rate * 100).toFixed(2)),
    Number(m.avg_score.toFixed(4)),
    m.created_at ? String(m.created_at).split('T')[0] : ''
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([...modelHeaders, ...modelRows]);
  XLSX.utils.book_append_sheet(wb, ws2, 'Modelos Biométricos');

  // Hoja 3: Adaptaciones
  const timelineHeaders = [['ID', 'Acción / Evento', 'Modelo Anterior', 'Nuevo Modelo', 'Razón / Detalle', 'Fecha']];
  const timelineRows = (timeline || []).map(e => [
    e.id,
    String(e.action || '').replace(/_/g, ' ').toUpperCase(),
    e.old_model_version_id ? `v${e.old_model_version_id}` : '—',
    e.new_model_version_id ? `v${e.new_model_version_id}` : '—',
    e.reason || '—',
    String(e.created_at || '').replace('T', ' ').slice(0, 19)
  ]);
  const ws3 = XLSX.utils.aoa_to_sheet([...timelineHeaders, ...timelineRows]);
  XLSX.utils.book_append_sheet(wb, ws3, 'Eventos Adaptación');

  // Hoja 4: Comparación Estático vs Adaptativo
  if (comparison && comparison.static_model && comparison.adaptive_model) {
    const sM = comparison.static_model;
    const aM = comparison.adaptive_model;
    const imprv = comparison.improvement || {};

    const compData = [
      ['Métrica', 'Modelo Estático (M0)', `Modelo Adaptativo (v${aM.version_id})`, 'Diferencia'],
      ['Tasa de Permitidos (%)', `${(sM.allow_rate * 100).toFixed(2)}%`, `${(aM.allow_rate * 100).toFixed(2)}%`, `${((imprv.allow_rate_delta || 0) * 100).toFixed(2)}%`],
      ['Score Promedio Biométrico', sM.avg_score.toFixed(4), aM.avg_score.toFixed(4), (imprv.avg_score_delta || 0).toFixed(4)],
      ['Total Intentos Evaluados', sM.auth_count, aM.auth_count, '—']
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(compData);
    XLSX.utils.book_append_sheet(wb, ws4, 'Estático vs Adaptativo');
  }

  XLSX.writeFile(wb, `tecleollave_report_user_${userId}.xlsx`);
}

/**
 * Genera y descarga un archivo Word (.doc) en formato HTML nativo para Microsoft Word.
 */
export function exportToWord({ summary, authMetrics, models, timeline, comparison, username, userId }) {
  const nowStr = new Date().toLocaleString();
  const farStr = authMetrics ? `${(authMetrics.far * 100).toFixed(2)}%` : '0.00%';
  const frrStr = authMetrics ? `${(authMetrics.frr * 100).toFixed(2)}%` : '0.00%';
  const eerStr = authMetrics ? `${(Math.max(authMetrics.far || 0, authMetrics.frr || 0) * 100).toFixed(2)}%` : '0.00%';
  const avgScoreStr = authMetrics ? (authMetrics.avg_score || 0).toFixed(3) : '0.000';

  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Informe Biométrico TECLEOLLAVE-ADAPT</title>
      <style>
        body { font-family: 'Calibri', 'Arial', sans-serif; color: #1e293b; padding: 20px; line-height: 1.5; }
        h1 { color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 6px; font-size: 22pt; }
        h2 { color: #1e40af; margin-top: 20px; font-size: 14pt; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 10pt; }
        th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; }
        .meta { color: #64748b; font-size: 10pt; margin-bottom: 18px; }
        .badge { background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
        .signature { margin-top: 40px; }
      </style>
    </head>
    <body>
      <h1>TECLEOLLAVE-ADAPT — Reporte Biométrico Oficial</h1>
      <div class="meta">
        <strong>Usuario:</strong> ${username || `user_${userId}`} (ID: ${userId}) | 
        <strong>Fecha de Emisión:</strong> ${nowStr} | 
        <strong>Estado:</strong> Certificado
      </div>

      <h2>1. Resumen Ejecutivo y Métricas Clave</h2>
      <table>
        <tr>
          <th>Métrica</th><th>Valor</th><th>Métrica</th><th>Valor</th>
        </tr>
        <tr>
          <td><strong>Modelo Activo</strong></td><td><span class="badge">v${summary?.active_model_version || '1'}</span></td>
          <td><strong>FAR (Falsa Aceptación)</strong></td><td>${farStr}</td>
        </tr>
        <tr>
          <td><strong>Total de Muestras</strong></td><td>${summary?.total_samples || 0}</td>
          <td><strong>FRR (Falso Rechazo)</strong></td><td>${frrStr}</td>
        </tr>
        <tr>
          <td><strong>Muestras Enrolamiento</strong></td><td>${summary?.enrollment_samples || 0}</td>
          <td><strong>EER (Equal Error Rate)</strong></td><td>${eerStr}</td>
        </tr>
        <tr>
          <td><strong>Intentos Autenticación</strong></td><td>${authMetrics?.total_attempts || summary?.total_auth_attempts || 0}</td>
          <td><strong>Score Promedio</strong></td><td>${avgScoreStr}</td>
        </tr>
        <tr>
          <td><strong>Adaptaciones Exitosas</strong></td><td>${summary?.total_adaptations || 0}</td>
          <td><strong>Permitidos / Rechazados</strong></td><td>${authMetrics?.allow_count || 0} / ${authMetrics?.reject_count || 0}</td>
        </tr>
      </table>

      <h2>2. Versiones de Modelo Registradas</h2>
      <table>
        <tr>
          <th>Versión</th><th>Estado</th><th>Muestras</th><th>Intentos</th><th>Tasa Aceptados</th><th>Score Prom.</th>
        </tr>
        ${(models || []).map(m => `
          <tr>
            <td>v${m.version_id}</td>
            <td>${m.is_active ? 'ACTIVO' : 'Archivado'}</td>
            <td>${m.training_samples}</td>
            <td>${m.auth_count}</td>
            <td>${(m.allow_rate * 100).toFixed(1)}%</td>
            <td>${(m.avg_score || 0).toFixed(3)}</td>
          </tr>
        `).join('')}
      </table>

      <div class="signature">
        <p>_____________________________________</p>
        <p><strong>Auditor de Seguridad Biometric Keystroke Dynamics</strong></p>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + htmlContent], {
    type: 'application/msword'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tecleollave_reporte_user_${userId}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
