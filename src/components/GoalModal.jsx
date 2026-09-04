import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { STATUSES, PRIORITIES } from '../constants.js';

const empty = {
  title: '',
  description: '',
  category_id: '',
  priority: 'medium',
  status: 'planned',
  deadline: '',
};

export default function GoalModal({ mode, goal, categories, onClose, onSave }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (goal) {
      setForm({
        title: goal.title || '',
        description: goal.description || '',
        category_id: goal.category_id || '',
        priority: goal.priority || 'medium',
        status: goal.status || 'planned',
        deadline: goal.deadline || '',
      });
    } else {
      setForm(empty);
    }
  }, [goal]);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        category_id: form.category_id ? Number(form.category_id) : null,
        deadline: form.deadline || null,
        status: form.status,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={mode === 'create' ? 'Нова цел' : 'Редактиране на цел'}
      subtitle="Добавете какво искате да създадете или изградите."
      onClose={onClose}
    >
      <form onSubmit={submit} className="form-grid">
        {error && <div className="alert error">{error}</div>}

        <label className="field span-2">
          <span>Заглавие *</span>
          <input value={form.title} onChange={update('title')} placeholder="Напр. Да изградя онлайн магазин" autoFocus required />
        </label>

        <label className="field span-2">
          <span>Описание</span>
          <textarea
            rows={3}
            value={form.description}
            onChange={update('description')}
            placeholder="Какво точно искате да постигнете?"
          />
        </label>

        <label className="field">
          <span>Категория</span>
          <select value={form.category_id} onChange={update('category_id')}>
            <option value="">Без категория</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Краен срок</span>
          <input type="date" value={form.deadline} onChange={update('deadline')} />
        </label>

        <label className="field">
          <span>Приоритет</span>
          <select value={form.priority} onChange={update('priority')}>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Статус</span>
          <select value={form.status} onChange={update('status')}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <div className="modal-actions span-2">
          <button type="button" className="btn ghost" onClick={onClose}>
            Отказ
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Записване...' : mode === 'create' ? 'Създай цел' : 'Запази промените'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
