import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import DashboardPage from './pages/DashboardPage';

// Lazy-load non-dashboard pages — they are only fetched when navigated to,
// keeping the initial bundle lean and the dashboard paint as fast as possible.
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const DefectsPage = lazy(() => import('./pages/DefectsPage'));
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage'));
const EmergencyPage = lazy(() => import('./pages/EmergencyPage'));

export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/defects" element={<DefectsPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/emergency" element={<EmergencyPage />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
