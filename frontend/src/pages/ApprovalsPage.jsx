import { useState, useEffect, useCallback } from 'react';
import Header from '../components/Layout/Header';
import { api } from '../api/client';
import { CheckCircle2, XCircle, Clock, CheckCheck } from 'lucide-react';

const BLOCK_TYPE_STYLES = {
  Traffic: { bg: 'rgba(59, 130, 246, 0.12)', color: 'var(--signal-blue)' },
  Power: { bg: 'rgba(245, 158, 11, 0.12)', color: 'var(--signal-amber)' },
  Disconnection: { bg: 'rgba(139, 92, 246, 0.12)', color: 'var(--signal-purple)' },
  Integrated: { bg: 'rgba(16, 185, 129, 0.12)', color: 'var(--signal-green)' },
};

export default function ApprovalsPage() {
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');

  const loadData = useCallback(async () => {
    try {
      const [p, h] = await Promise.all([
        api.getPendingApprovals(),
        api.getApprovalHistory(),
      ]);
      setPending(Array.isArray(p) ? p : []);
      setHistory(Array.isArray(h) ? h : []);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async (blockId) => {
    try {
      await api.approveBlock(blockId);
      await loadData();
    } catch (err) {
      console.error('Approve failed:', err);
    }
  };

  const handleReject = async (blockId) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      await api.rejectBlock(blockId, reason);
      await loadData();
    } catch (err) {
      console.error('Reject failed:', err);
    }
  };

  const handleApproveAll = async () => {
    try {
      await api.approveAll();
      await loadData();
    } catch (err) {
      console.error('Approve all failed:', err);
    }
  };

  const formatTime = (iso) => {
    try {
      return new Date(iso).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
      });
    } catch { return ''; }
  };

  const items = tab === 'pending' ? pending : history;

  return (
    <>
      <Header title="Block Approvals" badge={{ text: `${pending.length} Pending`, className: pending.length > 0 ? 'badge-proposed' : 'badge-live' }} />
      <div className="page-content">
        {/* Tab + Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className={`btn btn-sm ${tab === 'pending' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('pending')}>
              <Clock size={14} /> Pending ({pending.length})
            </button>
            <button className={`btn btn-sm ${tab === 'history' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('history')}>
              History ({history.length})
            </button>
          </div>
          {tab === 'pending' && pending.length > 0 && (
            <button className="btn btn-sm btn-success" onClick={handleApproveAll}>
              <CheckCheck size={14} /> Approve All
            </button>
          )}
        </div>

        {/* Cards */}
        {items.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <CheckCircle2 size={48} style={{ color: 'var(--signal-green)', opacity: 0.4, marginBottom: 12 }} />
              <div className="empty-state-title">
                {tab === 'pending' ? 'No Pending Approvals' : 'No History Yet'}
              </div>
              <div className="empty-state-desc">
                {tab === 'pending'
                  ? 'Run the optimizer to generate blocks that require approval.'
                  : 'Approved and rejected blocks will appear here.'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {items.map((block) => {
              const style = BLOCK_TYPE_STYLES[block.block_type] || BLOCK_TYPE_STYLES.Traffic;
              return (
                <div key={block.block_id} className="approval-card">
                  <div className="approval-header">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{block.block_id}</span>
                        <span className="badge" style={{ background: style.bg, color: style.color }}>{block.block_type}</span>
                        {block.is_integrated && (
                          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--signal-green)' }}>Integrated</span>
                        )}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>
                        {block.section_name || block.section_id}
                      </div>
                    </div>
                    <span className={`badge ${block.status === 'Approved' ? 'badge-approved' : block.status === 'Rejected' ? 'badge-rejected' : 'badge-proposed'}`}>
                      {block.status}
                    </span>
                  </div>

                  <div className="stats-row" style={{ marginBottom: 12 }}>
                    <div className="stat-item">
                      <span className="stat-label">Start</span>
                      <span className="stat-value" style={{ fontSize: 13 }}>{formatTime(block.start_time)}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">End</span>
                      <span className="stat-value" style={{ fontSize: 13 }}>{formatTime(block.end_time)}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Duration</span>
                      <span className="stat-value" style={{ fontSize: 13 }}>{block.duration_min}m</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Departments</span>
                      <span className="stat-value" style={{ fontSize: 13 }}>{block.departments?.join(', ')}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Tasks</span>
                      <span className="stat-value" style={{ fontSize: 13 }}>{block.assigned_tasks?.length || 0}</span>
                    </div>
                  </div>

                  {/* Task Details */}
                  {block.task_details?.length > 0 && (
                    <div style={{
                      padding: '8px 12px', background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-sm)', marginBottom: 12, fontSize: 12,
                    }}>
                      {block.task_details.map((t, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{t.type}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{t.department} · {t.duration_min}m</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {block.status === 'Proposed' && (
                    <div className="approval-actions">
                      <button className="btn btn-sm btn-success" onClick={() => handleApprove(block.block_id)}>
                        <CheckCircle2 size={14} /> Approve
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleReject(block.block_id)}>
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  )}

                  {block.status === 'Approved' && (
                    <div style={{ fontSize: 12, color: 'var(--signal-green)', marginTop: 8 }}>
                      ✓ Approved by {block.approved_by} at {formatTime(block.approved_at)}
                    </div>
                  )}

                  {block.status === 'Rejected' && (
                    <div style={{ fontSize: 12, color: 'var(--signal-red)', marginTop: 8 }}>
                      ✗ Rejected: {block.rejection_reason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
