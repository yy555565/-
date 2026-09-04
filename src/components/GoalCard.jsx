import { CategoryChip, StatusBadge, PriorityBadge, DeadlineBadge, ProgressBar } from './Bits.jsx';

export default function GoalCard({ goal, onOpen, onEdit, onDelete }) {
  const subtasks = goal.subtasks || [];
  const doneCount = subtasks.filter((s) => s.status === 'completed').length;

  return (
    <article
      className="goal-card"
      onClick={() => onOpen(goal)}
      style={{ borderTopColor: goal.category_color || '#e2e8f0' }}
    >
      <div className="goal-card-head">
        <CategoryChip category={goal} size="sm" />
        <div className="goal-card-actions">
          <button
            className="icon-btn small"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(goal);
            }}
            title="Редактирай"
          >
            ✎
          </button>
          <button
            className="icon-btn small danger"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('Сигурни ли сте, че искате да изтриете тази цел?')) onDelete(goal);
            }}
            title="Изтрий"
          >
            🗑
          </button>
        </div>
      </div>

      <h3 className="goal-title">{goal.title}</h3>
      {goal.description && <p className="goal-desc">{goal.description}</p>}

      <div className="goal-card-badges">
        <StatusBadge status={goal.status} size="sm" />
        <PriorityBadge priority={goal.priority} size="sm" />
        <DeadlineBadge goal={goal} />
      </div>

      <div className="goal-card-progress">
        <div className="goal-card-progress-head">
          <span>Напредък</span>
          <strong style={{ color: goal.category_color || '#6366f1' }}>{goal.progress}%</strong>
        </div>
        <ProgressBar value={goal.progress} color={goal.category_color || '#6366f1'} size="sm" />
        {subtasks.length > 0 && (
          <div className="goal-subtask-count">
            <span className="mini-icon">▤</span>
            {doneCount}/{subtasks.length} подзадачи
          </div>
        )}
      </div>
    </article>
  );
}
