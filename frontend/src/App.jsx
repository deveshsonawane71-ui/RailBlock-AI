import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import DashboardPage from './pages/DashboardPage';
import SchedulePage from './pages/SchedulePage';
import DefectsPage from './pages/DefectsPage';
import ApprovalsPage from './pages/ApprovalsPage';
import EmergencyPage from './pages/EmergencyPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/defects" element={<DefectsPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/emergency" element={<EmergencyPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
