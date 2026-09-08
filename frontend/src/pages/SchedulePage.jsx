import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '../components/Layout/Header';
import { api } from '../api/client';
import {
  Play, Zap, BarChart3, Clock, Layers,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, AlertCircle
} from 'lucide-react';

const BLOCK_COLORS = {
  Traffic: { bg: 'rgba(59, 130, 246, 0.75)', border: '#3b82f6', label: 'Traffic' },
  Power: { bg: 'rgba(245, 158, 11, 0.75)', border: '#f59e0b', label: 'Power' },
  Disconnection: { bg: 'rgba(139, 92, 246, 0.75)', border: '#8b5cf6', label: 'Disconnection' },
  Integrated: { bg: 'rgba(16, 185, 129, 0.75)', border: '#10b981', label: 'Integrated' },
  Shadow: { bg: 'rgba(99, 102, 241, 0.75)', border: '#6366f1', label: 'Shadow' },
};

const STATUS_COLORS = {
  Proposed: 'badge-proposed',
  Approved: 'badge-approved',
  Rejected: 'badge-rejected',
};

function formatTime(isoStr) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch { return ''; }
}

function formatDate(isoStr) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

export default function SchedulePage() {
  const [schedule, setSchedule] = useState(null);
  const [manualSchedule, setManualSchedule] = useState(null);
  const [corridor, setCorridor] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [solverInfo, setSolverInfo] = useState(null);
  const [viewDays, setViewDays] = useState(3);
  const [dayOffset, setDayOffset] = useState(0);
  const [tooltip, setTooltip] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const ganttRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const [corridorData, schedData, manualData] = await Promise.all([
          api.getCorridor(),
          api.getSchedule().catch(() => null),
          api.getManualSchedule().catch(() => null),
        ]);
        setCorridor(corridorData);
        if (schedData && schedData.blocks) setSchedule(schedData);
        if (manualData && manualData.blocks) setManualSchedule(manualData);
      } catch (err) {
        console.error('Failed to load schedule:', err);
      }
    }
    load();
  }, []);

  const handleOptimize = async () => {
    setOptimizing(true);
    setSolverInfo(null);
    try {
      const result = await api.runOptimizer(30);
      setSchedule(result);
      setSolverInfo({
        status: result.solver_status,
        time: result.solver_time_seconds,
        blocks: result.blocks?.length || 0,
        tasks: result.total_tasks_scheduled,
        integrated: result.integrated_block_count,
        conflicts: result.conflict_count,
        availability: result.asset_availability_pct,
      });
      // Reload manual for comparison
      const manual = await api.getManualSchedule().catch(() => null);
      if (manual && manual.blocks) setManualSchedule(manual);
    } catch (err) {
      console.error('Optimization failed:', err);
      setSolverInfo({ status: 'ERROR', error: err.message });
    } finally {
      setOptimizing(false);
    }
  };

  // Gantt chart calculations
  const activeBlocks = showManual ? (manualSchedule?.blocks || []) : (schedule?.blocks || []);
  const sections = corridor?.sections || [];

  const now = new Date();
  const baseDate = new Date(now);
  baseDate.setHours(0, 0, 0, 0);
  baseDate.setDate(baseDate.getDate() + dayOffset);

  const endDate = new Date(baseDate);
  endDate.setDate(endDate.getDate() + viewDays);

  const totalHours = viewDays * 24;
  const pixelsPerHour = viewDays <= 1 ? 80 : viewDays <= 3 ? 40 : 20;
  const totalWidth = totalHours * pixelsPerHour;

  const getBlockPosition = useCallback((block) => {
    try {
      const start = new Date(block.start_time);
      const end = new Date(block.end_time);
      const startHours = (start - baseDate) / (1000 * 60 * 60);
      const endHours = (end - baseDate) / (1000 * 60 * 60);

      if (endHours < 0 || startHours > totalHours) return null;

      const left = Math.max(0, startHours * pixelsPerHour);
      const width = Math.max(20, (Math.min(endHours, totalHours) - Math.max(startHours, 0)) * pixelsPerHour);

      return { left, width };
    } catch { return null; }
  }, [baseDate, totalHours, pixelsPerHour]);

  // Generate time markers
  const timeMarkers = [];
  for (let h = 0; h < totalHours; h++) {
    const markerDate = new Date(baseDate);
    markerDate.setHours(markerDate.getHours() + h);
    const isEngHour = markerDate.getHours() >= 0 && markerDate.getHours() < 5;
    const isMidnight = markerDate.getHours() === 0;
    const isMajor = markerDate.getHours() % 6 === 0;

    timeMarkers.push({
      x: h * pixelsPerHour,
      label: isMidnight
        ? markerDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : markerDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      isMajor: isMajor || isMidnight,
      isEngHour,
      isMidnight,
    });
  }

  return (
    <>
      <Header title="Block Schedule" badge={schedule ? { text: `${schedule.solver_status || 'Ready'}`, className: schedule.solver_status === 'OPTIMAL' ? 'badge-live' : 'badge-proposed' } : undefined} />
      <div className="page-content">
        {/* Control Panel */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-primary btn-lg" onClick={handleOptimize} disabled={optimizing}>
                {optimizing ? (
                  <>
                    <div className="loading-spinner" style={{ width: 18, height: 18 }} />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Zap size={18} />
                    Generate Optimal Schedule
                  </>
                )}
              </button>

              <button
                className={`btn ${showManual ? 'btn-outline' : 'btn-outline'}`}
                onClick={() => setShowManual(!showManual)}
                style={showManual ? { borderColor: 'var(--signal-red)', color: 'var(--signal-red)' } : {}}
              >
                {showManual ? 'Showing Manual' : 'Show Manual Baseline'}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn btn-sm btn-outline" onClick={() => setDayOffset(d => d - 1)}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 600, minWidth: 120, textAlign: 'center' }}>
                {baseDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — {endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
              <button className="btn btn-sm btn-outline" onClick={() => setDayOffset(d => d + 1)}>
                <ChevronRight size={14} />
              </button>
              <div style={{ width: 1, height: 24, background: 'var(--border-default)', margin: '0 4px' }} />
              {[1, 3, 7].map(d => (
                <button
                  key={d}
                  className={`btn btn-sm ${viewDays === d ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setViewDays(d)}
                  style={{ minWidth: 40 }}
                >
                  {d}D
                </button>
              ))}
            </div>
          </div>

          {/* Solver Info */}
          {solverInfo && solverInfo.status !== 'ERROR' && (
            <div style={{
              marginTop: 16, padding: '12px 16px',
              background: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--signal-green)' }}>
                ✓ Solved ({solverInfo.status})
              </span>
              <div className="stats-row">
                <div className="stat-item">
                  <span className="stat-label">Time</span>
                  <span className="stat-value" style={{ color: 'var(--text-primary)' }}>{solverInfo.time}s</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Blocks</span>
                  <span className="stat-value" style={{ color: 'var(--signal-blue)' }}>{solverInfo.blocks}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Tasks</span>
                  <span className="stat-value" style={{ color: 'var(--text-primary)' }}>{solverInfo.tasks}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Integrated</span>
                  <span className="stat-value" style={{ color: 'var(--signal-green)' }}>{solverInfo.integrated}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Availability</span>
                  <span className="stat-value" style={{ color: 'var(--signal-green)' }}>{solverInfo.availability}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="legend">
            {Object.entries(BLOCK_COLORS).map(([type, { border, label }]) => (
              <div key={type} className="legend-item">
                <div className="legend-dot" style={{ background: border }} />
                <span>{label}</span>
              </div>
            ))}
            <div className="legend-item">
              <div className="legend-dot" style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px dashed var(--signal-green)' }} />
              <span>Engineering Hours (00-05)</span>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {activeBlocks.length} blocks · {showManual ? 'Manual baseline' : 'AI optimized'}
          </div>
        </div>

        {/* Gantt Chart */}
        <div className="gantt-container" ref={ganttRef} style={{ position: 'relative' }}>
          {optimizing && (
            <div className="loading-overlay">
              <div className="loading-spinner" />
              <div className="loading-text">Running CP-SAT Optimizer...</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Solving constraints across {sections.length} sections</div>
            </div>
          )}

          {/* Time axis header */}
          <div className="gantt-header-row">
            <div className="gantt-section-label">Section</div>
            <div className="gantt-timeline-area" style={{ overflowX: 'auto' }}>
              <div style={{ width: totalWidth, height: 36, position: 'relative' }}>
                {timeMarkers.filter(m => m.isMajor).map((m, i) => (
                  <div key={i} style={{
                    position: 'absolute', left: m.x, top: 0, bottom: 0,
                    display: 'flex', alignItems: 'center', paddingLeft: 6,
                    fontSize: 11, fontWeight: m.isMidnight ? 700 : 500,
                    color: m.isMidnight ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {m.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section rows */}
          {sections.map((section) => {
            const sectionBlocks = activeBlocks.filter(b => b.section_id === section.id);

            return (
              <div key={section.id} className="gantt-row">
                <div className="gantt-row-label">
                  <span>{section.from_station_name} → {section.to_station_name}</span>
                  <span className="gantt-row-sublabel">{section.length_km} km · {section.traffic_density}</span>
                </div>
                <div className="gantt-timeline-area" style={{ overflowX: 'auto' }}>
                  <div className="gantt-row-blocks" style={{ width: totalWidth }}>
                    {/* Engineering hour backgrounds */}
                    {Array.from({ length: viewDays }, (_, d) => {
                      const engStart = d * 24 * pixelsPerHour;
                      const engWidth = 5 * pixelsPerHour;
                      return (
                        <div key={`eng-${d}`} style={{
                          position: 'absolute', left: engStart, width: engWidth,
                          top: 0, bottom: 0,
                          background: 'rgba(16, 185, 129, 0.04)',
                          borderLeft: '1px dashed rgba(16, 185, 129, 0.15)',
                          borderRight: '1px dashed rgba(16, 185, 129, 0.15)',
                        }} />
                      );
                    })}

                    {/* Time grid lines */}
                    {timeMarkers.filter(m => m.isMajor).map((m, i) => (
                      <div key={i} className="gantt-time-marker" style={{ left: m.x }} />
                    ))}

                    {/* Block bars */}
                    {sectionBlocks.map((block) => {
                      const pos = getBlockPosition(block);
                      if (!pos) return null;

                      const colorInfo = BLOCK_COLORS[block.block_type] || BLOCK_COLORS.Traffic;
                      const isEmergency = block.assigned_tasks?.some(t => t.startsWith?.('EMR-') || t.startsWith?.('TSK-EMR'));

                      return (
                        <div
                          key={block.block_id}
                          className={`gantt-block ${isEmergency ? 'emergency' : ''}`}
                          style={{
                            left: pos.left,
                            width: pos.width,
                            background: isEmergency ? 'rgba(239, 68, 68, 0.85)' : colorInfo.bg,
                            borderColor: isEmergency ? '#ef4444' : colorInfo.border,
                          }}
                          onMouseEnter={(e) => {
                            const rect = ganttRef.current?.getBoundingClientRect();
                            setTooltip({
                              x: e.clientX - (rect?.left || 0) + 10,
                              y: e.clientY - (rect?.top || 0) - 10,
                              block,
                            });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          {pos.width > 60 && (
                            <span style={{ fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {block.block_type} · {block.duration_min}m
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Tooltip */}
          {tooltip && (
            <div className="tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
              <div className="tooltip-title">{tooltip.block.block_type} Block</div>
              <div className="tooltip-row">
                <span className="tooltip-label">Section</span>
                <span className="tooltip-value">{tooltip.block.section_name || tooltip.block.section_id}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Time</span>
                <span className="tooltip-value">{formatTime(tooltip.block.start_time)} — {formatTime(tooltip.block.end_time)}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Date</span>
                <span className="tooltip-value">{formatDate(tooltip.block.start_time)}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Duration</span>
                <span className="tooltip-value">{tooltip.block.duration_min} min</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Departments</span>
                <span className="tooltip-value">{tooltip.block.departments?.join(', ')}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Tasks</span>
                <span className="tooltip-value">{tooltip.block.assigned_tasks?.length || 0}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Status</span>
                <span className={`badge ${STATUS_COLORS[tooltip.block.status] || ''}`}>{tooltip.block.status}</span>
              </div>
              {tooltip.block.is_integrated && (
                <div style={{ marginTop: 4, fontSize: 10, color: 'var(--signal-green)', fontWeight: 700 }}>
                  ✦ INTEGRATED BLOCK
                </div>
              )}
            </div>
          )}
        </div>

        {/* Block Details Table */}
        {activeBlocks.length > 0 && (
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header">
              <div className="card-title">Block Details ({activeBlocks.length} blocks)</div>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Section</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Duration</th>
                    <th>Depts</th>
                    <th>Tasks</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBlocks.slice(0, 50).map((block) => (
                    <tr key={block.block_id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{block.block_id}</td>
                      <td>
                        <span className="badge" style={{
                          background: BLOCK_COLORS[block.block_type]?.bg || 'var(--bg-elevated)',
                          color: 'white',
                        }}>
                          {block.block_type}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{block.section_name || block.section_id}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatDate(block.start_time)} {formatTime(block.start_time)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatTime(block.end_time)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{block.duration_min}m</td>
                      <td>{block.departments?.map(d => (
                        <span key={d} className={`badge badge-${d === 'ENG' ? 'eng' : d === 'S&T' ? 'st' : 'trd'}`} style={{ marginRight: 4 }}>{d}</span>
                      ))}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{block.assigned_tasks?.length || 0}</td>
                      <td><span className={`badge ${STATUS_COLORS[block.status] || ''}`}>{block.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
