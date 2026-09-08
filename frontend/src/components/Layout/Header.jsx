import { Bell, Settings } from 'lucide-react';

export default function Header({ title, badge }) {
  return (
    <header className="header">
      <div className="header-left">
        <h1 className="page-title">{title}</h1>
        {badge && <span className={`page-badge ${badge.className || 'badge-live'}`}>{badge.text}</span>}
      </div>
      <div className="header-right">
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
        <button className="header-btn" title="Notifications">
          <Bell size={18} />
        </button>
        <button className="header-btn" title="Settings">
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
