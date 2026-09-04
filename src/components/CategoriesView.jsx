import { useState } from 'react';
import { api } from '../api.js';
import Modal from './Modal.jsx';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../constants.js';
import { EmptyState, ProgressBar } from './Bits.jsx';

const emptyForm = { name: '', color: '#6366f1', icon: '🎯' };

export default function CategoriesView({ categories, goals, refresh, notify }) {
  const [modal, setModal] = useState(null); // {mode, category}
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const openCreate = () => {
    setForm(emptyForm);
    setModal({ mode: 'create' });
  };

  const openEdit = (category) => {
    setForm({ name: category.name, color: category.color, icon: category.icon });
    setModal({ mode: 'edit', category });
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError('Въведете име на категорията.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (modal.mode === 'create') {
        await api.createCategory(form);
        notify('Категорията е създадена.');
      } else {
        await api.updateCategory(modal.category.id, form);
        notify('Категорията е обновена.');
      }
      setModal(null);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (category) => {
    const count = categories.find((c) => c.id === category.id)?.goal_count || 0;
    const msg =
      count > 0
        ? `Категорията "${category.name}" съдържа ${count} цел(и). Те ще останат без категория. Изтриване?`
        : `Сигурни ли сте, че искате да изтриете "${category.name}"?`;
    if (!window.confirm(msg)) return;
    try {
      await api.deleteCategory(category.id);
      notify('Категорията е изтрита.');
      await refresh();
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  const groupedGoals = (categoryId) => {
    const items = goals.filter((g) => g.category_id === categoryId);
    const progress = items.length
      ? Math.round(items.reduce((s, g) => s + g.progress, 0) / items.length)
      : 0;
    return { items, progress };
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Категории</h1>
          <p className="muted">
            Организирайте целите си по теми и ги разглеждайте визуално по цвят и икона.
          </p>
        </div>
        <button className="btn primary" onClick={openCreate}>
          + Нова категория
        </button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon="🏷️"
          title="Няма категории"
          subtitle="Създайте категории, за да групирате различните области от живота си."
          action={
            <button className="btn primary" onClick={openCreate}>
              + Създай категория
            </button>
          }
        />
      ) : (
        <div className="category-grid">
          {categories.map((cat) => {
            const { items, progress } = groupedGoals(cat.id);
            return (
              <div className="category-card" key={cat.id} style={{ borderTopColor: cat.color }}>
                <div className="category-card-top">
                  <div
                    className="category-avatar"
                    style={{ background: `${cat.color}1a`, color: cat.color }}
                  >
                    {cat.icon}
                  </div>
                  <div className="category-card-actions">
                    <button className="icon-btn small" onClick={() => openEdit(cat)} title="Редактирай">
                      ✎
                    </button>
                    <button className="icon-btn small danger" onClick={() => remove(cat)} title="Изтрий">
                      🗑
                    </button>
                  </div>
                </div>
                <h3>{cat.name}</h3>
                <div className="muted">{items.length} цели</div>
                <div className="category-progress-row">
                  <ProgressBar value={progress} color={cat.color} size="sm" />
                  <span style={{ color: cat.color }}>{progress}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Нова категория' : 'Редактиране на категория'}
          onClose={() => setModal(null)}
          width="md"
        >
          <div className="form-grid">
            {error && <div className="alert error span-2">{error}</div>}
            <label className="field span-2">
              <span>Име *</span>
              <input
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  setError('');
                }}
                placeholder="Напр. Спорт, Кариера, Пътуване"
                autoFocus
              />
            </label>

            <div className="field span-2">
              <span>Цвят</span>
              <div className="color-picker">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={form.color === color ? 'active' : ''}
                    style={{ background: color }}
                    onClick={() => setForm((f) => ({ ...f, color }))}
                  />
                ))}
              </div>
            </div>

            <div className="field span-2">
              <span>Икона</span>
              <div className="icon-picker">
                {CATEGORY_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={form.icon === icon ? 'active' : ''}
                    onClick={() => setForm((f) => ({ ...f, icon }))}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-actions span-2">
              <button className="btn ghost" onClick={() => setModal(null)}>
                Отказ
              </button>
              <button className="btn primary" onClick={save} disabled={busy}>
                {busy ? 'Записване...' : 'Запази'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
