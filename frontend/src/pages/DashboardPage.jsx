import { useState, useEffect } from 'react';
import Header from '../components/Layout/Header';
import { api } from '../api/client';
import {
  TrendingUp, TrendingDown, Activity, Clock,
  Layers, AlertTriangle, Timer, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';

const KPI_CONFIG = [
  { key: 'asset_availability', icon: Activity, color: 'green', accent: 'var(--signal-green)' },
  { key: 'block_utilization', icon: BarChart3, color: 'blue', accent: 'var(--signal-blue)' },
  { key: 'integrated_block_ratio', icon: Layers, color: 'purple', accent: 'var(--signal-purple)' },
  { key: 'overdue_maintenance', icon: AlertTriangle, color: 'red', accent: 'var(--signal-red)' },
  { key: 'avg_block_duration', icon: Clock, color: 'amber', accent: 'var(--signal-amber)' },
  { key: 'delay_minutes_saved', icon: Timer, color: 'green', accent: 'var(--signal-green)' },
];

export default function DashboardPage() {
  const [kpis, setKpis] = useState(null);
  const [corridor, setCorridor] = useState(null);
  const [defects, setDefects] = useState([]);
  const [comparison, setComparison] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [kpiData, corridorData, defectData, compData] = await Promise.all([
          api.getKPIs(),
          api.getCorridor(),
          api.getDefects(),
          api.getComparisonKPIs().catch(() => []),
        ]);
        setKpis(kpiData);
        setCorridor(corridorData);
        setDefects(defectData);
        setComparison(compData);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Count defects by department
  const deptCounts = defects.reduce((acc, d) => {
    acc[d.department] = (acc[d.department] || 0) + 1;
    return acc;
  }, {});

  // Count defects by priority
  const priorityCounts = defects.reduce((acc, d) => {
    acc[d.priority_label] = (acc[d.priority_label] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <Header title="Dashboard" badge={{ text: 'Live', className: 'badge-live' }} />
      <div className="page-content">
        {/* KPI Cards */}
        <div className="kpi-grid">
          {KPI_CONFIG.map(({ key, icon: Icon, color }, idx) => {
            const kpi = kpis?.[key];
            const value = kpi?.value ?? 0;
            const improvement = kpi?.improvement_pct ?? 0;
            const isPositive = improvement > 0;
            const isOverdue = key === 'overdue_maintenance';

            return (
              <div key={key} className={`kpi-card ${color} animate-in`} style={{ animationDelay: `${idx * 60}ms` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="kpi-label">{kpi?.label || key.replace(/_/g, ' ')}</div>
                  <Icon size={18} style={{ color: `var(--signal-${color})`, opacity: 0.6 }} />
                </div>
                <div className={`kpi-value ${color}`}>
                  {typeof value === 'number' ? (value % 1 === 0 ? value : value.toFixed(1)) : value}
                  <span className="kpi-unit">{kpi?.unit || ''}</span>
                </div>
                {improvement !== 0 && (
                  <div className={`kpi-change ${(isOverdue ? !isPositive : isPositive) ? 'positive' : 'negative'}`}>
                    {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {isPositive ? '+' : ''}{typeof improvement === 'number' ? improvement.toFixed(1) : improvement} vs manual
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid-2" style={{ marginBottom: 24 }}>
          {/* Corridor Map */}
          <div className="card animate-in">
            <div className="card-header">
              <div className="card-title">Corridor Overview</div>
              <span className="badge badge-proposed">{corridor?.sections?.length || 0} Sections</span>
            </div>
            <div className="corridor-map">
              <div className="corridor-line">
                {corridor?.stations?.map((station, i) => {
                  const totalKm = corridor.stations[corridor.stations.length - 1]?.km || 1;
                  const pct = (station.km / totalKm) * 100;
                  const sectionDefects = defects.filter(d => {
                    const section = corridor.sections?.find(s =>
                      s.from_station === station.id || s.to_station === station.id
                    );
                    return section && d.section_id === section.id;
                  });
                  const criticalCount = sectionDefects.filter(d => d.priority_label === 'Critical').length;

                  return (
                    <div key={station.id} className="corridor-station" style={{ left: `${pct}%` }}>
                      {criticalCount > 0 && (
                        <div className="section-health" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--signal-red)' }}>
                          {criticalCount} critical
                        </div>
                      )}
                      <div className="station-dot" />
                      <div className="station-name">{station.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Defect Distribution */}
          <div className="card animate-in">
            <div className="card-header">
              <div className="card-title">Defect Distribution</div>
              <span className="badge badge-proposed">{defects.length} Active</span>
            </div>

            {/* By Department */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>By Department</div>
              {Object.entries(deptCounts).map(([dept, count]) => {
                const colors = { ENG: 'var(--signal-blue)', 'S&T': 'var(--signal-purple)', TRD: 'var(--signal-amber)' };
                const pct = defects.length > 0 ? (count / defects.length) * 100 : 0;
                return (
                  <div key={dept} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{dept}</span>
                      <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: colors[dept] }}>{count}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: colors[dept], borderRadius: 3, transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* By Priority */}
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>By Priority</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Critical', 'High', 'Medium', 'Low'].map(level => {
                  const count = priorityCounts[level] || 0;
                  const cls = level.toLowerCase();
                  return (
                    <div key={level} style={{
                      flex: 1, textAlign: 'center', padding: '10px 8px',
                      background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)', color: `var(--priority-${cls})` }}>{count}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{level}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        {comparison.length > 0 && (
          <div className="card animate-in">
            <div className="card-header">
              <div className="card-title">Manual vs AI-Optimized — Performance Comparison</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th style={{ textAlign: 'center' }}>Manual (Baseline)</th>
                    <th style={{ textAlign: 'center' }}>AI Optimized</th>
                    <th style={{ textAlign: 'center' }}>Improvement</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row) => (
                    <tr key={row.metric}>
                      <td style={{ fontWeight: 600 }}>{row.metric}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--signal-red)' }}>
                        {row.manual_value} {row.unit}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--signal-green)' }}>
                        {row.ai_value} {row.unit}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`kpi-change ${row.improvement >= 0 ? 'positive' : 'negative'}`}>
                          {row.improvement >= 0 ? '+' : ''}{row.improvement} {row.unit}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!kpis?.asset_availability?.value && (
          <div className="card" style={{ marginTop: 24 }}>
            <div className="empty-state">
              <Activity size={48} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: 12 }} />
              <div className="empty-state-title">No Optimized Schedule Yet</div>
              <div className="empty-state-desc">
                Go to the <strong>Block Schedule</strong> page and run the optimizer to see KPI improvements and comparison data.
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
