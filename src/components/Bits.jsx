import { statusMeta, priorityMeta, formatDate, isOverdue, daysUntil } from '../constants.js';

export function ProgressBar({ value, color, size = 'normal' }) {
  const safe = Math.max(0, Math.min(100, value || 0));
  return (
    <div className={`progress-track ${size}`}>
      <div
        className="progress-fill"
        style={{
          width: `${safe}%`,
          background: color || (safe >= 100 ? '#22c55e' : safe >= 50 ? '#f59e0b' : '#6366f1'),
        }}
      />
    </div>
  );
}

export function CategoryChip({ category, size = 'md' }) {
  if (!category) {
    return <span className={`chip category-chip ${size}`}>Без категория</span>;
  }
  if (typeof category === 'object') {
    return (
      <span
        className={`chip category-chip ${size}`}
        style={{ background: `${category.color}1a`, color: category.color, borderColor: `${category.color}40` }}
      >
        <span>{category.icon}</span> {category.name}
      </span>
    );
  }
  return null;
}

export function StatusBadge({ status, size = 'md' }) {
  const meta = statusMeta(status);
  return (
    <span
      className={`chip status-chip ${size}`}
      style={{ background: meta.bg, color: meta.color, borderColor: `${meta.color}30` }}
    >
      <span className="dot" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

export function PriorityBadge({ priority, size = 'md' }) {
  const meta = priorityMeta(priority);
  return (
    <span className={`chip priority-chip ${size}`} style={{ color: meta.color }}>
      {(meta.weight === 4 ? '🔥 ' : meta.weight === 3 ? '⚡ ' : meta.weight === 2 ? '▲ ' : '· ') + meta.label}
    </span>
  );
}

export function DeadlineBadge({ goal }) {
  if (!goal.deadline) return null;
  const overdue = isOverdue(goal);
  const days = daysUntil(goal.deadline);
  let label = formatDate(goal.deadline);
  let css = 'deadline-chip';
  if (overdue) {
    label = `Просрочено: ${label}`;
    css += ' overdue';
  } else if (days !== null && days <= 3) {
    css += ' soon';
  }
  return <span className={`chip ${css}`}>⏰ {label}</span>;
}

export function EmptyState({ icon = '📭', title, subtitle, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
      {action}
    </div>
  );
}
