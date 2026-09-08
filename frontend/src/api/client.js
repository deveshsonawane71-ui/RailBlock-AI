/**
 * API Client — Centralized fetch wrapper for backend communication.
 */

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `API Error: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error(`API request failed: ${endpoint}`, err);
    throw err;
  }
}

export const api = {
  // ── Data endpoints ──
  getCorridor: () => request('/corridor'),
  getDefects: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/defects${query ? `?${query}` : ''}`);
  },
  getDefect: (id) => request(`/defects/${id}`),
  getTrains: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/trains${query ? `?${query}` : ''}`);
  },
  getTrainsSummary: () => request('/trains/summary'),

  // ── Optimizer endpoints ──
  runOptimizer: (timeLimitSeconds = 30) =>
    request('/optimize', {
      method: 'POST',
      body: JSON.stringify({ time_limit_seconds: timeLimitSeconds }),
    }),
  getSchedule: () => request('/schedule'),
  getManualSchedule: () => request('/schedule/manual'),
  compareSchedules: () => request('/schedule/compare'),

  // ── Re-planning endpoints ──
  triggerReplan: (emergency) =>
    request('/replan', {
      method: 'POST',
      body: JSON.stringify(emergency),
    }),

  // ── Approval endpoints ──
  getPendingApprovals: () => request('/approvals/pending'),
  getApprovalHistory: () => request('/approvals/history'),
  approveBlock: (blockId, approvedBy = 'Section Controller') =>
    request(`/approvals/${blockId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved_by: approvedBy }),
    }),
  rejectBlock: (blockId, reason = 'Schedule conflict') =>
    request(`/approvals/${blockId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejected_by: 'Section Controller', reason }),
    }),
  modifyBlock: (blockId, modifications) =>
    request(`/approvals/${blockId}/modify`, {
      method: 'POST',
      body: JSON.stringify(modifications),
    }),
  approveAll: () =>
    request('/approvals/approve-all', { method: 'POST' }),

  // ── KPI endpoints ──
  getKPIs: () => request('/kpis'),
  getComparisonKPIs: () => request('/kpis/comparison'),
};
