import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import fs from 'node:fs';
import db, {
  listCategories,
  createCategory,
  getCategory,
  updateCategory,
  deleteCategory,
  listGoals,
  createGoal,
  getGoal,
  updateGoal,
  deleteGoal,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  seedDefaultCategories,
} from './db.js';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'replace-with-a-long-random-secret-in-production';
const JWT_COOKIE = 'goal_builder_token';

app.use(express.json());
app.use(cookieParser());

// Only native SQLite understands these check constraints; we enforce in app code.
const VALID_STATUSES = ['planned', 'in_progress', 'completed'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
}

function setAuthCookie(res, token) {
  res.cookie(JWT_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 30,
    path: '/',
  });
}

function getUserFromRequest(req, res) {
  const token = req.cookies[JWT_COOKIE];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db
      .prepare('SELECT id, name, email, created_at FROM users WHERE id = ?')
      .get(payload.id);
    return user || null;
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = getUserFromRequest(req, res);
  if (!user) {
    return res.status(401).json({ error: 'Моля, влезте в профила си.' });
  }
  req.user = user;
  next();
}

function normalizeGoalInput(body) {
  const result = {};
  if (body.title !== undefined) result.title = String(body.title).trim();
  if (body.description !== undefined) result.description = String(body.description || '');
  if (body.priority !== undefined) {
    if (!VALID_PRIORITIES.includes(body.priority)) throw new Error('Невалиден приоритет');
    result.priority = body.priority;
  }
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) throw new Error('Невалиден статус');
    result.status = body.status;
  }
  if (body.deadline !== undefined) {
    result.deadline = body.deadline === '' || body.deadline === null ? null : String(body.deadline);
  }
  if (body.category_id !== undefined) {
    result.category_id = body.category_id === '' || body.category_id === null ? null : Number(body.category_id);
  }
  return result;
}

function normalizeSubtaskInput(body) {
  const result = {};
  if (body.title !== undefined) result.title = String(body.title).trim();
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) throw new Error('Невалиден статус');
    result.status = body.status;
  }
  return result;
}

function clean(row) {
  if (!row) return row;
  const copy = { ...row };
  // remove SQLite internal rowid/public keys if present
  delete copy.flags;
  return copy;
}

// ---------- Auth ----------
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Попълнете всички полета.' });
  }
  if (!validEmail(email)) {
    return res.status(400).json({ error: 'Невалиден имейл адрес.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Паролата трябва да е поне 6 символа.' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Вече съществува профил с този имейл.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare('INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
    .run(name.trim(), email.toLowerCase(), hash, new Date().toISOString());
  const user = { id: Number(result.lastInsertRowid), name: name.trim(), email: email.toLowerCase() };
  seedDefaultCategories(user.id);

  setAuthCookie(res, signToken(user));
  res.status(201).json({ user });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Попълнете имейл и парола.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Грешен имейл или парола.' });
  }
  const safeUser = { id: user.id, name: user.name, email: user.email };
  setAuthCookie(res, signToken(safeUser));
  res.json({ user: safeUser });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(JWT_COOKIE, { path: '/' });
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const user = getUserFromRequest(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ user });
});

// ---------- Categories ----------
app.get('/api/categories', requireAuth, (req, res) => {
  res.json({ categories: listCategories(req.user.id) });
});

app.post('/api/categories', requireAuth, (req, res) => {
  const { name, color, icon } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Въведете име на категорията.' });
  const category = createCategory(req.user.id, {
    name: String(name).trim(),
    color: color || '#6366f1',
    icon: icon || '🎯',
  });
  res.status(201).json({ category });
});

app.put('/api/categories/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = getCategory(req.user.id, id);
  if (!existing) return res.status(404).json({ error: 'Категорията не е намерена.' });
  const { name, color, icon } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Въведете име на категорията.' });
  const category = updateCategory(req.user.id, id, {
    name: String(name).trim(),
    color: color || existing.color,
    icon: icon || existing.icon,
  });
  res.json({ category });
});

