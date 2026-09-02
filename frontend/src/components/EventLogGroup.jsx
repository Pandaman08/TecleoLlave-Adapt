import React, { useState, useMemo } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
  Sparkles,
  ShieldCheck,
  Cpu
} from 'lucide-react';

export default function EventLogGroup({ timeline = [] }) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'promotions' | 'candidates' | 'samples'
  const [filterOutcome, setFilterOutcome] = useState('all'); // 'all' | 'accepted' | 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});

  // Group consecutive identical repetitive events (e.g. sample_enqueued, feature_extracted)
  const groupedEvents = useMemo(() => {
    if (!timeline || timeline.length === 0) return [];

    const result = [];
    let currentGroup = null;

    timeline.forEach((item, index) => {
      const isHighPriority = [
        'candidate_accepted',
        'candidate_rejected',
        'candidate_created',
        'candidate_evaluating',
        'model_promoted',
        'drift_detected'
      ].includes(item.action);

      // If it's high priority, never aggregate - push directly
      if (isHighPriority) {
        if (currentGroup) {
          result.push(currentGroup);
          currentGroup = null;
        }
        result.push({
          id: `item-${item.id || index}`,
          isGroup: false,
          ...item
        });
        return;
      }

      // If repetitive low priority (like sample_enqueued)
      if (currentGroup && currentGroup.action === item.action) {
        currentGroup.count += 1;
        currentGroup.items.push(item);
        currentGroup.lastTime = item.created_at || currentGroup.lastTime;
      } else {
        if (currentGroup) {
          result.push(currentGroup);
        }
        currentGroup = {
          id: `group-${item.action}-${index}`,
          isGroup: true,
          count: 1,
          action: item.action,
          reason: item.reason,
          old_model_version_id: item.old_model_version_id,
          new_model_version_id: item.new_model_version_id,
          firstTime: item.created_at,
          lastTime: item.created_at,
          items: [item]
        };
      }
    });

    if (currentGroup) {
      result.push(currentGroup);
    }

    return result;
  }, [timeline]);

  // Filter according to selections and search
  const filteredEvents = useMemo(() => {
    return groupedEvents.filter((ev) => {
      // Filter by outcome
      if (filterOutcome === 'accepted' && ev.action !== 'candidate_accepted') return false;
      if (filterOutcome === 'rejected' && ev.action !== 'candidate_rejected') return false;

      // Filter by category type
      if (filterType === 'promotions' && !['candidate_accepted', 'candidate_rejected', 'model_promoted'].includes(ev.action)) return false;
      if (filterType === 'candidates' && !['candidate_created', 'candidate_evaluating'].includes(ev.action)) return false;
      if (filterType === 'samples' && !['sample_enqueued', 'feature_extracted', 'buffer_updated'].includes(ev.action)) return false;

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const textToSearch = `${ev.action} ${ev.reason || ''} ${ev.new_model_version_id || ''}`.toLowerCase();
        if (!textToSearch.includes(q)) return false;
      }

      return true;
    });
  }, [groupedEvents, filterType, filterOutcome, searchQuery]);

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const getActionBadge = (action, count = 1) => {
    const formatted = String(action || '').replace(/_/g, ' ').toUpperCase();
    if (action === 'candidate_accepted') {
      return <span className="hero-stat-badge badge-active">● {formatted}</span>;
    }
    if (action === 'candidate_rejected') {
      return <span className="hero-stat-badge badge-danger">✕ {formatted}</span>;
    }
    if (action === 'candidate_created' || action === 'candidate_evaluating') {
      return <span className="hero-stat-badge badge-brand">⚡ {formatted}</span>;
    }
    return (
      <span className="hero-stat-badge" style={{ backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)' }}>
        {formatted} {count > 1 ? `×${count}` : ''}
      </span>
    );
  };

  return (
    <div className="table-panel">
      {/* Table Header & Multi-Dimensional Filters */}
      <div className="table-panel-header" style={{ flexDirection: 'column', gap: '0.85rem', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} style={{ color: 'var(--brand-500)' }} />
              Auditoría & Trazabilidad de Eventos Adaptativos
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
              Eventos secuenciales con agrupación inteligente de operaciones repetitivas de buffer
            </p>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="select-control"
              style={{ paddingLeft: '2rem', height: 34, fontSize: '0.78rem' }}
              placeholder="Buscar evento o motivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Outcome Filter */}
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Decisión:</span>
            <button
              className={`btn-secondary ${filterOutcome === 'all' ? 'active' : ''}`}
              onClick={() => setFilterOutcome('all')}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
            >
              Todas
            </button>
            <button
              className={`btn-secondary ${filterOutcome === 'accepted' ? 'active' : ''}`}
              onClick={() => setFilterOutcome('accepted')}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem', color: '#10b981' }}
            >
              Aceptados
            </button>
            <button
              className={`btn-secondary ${filterOutcome === 'rejected' ? 'active' : ''}`}
              onClick={() => setFilterOutcome('rejected')}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem', color: '#ef4444' }}
            >
              Rechazados
            </button>
          </div>

          {/* Type Filter */}
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Categoría:</span>
            <button
              className={`btn-secondary ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
            >
              Todas
            </button>
            <button
              className={`btn-secondary ${filterType === 'promotions' ? 'active' : ''}`}
              onClick={() => setFilterType('promotions')}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
            >
              Promociones
            </button>
            <button
              className={`btn-secondary ${filterType === 'candidates' ? 'active' : ''}`}
              onClick={() => setFilterType('candidates')}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
            >
              Candidatos
            </button>
            <button
              className={`btn-secondary ${filterType === 'samples' ? 'active' : ''}`}
              onClick={() => setFilterType('samples')}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
            >
              Buffer Muestras
            </button>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '220px' }}>Acción / Evento</th>
              <th style={{ width: '110px' }}>Modelo Ant.</th>
              <th style={{ width: '110px' }}>Nuevo Mod.</th>
              <th>Razón / Contexto Técnico</th>
              <th style={{ width: '160px' }}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length > 0 ? (
              filteredEvents.map((ev) => {
                const isExpanded = Boolean(expandedGroups[ev.id]);

                return (
                  <React.Fragment key={ev.id}>
                    <tr style={{ backgroundColor: ev.isGroup && ev.count > 1 ? 'var(--bg-surface-elevated)' : 'transparent' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {ev.isGroup && ev.count > 1 && (
                            <button
                              type="button"
                              onClick={() => toggleGroup(ev.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-muted)',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Expandir/colapsar eventos agrupados"
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          )}
                          {getActionBadge(ev.action, ev.count)}
                        </div>
                      </td>
                      <td>{ev.old_model_version_id ? `v${ev.old_model_version_id}` : '—'}</td>
                      <td>
                        {ev.new_model_version_id ? (
                          <b style={{ color: 'var(--brand-500)', fontFamily: 'JetBrains Mono' }}>
                            v{ev.new_model_version_id}
                          </b>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {ev.isGroup && ev.count > 1
                          ? `${ev.count} eventos consecutivos agrupados. ${ev.reason || ''}`
                          : ev.reason || '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: 'var(--text-muted)' }}>
                        {ev.isGroup && ev.count > 1 && ev.firstTime !== ev.lastTime
                          ? `${String(ev.firstTime || '').slice(11, 19)} → ${String(ev.lastTime || '').slice(11, 19)}`
                          : String(ev.created_at || ev.firstTime || '').replace('T', ' ').slice(0, 19)}
                      </td>
                    </tr>

                    {/* Sub-rows when group is expanded */}
                    {ev.isGroup && isExpanded && ev.items.map((subItem, sIdx) => (
                      <tr key={`sub-${ev.id}-${sIdx}`} style={{ backgroundColor: 'var(--bg-surface-subtle)', fontSize: '0.75rem' }}>
                        <td style={{ paddingLeft: '2.5rem', color: 'var(--text-muted)' }}>
                          ↳ Instancia #{sIdx + 1}
                        </td>
                        <td>{subItem.old_model_version_id ? `v${subItem.old_model_version_id}` : '—'}</td>
                        <td>{subItem.new_model_version_id ? `v${subItem.new_model_version_id}` : '—'}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{subItem.reason || 'Muestra agregada a buffer hold-out'}</td>
                        <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-muted)' }}>
                          {String(subItem.created_at || '').replace('T', ' ').slice(0, 19)}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No se encontraron eventos que coincidan con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
