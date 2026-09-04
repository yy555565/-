export const STATUSES = [
  { value: 'planned', label: 'Планирано', color: '#94a3b8', bg: '#f1f5f9' },
  { value: 'in_progress', label: 'В процес', color: '#d97706', bg: '#fef3c7' },
  { value: 'completed', label: 'Завършено', color: '#16a34a', bg: '#dcfce7' },
];

export const PRIORITIES = [
  { value: 'low', label: 'Ниска', color: '#64748b', weight: 1 },
  { value: 'medium', label: 'Средна', color: '#2563eb', weight: 2 },
  { value: 'high', label: 'Висока', color: '#ea580c', weight: 3 },
  { value: 'critical', label: 'Критична', color: '#dc2626', weight: 4 },
];

export const CATEGORY_COLORS = [
  '#6366f1', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#ec4899',
  '#8b5cf6', '#14b8a6', '#f97316', '#eab308', '#3b82f6', '#a855f7',
];

export const CATEGORY_ICONS = [
  '🎯', '🏠', '💼', '💸', '💪', '📚', '✈️', '🎨', '🎓', '🧘', '🚀', '💻',
  '🎮', '🍎', '❤️', '📷', '🌍', '🏆', '🔧', '⚡', '💡', '📈', '🛠️', '🌱',
];

export function statusMeta(value) {
  return STATUSES.find((s) => s.value === value) || STATUSES[0];
}

export function priorityMeta(value) {
  return PRIORITIES.find((p) => p.value === value) || PRIORITIES[1];
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('bg-BG', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function isOverdue(goal) {
  if (!goal.deadline) return false;
  if (goal.status === 'completed') return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const deadline = new Date(`${goal.deadline}T23:59:59`);
  return deadline < today;
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}
