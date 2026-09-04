import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import Auth from './components/Auth.jsx';
import Sidebar from './components/Sidebar.jsx';
import GoalsView from './components/GoalsView.jsx';
import CategoriesView from './components/CategoriesView.jsx';
import MindMap from './components/MindMap.jsx';
import GoalModal from './components/GoalModal.jsx';
import GoalDetail from './components/GoalDetail.jsx';

export default function App() {
  const [phase, setPhase] = useState('loading');
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [goals, setGoals] = useState([]);
  const [view, setView] = useState('goals');
  const [filters, setFilters] = useState({ category: 'all', priority: 'all', status: 'all', q: '' });
  const [goalModal, setGoalModal] = useState(null); // {mode, goal}
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const loadCategories = useCallback(async () => {
    const data = await api.getCategories();
    setCategories(data.categories);
  }, []);

  const loadGoals = useCallback(async (nextFilters) => {
    const f = nextFilters || filters;
    const data = await api.getGoals(f);
    setGoals(data.goals);
  }, [filters]);

  const refreshAll = useCallback(async (nextFilters) => {
    await Promise.all([loadCategories(), loadGoals(nextFilters)]);
  }, [loadCategories, loadGoals]);

  const bootstrap = useCallback(async () => {
    try {
      const { user: u } = await api.me();
      setUser(u);
      setPhase('app');
      await refreshAll();
    } catch {
      setPhase('auth');
    }
  }, [refreshAll]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const handleAuth = (u) => {
    setUser(u);
    setPhase('app');
    refreshAll();
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {}
    setUser(null);
    setGoals([]);
    setCategories([]);
    setSelectedGoal(null);
    setPhase('auth');
  };

  const openCreate = () => setGoalModal({ mode: 'create', goal: null });
  const openEdit = (goal) => setGoalModal({ mode: 'edit', goal });

  const closeGoalModal = () => setGoalModal(null);

  const handleSaveGoal = async (payload) => {
    const id = goalModal.mode === 'create' ? null : goalModal.goal.id;
    let saved = null;
    if (id) {
      const data = await api.updateGoal(id, payload);
      saved = data.goal;
    } else {
      const data = await api.createGoal(payload);
      saved = data.goal;
    }
    await refreshAll();
    closeGoalModal();
    // keep the detail panel in sync when editing an already opened goal
    if (id && selectedGoal && selectedGoal.id === id && saved) {
      setSelectedGoal(saved);
    }
  };

  const handleDeleteGoal = async (goal) => {
    if (!window.confirm('Сигурни ли сте, че искате да изтриете тази цел и всичките ѝ подзадачи?')) return;
    await api.deleteGoal(goal.id);
    setSelectedGoal(null);
    await refreshAll();
    notify('Целта беше изтрита.');
  };

  const refreshGoalInPlace = (goal) => {
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)));
    setSelectedGoal(goal);
  };

  const updateSubtask = async (goalId, subtaskId, payload) => {
    const data = await api.updateSubtask(goalId, subtaskId, payload);
    refreshGoalInPlace(data.goal);
    notify('Подзадачата е обновена.');
  };

  const addSubtask = async (goalId, payload) => {
    const data = await api.createSubtask(goalId, payload);
    refreshGoalInPlace(data.goal);
    notify('Подзадачата е добавена.');
  };

  const deleteSubtask = async (goalId, subtaskId) => {
    const data = await api.deleteSubtask(goalId, subtaskId);
    if (data.goal) refreshGoalInPlace(data.goal);
    notify('Подзадачата е изтрита.');
  };

  if (phase === 'loading') {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Зареждане...</p>
      </div>
    );
  }

  if (phase === 'auth') {
    return <Auth onAuth={handleAuth} />;
  }

  const completed = goals.filter((g) => g.status === 'completed').length;
  const overallProgress = goals.length
    ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
    : 0;

  return (
    <div className="app-shell">
      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}
      <Sidebar
        view={view}
        setView={setView}
        user={user}
        onLogout={handleLogout}
        counts={{
          goals: goals.length,
          completed,
          categories: categories.length,
        }}
        overallProgress={overallProgress}
      />
      <main className="main-content">
        {view === 'goals' && (
          <GoalsView
            goals={goals}
            categories={categories}
            filters={filters}
            setFilters={(next) => {
              setFilters(next);
              loadGoals(next);
            }}
            onNewGoal={openCreate}
            onEditGoal={openEdit}
            onDeleteGoal={handleDeleteGoal}
            onOpenGoal={setSelectedGoal}
            refresh={refreshAll}
            notify={notify}
          />
        )}
        {view === 'categories' && (
          <CategoriesView
            categories={categories}
            goals={goals}
            refresh={refreshAll}
            notify={notify}
          />
        )}
        {view === 'map' && (
          <MindMap
            goals={goals}
            categories={categories}
            onOpenGoal={setSelectedGoal}
            onEditGoal={openEdit}
          />
        )}
      </main>

      {goalModal && (
        <GoalModal
          mode={goalModal.mode}
          goal={goalModal.goal}
          categories={categories}
          onClose={closeGoalModal}
          onSave={handleSaveGoal}
        />
      )}

      {selectedGoal && (
        <GoalDetail
          goal={selectedGoal}
          categories={categories}
          onClose={() => setSelectedGoal(null)}
          onEdit={() => {
            openEdit(selectedGoal);
          }}
          onAddSubtask={addSubtask}
          onUpdateSubtask={updateSubtask}
          onDeleteSubtask={deleteSubtask}
          onDeleteGoal={handleDeleteGoal}
          onOpenGoal={setSelectedGoal}
        />
      )}
    </div>
  );
}

function recomputeProgress(goal, subtasks) {
  if (goal.status === 'completed') return 100;
  if (subtasks.length > 0) {
    const done = subtasks.filter((s) => s.status === 'completed').length;
    return Math.round((done / subtasks.length) * 100);
  }
  return goal.status === 'in_progress' ? 50 : 0;
}
