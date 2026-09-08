import { useState, useEffect } from 'react';
import Header from '../components/Layout/Header';
import { api } from '../api/client';
import { Siren, AlertTriangle, Zap, ArrowRight } from 'lucide-react';

const EMERGENCY_PRESETS = [
  { type: 'Rail Fracture', dept: 'ENG', duration: 90, desc: 'Critical rail fracture detected — immediate attention required' },
  { type: 'OHE Wire Snap', dept: 'TRD', duration: 120, desc: 'Overhead equipment wire snapped — power block needed urgently' },
  { type: 'Point Machine Failure', dept: 'S&T', duration: 60, desc: 'Point machine failure at junction — signalling compromised' },
  { type: 'Track Circuit Fault', dept: 'S&T', duration: 75, desc: 'Track circuit showing false occupancy — safety critical' },
  { type: 'Insulator Flashover', dept: 'TRD', duration: 90, desc: 'Insulator flashover during rain — immediate power block required' },
];

export default function EmergencyPage() {
  const [sections, setSections] = useState([]);
  const [form, setForm] = useState({
    section_id: 'SEC01',
    defect_type: 'Rail Fracture',
    department: 'ENG',
    duration_min: 90,
    description: 'Critical rail fracture detected',
  });
  const [replanning, setReplanning] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.getCorridor().then(data => {
      setSections(data.sections || []);
    }).catch(() => {});
  }, []);

  const handlePreset = (preset) => {
    setForm({
      section_id: form.section_id,
      defect_type: preset.type,
      department: preset.dept,
      duration_min: preset.duration,
      description: preset.desc,
    });
  };

  const handleReplan = async () => {
    setReplanning(true);
    setResult(null);
    try {
      const res = await api.triggerReplan(form);
      setResult(res);
    } catch (err) {
      console.error('Re-plan failed:', err);
      setResult({ error: err.message });
    } finally {
      setReplanning(false);
    }
  };

  return (
    <>
      <Header title="Emergency Re-Planning" badge={{ text: 'Alert Mode', className: '' }} />
      <div className="page-content">
        <div className="emergency-alert">
          <Siren size={22} />
          <div className="emergency-alert-text">
            Emergency re-planning allows you to inject a critical defect and immediately re-optimize the block schedule.
          </div>
        </div>

        <div className="grid-2">
          {/* Emergency Form */}
          <div className="emergency-form">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--signal-red)' }}>
              <AlertTriangle size={18} style={{ display: 'inline', marginRight: 8 }} />
              Report Emergency Defect
            </h3>

            {/* Quick presets */}
            <div style={{ marginBottom: 20 }}>
              <div className="form-label">Quick Presets</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {EMERGENCY_PRESETS.map((p) => (
                  <button
                    key={p.type}
                    className="btn btn-sm btn-outline"
                    onClick={() => handlePreset(p)}
                    style={form.defect_type === p.type ? { borderColor: 'var(--signal-red)', color: 'var(--signal-red)' } : {}}
                  >
                    {p.type}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Section</label>
              <select className="form-select" value={form.section_id} onChange={e => setForm(f => ({ ...f, section_id: e.target.value }))}>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.from_station_name} → {s.to_station_name} ({s.id})</option>
                ))}
              </select>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Department</label>
                <select className="form-select" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                  <option value="ENG">Engineering (ENG)</option>
                  <option value="S&T">Signal & Telecom (S&T)</option>
                  <option value="TRD">Traction Distribution (TRD)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Est. Duration (min)</label>
                <input className="form-input" type="number" value={form.duration_min}
                  onChange={e => setForm(f => ({ ...f, duration_min: parseInt(e.target.value) || 60 }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <button className="btn btn-danger btn-lg" onClick={handleReplan} disabled={replanning} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              {replanning ? (
                <>
                  <div className="loading-spinner" style={{ width: 18, height: 18, borderTopColor: 'white' }} />
                  Re-planning Schedule...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  Trigger Emergency Re-Plan
                </>
              )}
            </button>
          </div>

          {/* Results */}
          <div>
            {result && !result.error ? (
              <div className="card animate-in">
                <div className="card-header">
                  <div className="card-title" style={{ color: 'var(--signal-green)' }}>✓ Re-Planning Complete</div>
                </div>

                {/* Emergency defect info */}
                {result.emergency_defect && (
                  <div style={{
                    padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)',
                    borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)',
                    marginBottom: 16,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--signal-red)', marginBottom: 4 }}>
                      Emergency: {result.emergency_defect.defect_type}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {result.emergency_defect.section_id} · {result.emergency_defect.department} · {result.emergency_defect.estimated_duration_min}min
                    </div>
                  </div>
                )}

                {/* Changes summary */}
                {result.changes && (
                  <div className="stats-row" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
                    <div className="stat-item">
                      <span className="stat-label">Frozen Blocks</span>
                      <span className="stat-value" style={{ color: 'var(--signal-blue)' }}>{result.changes.frozen_count}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Rescheduled</span>
                      <span className="stat-value" style={{ color: 'var(--signal-amber)' }}>{result.changes.rescheduled_count}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">New Blocks</span>
                      <span className="stat-value" style={{ color: 'var(--signal-green)' }}>{result.changes.new_blocks}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Solver</span>
                      <span className="stat-value">{result.changes.solver_status}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Time</span>
                      <span className="stat-value">{result.changes.solver_time}s</span>
                    </div>
                  </div>
                )}

                {/* Emergency block */}
                {result.emergency_block && (
                  <div style={{
                    padding: '14px 16px', background: 'rgba(16, 185, 129, 0.08)',
                    borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--signal-green)', marginBottom: 8 }}>
                      Emergency Block Scheduled
                    </div>
                    <div className="stats-row">
                      <div className="stat-item">
                        <span className="stat-label">Block ID</span>
                        <span className="stat-value" style={{ fontSize: 12 }}>{result.emergency_block.block_id}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Type</span>
                        <span className="stat-value" style={{ fontSize: 12 }}>{result.emergency_block.block_type}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Duration</span>
                        <span className="stat-value" style={{ fontSize: 12 }}>{result.emergency_block.duration_min}m</span>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                  Go to <strong>Block Schedule</strong> to see the updated Gantt chart, or <strong>Approvals</strong> to review the new blocks.
                </div>
              </div>
            ) : result?.error ? (
              <div className="card">
                <div style={{ padding: 20, textAlign: 'center' }}>
                  <AlertTriangle size={36} style={{ color: 'var(--signal-red)', marginBottom: 12 }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--signal-red)', marginBottom: 8 }}>Re-Planning Failed</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{result.error}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                    Make sure you've run the optimizer first on the Schedule page.
                  </div>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="empty-state">
                  <Siren size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 12 }} />
                  <div className="empty-state-title">Ready for Emergency</div>
                  <div className="empty-state-desc">
                    Select a defect type and section, then trigger re-planning. The optimizer will freeze approved blocks and re-schedule around the emergency.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
