export default function Sidebar({ view, setView, user, onLogout, counts, overallProgress }) {
  const navItems = [
    { id: 'goals', icon: '📋', label: 'Цели' },
    { id: 'categories', icon: '🏷️', label: 'Категории' },
    { id: 'map', icon: '🕸️', label: 'Карта' },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-icon">🎯</span>
        <div>
          <strong>GoalBuilder</strong>
          <small>Моите цели</small>
        </div>
      </div>

      <nav className="nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={view === item.id ? 'active' : ''}
            onClick={() => setView(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.id === 'goals' && <span className="nav-count">{counts.goals}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-progress">
        <div className="sidebar-progress-title">
          <span>Общ напредък</span>
          <strong>{overallProgress}%</strong>
        </div>
        <div className="progress-track small">
          <div className="progress-fill" style={{ width: `${overallProgress}%` }} />
        </div>
        <div className="sidebar-stats">
          <div>
            <strong>{counts.completed}</strong>
            <span>готови</span>
          </div>
          <div>
            <strong>{counts.categories}</strong>
            <span>категории</span>
          </div>
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="avatar">{user?.name?.[0]?.toUpperCase() || '?'}</div>
          <div className="user-meta">
            <strong>{user?.name}</strong>
            <small>{user?.email}</small>
          </div>
        </div>
        <button className="btn ghost small" onClick={onLogout}>
          Изход
        </button>
      </div>
    </aside>
  );
}
