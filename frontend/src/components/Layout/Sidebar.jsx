import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, CalendarClock, AlertTriangle,
  ClipboardCheck, Siren, Train
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/schedule', label: 'Block Schedule', icon: CalendarClock },
  { path: '/defects', label: 'Defects', icon: AlertTriangle },
  { path: '/approvals', label: 'Approvals', icon: ClipboardCheck },
  { path: '/emergency', label: 'Emergency', icon: Siren },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <Train size={20} />
          </div>
          <div>
            <div className="sidebar-title">RailBlock AI</div>
            <div className="sidebar-subtitle">Smart Block Planning</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon className="nav-icon" size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ marginBottom: 8, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
          Current Role
        </div>
        <select className="role-selector" defaultValue="controller">
          <option value="controller">Section Controller</option>
          <option value="engineer">Maintenance Engineer</option>
          <option value="approver">Divisional Officer</option>
          <option value="tpc">Traction Power Controller</option>
        </select>
        <div style={{ marginTop: 16, padding: '10px 12px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Corridor</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Mumbai CST → Thane</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Central Railway · Mumbai Div</div>
        </div>
      </div>
    </aside>
  );
}