app.delete('/api/categories/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = getCategory(req.user.id, id);
  if (!existing) return res.status(404).json({ error: 'Категорията не е намерена.' });
  const goalCount = deleteCategory(req.user.id, id);
  res.json({ ok: true, movedGoals: goalCount });
});

// ---------- Goals ----------
app.get('/api/goals', requireAuth, (req, res) => {
  const filters = {
    category: req.query.category || 'all',
    priority: req.query.priority || 'all',
    status: req.query.status || 'all',
    q: req.query.q || '',
  };
  res.json({ goals: listGoals(req.user.id, filters) });
});

app.post('/api/goals', requireAuth, (req, res) => {
  try {
    const input = normalizeGoalInput(req.body || {});
    if (!input.title) return res.status(400).json({ error: 'Въведете заглавие на целта.' });

    if (input.category_id) {
      const cat = getCategory(req.user.id, input.category_id);
      if (!cat) return res.status(400).json({ error: 'Изберете валидна категория.' });
    }

    const goal = createGoal(req.user.id, input);
    res.status(201).json({ goal });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Невалидни данни.' });
  }
});

app.put('/api/goals/:id', requireAuth, (req, res) => {
  try {
    const id = Number(req.params.id);
    const input = normalizeGoalInput(req.body || {});
    if (input.title !== undefined && !input.title) {
      return res.status(400).json({ error: 'Въведете заглавие на целта.' });
    }
    if (input.category_id) {
      const cat = getCategory(req.user.id, input.category_id);
      if (!cat) return res.status(400).json({ error: 'Изберете валидна категория.' });
    }
    const goal = updateGoal(req.user.id, id, input);
    if (!goal) return res.status(404).json({ error: 'Целта не е намерена.' });
    res.json({ goal });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Невалидни данни.' });
  }
});

app.delete('/api/goals/:id', requireAuth, (req, res) => {
  const ok = deleteGoal(req.user.id, Number(req.params.id));
  if (!ok) return res.status(404).json({ error: 'Целта не е намерена.' });
  res.json({ ok: true });
});

// ---------- Subtasks ----------
app.post('/api/goals/:goalId/subtasks', requireAuth, (req, res) => {
  try {
    const goalId = Number(req.params.goalId);
    const input = normalizeSubtaskInput(req.body || {});
    if (!input.title) return res.status(400).json({ error: 'Въведете текст на подзадачата.' });
    const goal = getGoal(req.user.id, goalId);
    if (!goal) return res.status(404).json({ error: 'Целта не е намерена.' });
    const subtask = createSubtask(req.user.id, goalId, input);
    res.status(201).json({ subtask, goal: getGoal(req.user.id, goalId) });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Невалидни данни.' });
  }
});

app.put('/api/goals/:goalId/subtasks/:subtaskId', requireAuth, (req, res) => {
  try {
    const goalId = Number(req.params.goalId);
    const subtaskId = Number(req.params.subtaskId);
    const input = normalizeSubtaskInput(req.body || {});
    if (input.title !== undefined && !input.title) {
      return res.status(400).json({ error: 'Въведете текст на подзадачата.' });
    }
    const subtask = updateSubtask(req.user.id, goalId, subtaskId, input);
    if (!subtask) return res.status(404).json({ error: 'Подзадачата не е намерена.' });
    res.json({ subtask, goal: getGoal(req.user.id, goalId) });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Невалидни данни.' });
  }
});

app.delete('/api/goals/:goalId/subtasks/:subtaskId', requireAuth, (req, res) => {
  const goalId = Number(req.params.goalId);
  const ok = deleteSubtask(req.user.id, goalId, Number(req.params.subtaskId));
  if (!ok) return res.status(404).json({ error: 'Подзадачата не е намерена.' });
  res.json({ ok: true, goal: getGoal(req.user.id, goalId) });
});

// ---------- Static ----------
const distDir = path.join(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Fallback API route
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Goal Builder API listening on http://0.0.0.0:${PORT}`);
});
