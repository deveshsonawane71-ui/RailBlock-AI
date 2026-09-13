/**
 * API Client — Centralized fetch wrapper for backend communication.
 * Includes intelligent fallback to embedded snapshot data when remote backend is sleeping or offline.
 * 
 * Performance design:
 *   - On page load, fallback data is returned synchronously from initialData.json
 *   - API calls run in the background to "upgrade" to live data when available
 *   - Session-level caching prevents redundant fetches during the same session
 *   - A single warm-up ping shares its result via the data cache
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

// ── Session-level response cache ──
// Stores live API responses so repeated navigations within the same
// session don't re-fetch (e.g. user goes Dashboard → Schedule → Dashboard).
const responseCache = new Map();

function getCached(endpoint) {
  return responseCache.get(endpoint) ?? null;
}

function setCache(endpoint, data) {
  responseCache.set(endpoint, data);
}

// ── Warm-up ──
// A single fire-and-forget ping to /kpis on page load that:
//   1. Wakes a sleeping Render instance
//   2. Shares the result via cache so the dashboard doesn't re-fetch /kpis
//   3. Updates connectionStatus
if (typeof window !== 'undefined' && BACKEND_HOST) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s for cold-start warm-up
  fetch(`${API_BASE}/kpis`, { signal: controller.signal })
    .then(async (res) => {
      clearTimeout(timeoutId);
      if (res.ok) {
        setConnectionStatus('live');
        const data = await res.json();
        setCache('/kpis', data); // share with dashboard
      } else {
        setConnectionStatus('offline');
      }
    })
    .catch(() => {
      clearTimeout(timeoutId);
      setConnectionStatus('offline');
    });
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

// ── Instant fallback data (synchronous) ──
// Returns fallback immediately so the UI renders at T=0 without waiting
// for any network round-trip.
export function getInstantFallback(endpoint) {
  // Prefer cached live data if available from a previous fetch
  const cached = getCached(endpoint);
  if (cached) return cached;
  return getFallbackData(endpoint);
}

const REQUEST_TIMEOUT_MS = 2000; // 2s timeout (reduced from 3.5s for faster fallback)

async function request(endpoint, options = {}) {
  // Return cached live data immediately if available (skip network entirely)
  const cleanEndpoint = endpoint.split('?')[0];
  const method = options.method || 'GET';
  if (method === 'GET') {
    const cached = getCached(cleanEndpoint);
    if (cached) {
      setConnectionStatus('live');
      return cached;
    }
  }

  const url = `${API_BASE}${endpoint}`;

  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const response = await fetch(url, { ...config, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    setConnectionStatus('live');
    const data = await response.json();
    // Cache GET responses for the session
    if (method === 'GET') {
      setCache(cleanEndpoint, data);
    }
    return data;
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
