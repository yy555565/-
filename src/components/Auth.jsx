import { useState } from 'react';
import { api } from '../api.js';

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload =
        mode === 'register'
          ? { name: form.name, email: form.email, password: form.password }
          : { email: form.email, password: form.password };
      const data = mode === 'register' ? await api.register(payload) : await api.login(payload);
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span>🎯</span>
        </div>
        <h1>GoalBuilder</h1>
        <p className="auth-subtitle">
          Записвайте, планирайте и изграждайте всичко, което искате да постигнете.
        </p>

        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Вход
          </button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
            Регистрация
          </button>
        </div>

        {error && <div className="alert error">{error}</div>}

        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && (
            <label className="field">
              <span>Име</span>
              <input
                value={form.name}
                onChange={update('name')}
                placeholder="Вашето име"
                autoComplete="name"
                required
              />
            </label>
          )}
          <label className="field">
            <span>Имейл</span>
            <input
              type="email"
              value={form.email}
              onChange={update('email')}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>
          <label className="field">
            <span>Парола</span>
            <input
              type="password"
              value={form.password}
              onChange={update('password')}
              placeholder="Поне 6 символа"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={6}
            />
          </label>
          <button className="btn primary full" disabled={loading}>
            {loading ? 'Моля изчакайте...' : mode === 'login' ? 'Влезте' : 'Създайте акаунт'}
          </button>
        </form>
        <p className="auth-note">
          {mode === 'login' ? 'Нямате профил?' : 'Вече имате профил?'}{' '}
          <button
            className="link"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
          >
            {mode === 'login' ? 'Регистрирайте се' : 'Влезте'}
          </button>
        </p>
      </div>
    </div>
  );
}
