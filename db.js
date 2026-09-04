import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dataDir = path.resolve('data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'goals.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    icon TEXT NOT NULL DEFAULT '🎯',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category_id INTEGER,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'planned',
    deadline TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planned',
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
  CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
  CREATE INDEX IF NOT EXISTS idx_goals_category ON goals(category_id);
  CREATE INDEX IF NOT EXISTS idx_subtasks_goal ON subtasks(goal_id);
`);

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_CATEGORIES = [
  { name: 'Дом', color: '#6366f1', icon: '🏠' },
  { name: 'Кариера', color: '#0ea5e9', icon: '💼' },
  { name: 'Финанси', color: '#f59e0b', icon: '💸' },
  { name: 'Здраве', color: '#22c55e', icon: '💪' },
  { name: 'Учене', color: '#8b5cf6', icon: '📚' },
  { name: 'Творчество', color: '#ec4899', icon: '✨' },
];

export function seedDefaultCategories(userId) {
  const insert = db.prepare(
    'INSERT INTO categories (user_id, name, color, icon) VALUES (?, ?, ?, ?)'
  );
  for (const cat of DEFAULT_CATEGORIES) {
    insert.run(userId, cat.name, cat.color, cat.icon);
  }
}

export function computeGoalProgress(goal, subtasks) {
  if (goal.status === 'completed') return 100;
  if (subtasks && subtasks.length > 0) {
    const done = subtasks.filter((s) => s.status === 'completed').length;
    return Math.round((done / subtasks.length) * 100);
  }
  return goal.status === 'in_progress' ? 50 : 0;
}

function oneRow(row) {
  return row ? { ...row, flags: undefined } : null;
}

export function listCategories(userId) {
  return db
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM goals g WHERE g.category_id = c.id) as goal_count
       FROM categories c
       WHERE c.user_id = ?
       ORDER BY c.name COLLATE NOCASE ASC`
    )
    .all(userId);
}

