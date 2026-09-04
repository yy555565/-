import { useMemo } from 'react';
import GoalCard from './GoalCard.jsx';
import { EmptyState } from './Bits.jsx';
import { PRIORITIES, STATUSES } from '../constants.js';

export default function GoalsView({
  goals,
  categories,
  filters,
  setFilters,
  onNewGoal,
  onEditGoal,
  onDeleteGoal,
  onOpenGoal,
  refresh,
}) {
  const grouped = useMemo(() => {
    const groups = {};
    for (const goal of goals) {
      const key = goal.category_id || 'none';
      if (!groups[key]) {
        groups[key] = {
          name: goal.category_name ? `${goal.category_icon} ${goal.category_name}` : 'Без категория',
          color: goal.category_color || '#94a3b8',
          icon: goal.category_icon || '🗂',
          items: [],
        };
      }
      groups[key].items.push(goal);
    }
    return Object.entries(groups).sort((a, b) => {
      const x = a[1].name;
      const y = b[1].name;
      return x.localeCompare(y, 'bg');
    });
  }, [goals]);

  const stats = useMemo(() => {
    const total = goals.length;
    const completed = goals.filter((g) => g.status === 'completed').length;
    const inProgress = goals.filter((g) => g.status === 'in_progress').length;
    const planned = goals.filter((g) => g.status === 'planned').length;
    const avg = total ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / total) : 0;
    return [
      { label: 'Общо цели', value: total, color: '#6366f1', icon: '🎯' },
      { label: 'Завършени', value: completed, color: '#22c55e', icon: '✅' },
      { label: 'В процес', value: inProgress, color: '#f59e0b', icon: '⏳' },
      { label: 'Планирани', value: planned, color: '#94a3b8', icon: '📋' },
      { label: 'Напредък', value: `${avg}%`, color: '#0ea5e9', icon: '📈' },
    ];
  }, [goals]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Моите цели</h1>
          <p className="muted">Записвайте и изграждайте всичко, което искате да постигнете.</p>
        </div>
        <button className="btn primary" onClick={onNewGoal}>
          + Нова цел
        </button>
      </div>

      <div className="stats-grid">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background: `${s.color}1a`, color: s.color }}>
              {s.icon}
            </div>
            <div>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="filters-card">
        <input
          className="search-input"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          placeholder="Търсене в цели..."
        />
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="all">Всички категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
        >
          <option value="all">Всички приоритети</option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="all">Всички статуси</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {grouped.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="Няма намерени цели"
          subtitle="Добавете първата си цел, за да започнете да изграждате план."
          action={
            <button className="btn primary" onClick={onNewGoal}>
              + Създай цел
            </button>
          }
        />
      ) : (
        <div className="grouped-goals">
          {grouped.map(([key, group]) => (
            <section className="goal-group" key={key}>
              <div className="goal-group-head">
                <span className="group-icon" style={{ background: `${group.color}20`, color: group.color }}>
                  {group.icon}
                </span>
                <h2>{group.name}</h2>
                <span className="muted">{group.items.length}</span>
              </div>
              <div className="goal-grid">
                {group.items.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onOpen={onOpenGoal}
                    onEdit={onEditGoal}
                    onDelete={onDeleteGoal}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
