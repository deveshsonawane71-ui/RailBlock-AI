import { useState, useEffect } from 'react';
import Header from '../components/Layout/Header';
import { api } from '../api/client';
import { AlertTriangle, Filter, Search } from 'lucide-react';

const PRIORITY_BADGE = {
  Critical: 'badge-critical',
  High: 'badge-high',
  Medium: 'badge-medium',
  Low: 'badge-low',
};

const DEPT_BADGE = {
  ENG: 'badge-eng',
  'S&T': 'badge-st',
  TRD: 'badge-trd',
};

export default function DefectsPage() {
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ department: '', priority: '', search: '' });

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getDefects();
        setDefects(data);
      } catch (err) {
        console.error('Failed to load defects:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = defects.filter(d => {
    if (filter.department && d.department !== filter.department) return false;
    if (filter.priority && d.priority_label !== filter.priority) return false;
    if (filter.search && !d.defect_type.toLowerCase().includes(filter.search.toLowerCase()) &&
        !d.defect_id.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <Header title="Defects & Maintenance" badge={{ text: `${defects.length} Active`, className: 'badge-proposed' }} />
      <div className="page-content">
        {/* Filters */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                placeholder="Search defects..."
                style={{ paddingLeft: 36 }}
                value={filter.search}
                onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
              />
            </div>
            <select className="form-select" style={{ width: 160 }} value={filter.department} onChange={e => setFilter(f => ({ ...f, department: e.target.value }))}>
              <option value="">All Departments</option>
              <option value="ENG">Engineering</option>
              <option value="S&T">Signal & Telecom</option>
              <option value="TRD">Traction Distribution</option>
            </select>
            <select className="form-select" style={{ width: 140 }} value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}>
              <option value="">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} results</span>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Dept</th>
                  <th>Section</th>
                  <th>Severity</th>
                  <th>Priority</th>
                  <th>Score</th>
                  <th>Due Date</th>
                  <th>Duration</th>
                  <th>Block Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const isOverdue = new Date(d.due_date) < new Date();
                  return (
                    <tr key={d.defect_id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{d.defect_id}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {d.safety_critical && <AlertTriangle size={13} style={{ color: 'var(--signal-red)' }} />}
                          <span style={{ fontSize: 13 }}>{d.defect_type}</span>
                        </div>
                      </td>
                      <td><span className={`badge ${DEPT_BADGE[d.department] || ''}`}>{d.department}</span></td>
                      <td style={{ fontSize: 12 }}>{d.section_id}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{d.severity}</td>
                      <td><span className={`badge ${PRIORITY_BADGE[d.priority_label] || ''}`}>{d.priority_label}</span></td>
                      <td>
                        <div style={{
                          fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13,
                          color: d.priority_score >= 85 ? 'var(--priority-critical)' :
                                 d.priority_score >= 65 ? 'var(--priority-high)' :
                                 d.priority_score >= 40 ? 'var(--priority-medium)' : 'var(--priority-low)',
                        }}>
                          {d.priority_score?.toFixed(1)}
                        </div>
                      </td>
                      <td style={{
                        fontFamily: 'var(--font-mono)', fontSize: 12,
                        color: isOverdue ? 'var(--signal-red)' : 'var(--text-primary)',
                        fontWeight: isOverdue ? 700 : 400,
                      }}>
                        {new Date(d.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {isOverdue && ' ⚠'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{d.estimated_duration_min}m</td>
                      <td><span className="badge" style={{
                        background: d.requires_block_type === 'Traffic' ? 'rgba(59, 130, 246, 0.12)' :
                                   d.requires_block_type === 'Power' ? 'rgba(245, 158, 11, 0.12)' :
                                   'rgba(139, 92, 246, 0.12)',
                        color: d.requires_block_type === 'Traffic' ? 'var(--signal-blue)' :
                               d.requires_block_type === 'Power' ? 'var(--signal-amber)' :
                               'var(--signal-purple)',
                      }}>{d.requires_block_type}</span></td>
                      <td><span className="badge badge-proposed">{d.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
