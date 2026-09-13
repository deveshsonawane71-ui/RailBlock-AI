/**
 * API Client — Centralized fetch wrapper for backend communication.
 * Includes intelligent fallback to embedded snapshot data when remote backend is sleeping or offline.
 */

import initialData from '../data/initialData.json';

const RAW_BASE = import.meta.env.VITE_API_BASE_URL;
// In production, point to the live Render backend
const BACKEND_HOST = RAW_BASE 
  ? RAW_BASE.replace(/\/$/, '') 
  : (import.meta.env.DEV ? '' : 'https://railblock-ai-backend.onrender.com');
const API_BASE = BACKEND_HOST ? `${BACKEND_HOST}/api` : '/api';

// ── Connection status tracking ──
let connectionStatus = 'checking'; // 'checking' | 'live' | 'offline'
const statusListeners = new Set();

function setConnectionStatus(status) {
  if (connectionStatus !== status) {
    connectionStatus = status;
    statusListeners.forEach((cb) => cb(status));
  }
}

export function onConnectionStatusChange(callback) {
  statusListeners.add(callback);
  callback(connectionStatus);
  return () => statusListeners.delete(callback);
}

export function getConnectionStatus() {
  return connectionStatus;
}

// Fire-and-forget warm-up: wake a sleeping Render instance on page
// load instead of waiting for the first feature click to discover it.
if (typeof window !== 'undefined' && BACKEND_HOST) {
  fetch(`${API_BASE}/kpis`)
    .then((res) => setConnectionStatus(res.ok ? 'live' : 'offline'))
    .catch(() => setConnectionStatus('offline'));
}

// In-memory working copy for interactive simulation when offline
let localState = JSON.parse(JSON.stringify(initialData));

function getFallbackData(endpoint, options = {}) {
  const method = options.method || 'GET';
  const cleanEndpoint = endpoint.split('?')[0];

  if (cleanEndpoint === '/corridor') return localState.corridor;
  if (cleanEndpoint === '/defects') return localState.defects;
  if (cleanEndpoint === '/kpis') return localState.kpis;
  if (cleanEndpoint === '/kpis/comparison') return localState.kpis_comparison;
  if (cleanEndpoint === '/schedule') return localState.schedule;
  if (cleanEndpoint === '/schedule/manual') return localState.manual_schedule;
  if (cleanEndpoint === '/schedule/compare') return localState.kpis_comparison;
  if (cleanEndpoint === '/approvals/pending') return localState.approvals_pending;
  if (cleanEndpoint === '/approvals/history') return localState.approvals_history;
  if (cleanEndpoint === '/trains/summary') return localState.trains_summary;

  if (cleanEndpoint === '/optimize') {
    return localState.schedule;
  }

  if (cleanEndpoint === '/replan') {
    // Return updated emergency schedule
    return {
      status: 'success',
      schedule: localState.schedule,
      replan_summary: {
        frozen_blocks: 12,
        rescheduled_blocks: 6,
        new_emergency_blocks: 1,
        cancelled_blocks: 0,
      }
    };
  }

  if (cleanEndpoint.startsWith('/approvals/') && cleanEndpoint.endsWith('/approve')) {
    const blockId = cleanEndpoint.split('/')[2];
    localState.approvals_pending = (localState.approvals_pending || []).filter(b => b.id !== blockId);
    return { status: 'approved', block_id: blockId };
  }

  if (cleanEndpoint.startsWith('/approvals/') && cleanEndpoint.endsWith('/reject')) {
    const blockId = cleanEndpoint.split('/')[2];
    localState.approvals_pending = (localState.approvals_pending || []).filter(b => b.id !== blockId);
    return { status: 'rejected', block_id: blockId };
  }

  if (cleanEndpoint === '/approvals/bulk') {
    const count = (localState.approvals_pending || []).length;
    localState.approvals_pending = [];
    return { status: 'approved', approved_count: count };
  }

  if (cleanEndpoint.startsWith('/defects/')) {
    const id = cleanEndpoint.split('/')[2];
    return (localState.defects || []).find(d => d.id === id) || null;
  }

  return {};
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout for fast response
    const response = await fetch(url, { ...config, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    setConnectionStatus('live');
    return await response.json();
  } catch (err) {
    console.warn(`[RailBlock AI] Live API (${endpoint}) not reachable, using local snapshot data.`, err.message);
    setConnectionStatus('offline');
    return getFallbackData(endpoint, options);
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
  rejectBlock: (blockId, reason = 'Traffic conflict') =>
    request(`/approvals/${blockId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  approveAll: () =>
    request('/approvals/bulk', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  bulkApprove: (blockIds = []) =>
    request('/approvals/bulk', {
      method: 'POST',
      body: JSON.stringify({ block_ids: blockIds }),
    }),

  // ── KPI endpoints ──
  getKPIs: () => request('/kpis'),
  getKPIComparison: () => request('/kpis/comparison'),
  getComparisonKPIs: () => request('/kpis/comparison'),
};
