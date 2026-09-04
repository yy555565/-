import { useState } from 'react';
import Modal from './Modal.jsx';
import { STATUSES, statusMeta } from '../constants.js';
import { CategoryChip, StatusBadge, PriorityBadge, DeadlineBadge, ProgressBar } from './Bits.jsx';

export default function GoalDetail({
  goal,
  categories,
  onClose,
  onEdit,
  onAddSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
  onDeleteGoal,
}) {
  const [newTitle, setNewTitle] = useState('');
  const [newStatus, setNewStatus] = useState('planned');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingStatus, setEditingStatus] = useState('planned');
  const [busy, setBusy] = useState(false);

  const subtasks = goal.subtasks || [];
  const doneCount = subtasks.filter((s) => s.status === 'completed').length;

  const add = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await onAddSubtask(goal.id, { title: newTitle.trim(), status: newStatus });
      setNewTitle('');
      setNewStatus('planned');
    } finally {
      setAdding(false);
    }
  };

  const beginEdit = (subtask) => {
    setEditingId(subtask.id);
    setEditingTitle(subtask.title);
    setEditingStatus(subtask.status);
  };

  const saveEdit = async () => {
    if (!editingTitle.trim()) return;
    setBusy(true);
    try {
      await onUpdateSubtask(goal.id, editingId, { title: editingTitle.trim(), status: editingStatus });
      setEditingId(null);
    } finally {
      setBusy(false);
    }
  };

  const cycleStatus = async (subtask) => {
    const idx = STATUSES.findIndex((s) => s.value === subtask.status);
    const next = STATUSES[(idx + 1) % STATUSES.length];
    await onUpdateSubtask(goal.id, subtask.id, { status: next.value, title: subtask.title });
  };

  return (
    <Modal
      title={goal.title}
      subtitle={goal.description}
      onClose={onClose}
      width="lg"
    >
      <div className="goal-detail">
        <div className="goal-detail-meta">
          <CategoryChip category={goal} />
          <StatusBadge status={goal.status} />
          <PriorityBadge priority={goal.priority} />
          <DeadlineBadge goal={goal} />
        </div>

        <div className="goal-progress-card">
          <div className="goal-progress-head">
            <span>Общ напредък на целта</span>
            <strong>{goal.progress}%</strong>
          </div>
          <ProgressBar value={goal.progress} size="md" />
          <p className="muted">
            {subtasks.length > 0
              ? `${doneCount} от ${subtasks.length} подзадачи са завършени`
              : 'Добавете подзадачи, за да видите по-подробен прогрес.'}
          </p>
        </div>

        <div className="detail-section-head">
          <h3>Подзадачи</h3>
          <span className="muted">{subtasks.length}</span>
        </div>

        <div className="add-subtask">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Добавете подзадача..."
          />
          <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button className="btn primary small" onClick={add} disabled={adding || !newTitle.trim()}>
            Добави
          </button>
        </div>

        <div className="subtask-list">
          {subtasks.length === 0 && (
            <div className="subtask-empty">Все още няма подзадачи. Разбийте целта на по-малки стъпки.</div>
          )}
          {subtasks.map((subtask, i) => {
            const meta = statusMeta(subtask.status);
            const done = subtask.status === 'completed';
            const editing = editingId === subtask.id;
            return (
              <div key={subtask.id} className={`subtask-row ${done ? 'done' : ''}`}>
                <button
                  className="subtask-check"
                  onClick={() => cycleStatus(subtask)}
                  title="Промени статуса (планирано → в процес → завършено)"
                >
                  {done ? '✓' : i + 1}
                </button>
                {editing ? (
                  <div className="subtask-edit">
                    <input value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} />
                    <select value={editingStatus} onChange={(e) => setEditingStatus(e.target.value)}>
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <button className="btn primary tiny" onClick={saveEdit} disabled={busy}>
                      Запази
                    </button>
                    <button className="btn ghost tiny" onClick={() => setEditingId(null)}>
                      Отказ
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="subtask-body">
                      <span className="subtask-title">{subtask.title}</span>
                      <span className="subtask-status" style={{ color: meta.color, background: meta.bg }}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="subtask-actions">
                      <button className="icon-btn small" onClick={() => beginEdit(subtask)} title="Редактирай">
                        ✎
                      </button>
                      <button
                        className="icon-btn small danger"
                        onClick={() => onDeleteSubtask(goal.id, subtask.id)}
                        title="Изтрий"
                      >
                        🗑
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="goal-detail-footer">
          <div className="detail-actions">
            <button className="btn primary" onClick={onEdit}>
              Редактирай целта
            </button>
            <button className="btn dangerous" onClick={() => onDeleteGoal(goal)}>
              Изтрий целта
            </button>
          </div>
          <button className="btn ghost" onClick={onClose}>
            Затвори
          </button>
        </div>
      </div>
    </Modal>
  );
}