export function createCategory(userId, { name, color, icon }) {
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO categories (user_id, name, color, icon, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(userId, name, color, icon, now, now);
  return getCategory(userId, Number(result.lastInsertRowid));
}

export function getCategory(userId, id) {
  const row = db
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM goals g WHERE g.category_id = c.id) as goal_count
       FROM categories c
       WHERE c.user_id = ? AND c.id = ?`
    )
    .get(userId, id);
  return oneRow(row);
}

export function updateCategory(userId, id, { name, color, icon }) {
  db.prepare(
    `UPDATE categories SET name = ?, color = ?, icon = ?, updated_at = ? WHERE user_id = ? AND id = ?`
  ).run(name, color, icon, new Date().toISOString(), userId, id);
  return getCategory(userId, id);
}

export function deleteCategory(userId, id) {
  const goalCount = db
    .prepare('SELECT COUNT(*) as c FROM goals WHERE category_id = ? AND user_id = ?')
    .get(id, userId).c;
  db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').run(id, userId);
  return goalCount;
}

export function createGoal(userId, data) {
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO goals
        (user_id, category_id, title, description, priority, status, deadline, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      data.category_id || null,
      data.title,
      data.description || '',
      data.priority || 'medium',
      data.status || 'planned',
      data.deadline || null,
      now,
      now
    );
  return getGoal(userId, Number(result.lastInsertRowid));
}

export function listGoals(userId, filters = {}) {
  const conditions = ['g.user_id = ?'];
  const params = [userId];

  if (filters.category && filters.category !== 'all') {
    conditions.push('g.category_id = ?');
    params.push(Number(filters.category));
  }
  if (filters.priority && filters.priority !== 'all') {
    conditions.push('g.priority = ?');
    params.push(filters.priority);
  }
  if (filters.status && filters.status !== 'all') {
    conditions.push('g.status = ?');
    params.push(filters.status);
  }
  if (filters.q) {
    conditions.push('(g.title LIKE ? OR g.description LIKE ?)');
    params.push(`%${filters.q}%`, `%${filters.q}%`);
  }

  const goalRows = db
    .prepare(
      `SELECT g.*, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM goals g
       LEFT JOIN categories c ON c.id = g.category_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY
         CASE g.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         CASE WHEN g.deadline IS NULL THEN 1 ELSE 0 END,
         g.deadline ASC,
         g.created_at DESC`
    )
    .all(...params);

  const subtaskStmt = db.prepare(
    `SELECT id, goal_id, title, status, completed_at, created_at, updated_at
     FROM subtasks WHERE goal_id = ? ORDER BY id ASC`
  );

  return goalRows.map((goal) => {
    const subtasks = subtaskStmt.all(goal.id);
    return {
      ...goal,
      subtasks,
      progress: computeGoalProgress(goal, subtasks),
    };
  });
}

export function getGoal(userId, id) {
  const goal = db
    .prepare(
      `SELECT g.*, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM goals g
       LEFT JOIN categories c ON c.id = g.category_id
       WHERE g.user_id = ? AND g.id = ?`
    )
    .get(userId, id);
  if (!goal) return null;
  const subtasks = db
    .prepare(
      `SELECT id, goal_id, title, status, completed_at, created_at, updated_at
       FROM subtasks WHERE goal_id = ? ORDER BY id ASC`
    )
    .all(id);
  return {
    ...goal,
    subtasks,
    progress: computeGoalProgress(goal, subtasks),
  };
}

export function updateGoal(userId, id, data) {
  const current = db
    .prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?')
    .get(id, userId);
  if (!current) return null;

  const next = {
    category_id: data.category_id !== undefined ? data.category_id : current.category_id,
    title: data.title !== undefined ? data.title : current.title,
    description: data.description !== undefined ? data.description : current.description,
    priority: data.priority !== undefined ? data.priority : current.priority,
    status: data.status !== undefined ? data.status : current.status,
    deadline: data.deadline !== undefined ? data.deadline : current.deadline,
  };

  db.prepare(
    `UPDATE goals SET
      category_id = ?, title = ?, description = ?, priority = ?, status = ?, deadline = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`
  ).run(
    next.category_id,
    next.title,
    next.description,
    next.priority,
    next.status,
    next.deadline,
    new Date().toISOString(),
    id,
    userId
  );
  return getGoal(userId, id);
}

export function deleteGoal(userId, id) {
  const result = db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(id, userId);
  return result.changes > 0;
}

export function createSubtask(userId, goalId, data) {
  const goal = db
    .prepare('SELECT id FROM goals WHERE id = ? AND user_id = ?')
    .get(goalId, userId);
  if (!goal) return null;
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO subtasks (goal_id, title, status, completed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      goalId,
      data.title,
      data.status || 'planned',
      data.status === 'completed' ? now : null,
      now,
      now
    );
  return getSubtask(userId, goalId, Number(result.lastInsertRowid));
}

export function getSubtask(userId, goalId, subtaskId) {
  const row = db
    .prepare(
      `SELECT s.* FROM subtasks s
       JOIN goals g ON g.id = s.goal_id
       WHERE g.user_id = ? AND s.goal_id = ? AND s.id = ?`
    )
    .get(userId, goalId, subtaskId);
  return oneRow(row);
}

export function updateSubtask(userId, goalId, subtaskId, data) {
  const row = db
    .prepare(
      `SELECT s.* FROM subtasks s
       JOIN goals g ON g.id = s.goal_id
       WHERE g.user_id = ? AND s.goal_id = ? AND s.id = ?`
    )
    .get(userId, goalId, subtaskId);
  if (!row) return null;

  const status = data.status !== undefined ? data.status : row.status;
  const title = data.title !== undefined ? data.title : row.title;
  const completedAt =
    status === 'completed' ? new Date().toISOString() : status !== 'completed' ? null : row.completed_at;

  db.prepare(
    `UPDATE subtasks SET title = ?, status = ?, completed_at = ?, updated_at = ? WHERE id = ? AND goal_id = ?`
  ).run(title, status, completedAt, new Date().toISOString(), subtaskId, goalId);
  return getSubtask(userId, goalId, subtaskId);
}

export function deleteSubtask(userId, goalId, subtaskId) {
  const result = db
    .prepare(
      `DELETE FROM subtasks WHERE id = ? AND goal_id = ? AND EXISTS
        (SELECT 1 FROM goals g WHERE g.id = ? AND g.user_id = ?)`
    )
    .run(subtaskId, goalId, goalId, userId);
  return result.changes > 0;
}

export { todayString, DEFAULT_CATEGORIES };
export default db;
