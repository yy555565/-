async function request(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const error = new Error(data?.error || 'Възникна грешка при заявката.');
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  register: (payload) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),

  getCategories: () => request('/api/categories'),
  createCategory: (payload) => request('/api/categories', { method: 'POST', body: JSON.stringify(payload) }),
  updateCategory: (id, payload) => request(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCategory: (id) => request(`/api/categories/${id}`, { method: 'DELETE' }),

  getGoals: (filters = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v && v !== 'all') qs.set(k, v);
    });
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request(`/api/goals${suffix}`);
  },
  createGoal: (payload) => request('/api/goals', { method: 'POST', body: JSON.stringify(payload) }),
  updateGoal: (id, payload) => request(`/api/goals/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteGoal: (id) => request(`/api/goals/${id}`, { method: 'DELETE' }),

  createSubtask: (goalId, payload) => request(`/api/goals/${goalId}/subtasks`, { method: 'POST', body: JSON.stringify(payload) }),
  updateSubtask: (goalId, subtaskId, payload) =>
    request(`/api/goals/${goalId}/subtasks/${subtaskId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteSubtask: (goalId, subtaskId) => request(`/api/goals/${goalId}/subtasks/${subtaskId}`, { method: 'DELETE' }),
};
