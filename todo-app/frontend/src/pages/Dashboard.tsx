import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Footer from '../components/Footer';
import { API_BASE_URL } from '../config/api';
import './Dashboard.css';

interface Task {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  archived: boolean;
  workspace?: string;
  priority?: string;
  dueDate?: string | null;
  tags?: string | null;
  recurrence?: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
  focusMinutes?: number;
}

type TaskFilter = 'all' | 'active' | 'completed';
type WorkspaceType = 'Personal' | 'Work' | 'Learning';
type RecurrenceType = 'None' | 'Daily' | 'Weekly' | 'Monthly';

type Template = {
  title: string;
  description: string;
};

type EditDraft = {
  title: string;
  description: string;
  workspace: WorkspaceType;
  priority: string;
  dueDate: string;
  tags: string;
  recurrence: RecurrenceType;
  estimatedMinutes: string;
  actualMinutes: string;
  focusMinutes: string;
};

const API_BASE = `${API_BASE_URL}/tasks`;
const workspaceOptions: WorkspaceType[] = ['Personal', 'Work', 'Learning'];
const recurrenceOptions: RecurrenceType[] = ['None', 'Daily', 'Weekly', 'Monthly'];
const templates: Template[] = [
  { title: 'Weekly planning session', description: 'Review tasks, set priorities, and define next steps.' },
  { title: 'Email follow-up', description: 'Send follow-up message to the client or team member.' },
  { title: 'Product design review', description: 'Analyze the latest visuals and prepare feedback.' },
];

const getWorkspaceTag = (task: Task): WorkspaceType => (task.workspace as WorkspaceType) || 'Personal';

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
};

const formatDueDate = (dateStr?: string | null) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const toPositiveInt = (value: string, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(0, parsed);
};

const UiIcon = ({ name }: { name: 'export' | 'import' | 'settings' | 'logout' | 'tasks' | 'done' | 'clock' | 'trend' }) => {
  const common = { width: 14, height: 14, viewBox: '0 0 24 24', 'aria-hidden': true as const };
  if (name === 'export') return <svg {...common}><path d="M12 16V4m0 0-4 4m4-4 4 4M4 20h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === 'import') return <svg {...common}><path d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === 'settings') return <svg {...common}><path d="M12 15.5A3.5 3.5 0 1 0 12 8.5m8.5 3.5-1.7-.7-.5-1.2.7-1.7-1.8-1.8-1.7.7-1.2-.5L13 3.5h-2l-.7 1.7-1.2.5-1.7-.7-1.8 1.8.7 1.7-.5 1.2-1.7.7v2l1.7.7.5 1.2-.7 1.7 1.8 1.8 1.7-.7 1.2.5.7 1.7h2l.7-1.7 1.2-.5 1.7.7 1.8-1.8-.7-1.7.5-1.2 1.7-.7Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
  if (name === 'logout') return <svg {...common}><path d="M14 8V5h-9v14h9v-3M10 12h10m0 0-3-3m3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === 'done') return <svg {...common}><path d="m5 12 4 4 10-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === 'clock') return <svg {...common}><path d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (name === 'trend') return <svg {...common}><path d="m4 16 6-6 4 4 6-6M17 8h3v3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg {...common}><path d="M4 6h16v12H4z" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>;
};

const Dashboard = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('None');
  const [estimatedMinutes, setEstimatedMinutes] = useState('0');
  const [actualMinutes, setActualMinutes] = useState('0');
  const [taskFocusMinutes, setTaskFocusMinutes] = useState('25');
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [workspace, setWorkspace] = useState<WorkspaceType>('Personal');
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [focusTaskId, setFocusTaskId] = useState<number | null>(null);
  const [focusSeconds, setFocusSeconds] = useState(1500);
  const [focusRunning, setFocusRunning] = useState(false);
  const [streak, setStreak] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [focusTime, setFocusTime] = useState(25);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>({
    title: '',
    description: '',
    workspace: 'Personal',
    priority: 'Medium',
    dueDate: '',
    tags: '',
    recurrence: 'None',
    estimatedMinutes: '0',
    actualMinutes: '0',
    focusMinutes: '25',
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addTaskRef = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    const savedWorkspace = localStorage.getItem('todoAppWorkspace') as WorkspaceType | null;
    if (savedWorkspace) setWorkspace(savedWorkspace);

    const savedSettings = localStorage.getItem('lmoSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings) as { focusTime?: number };
        const userFocus = settings.focusTime || 25;
        setFocusTime(userFocus);
        setTaskFocusMinutes(String(userFocus));
      } catch {
        setTaskFocusMinutes('25');
      }
    }

    computeStreak();
    void fetchTasks(false);
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem('todoAppWorkspace', workspace);
  }, [workspace]);

  useEffect(() => {
    void fetchTasks(showArchived);
  }, [showArchived]);

  useEffect(() => {
    if (!focusRunning) {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setFocusSeconds(prev => {
        if (prev <= 1) {
          window.clearInterval(intervalRef.current ?? undefined);
          intervalRef.current = null;
          setFocusRunning(false);
          showMessage('Focus session complete. Great work!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [focusRunning]);

  useEffect(() => {
    if (editingTaskId === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeEditModal();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        void saveTaskEdits();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingTaskId, editDraft, tasks]);

  const showMessage = (message: string, error = false) => {
    if (error) {
      setErrorMessage(message);
      setStatusMessage('');
    } else {
      setStatusMessage(message);
      setErrorMessage('');
    }
    window.setTimeout(() => {
      setStatusMessage('');
      setErrorMessage('');
    }, 4000);
  };

  const computeStreak = () => {
    const rawDates = localStorage.getItem('todoAppCompleteDates');
    const dates: string[] = rawDates ? JSON.parse(rawDates) : [];
    const unique = Array.from(new Set(dates)).sort();
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    setCompletedToday(unique.filter(date => date === todayKey).length);

    let currentStreak = 0;
    const dateCursor = new Date(today);
    while (true) {
      const key = dateCursor.toISOString().slice(0, 10);
      if (unique.includes(key)) {
        currentStreak++;
        dateCursor.setDate(dateCursor.getDate() - 1);
      } else {
        break;
      }
    }
    setStreak(currentStreak);
  };

  const recordCompletion = () => {
    const rawDates = localStorage.getItem('todoAppCompleteDates');
    const dates: string[] = rawDates ? JSON.parse(rawDates) : [];
    const todayKey = new Date().toISOString().slice(0, 10);
    if (!dates.includes(todayKey)) {
      localStorage.setItem('todoAppCompleteDates', JSON.stringify([...dates, todayKey]));
    }
    computeStreak();
  };

  const fetchTasks = async (archived: boolean) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}?archived=${archived}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setTasks(res.data as Task[]);
    } catch (error) {
      console.error(error);
      showMessage('Failed to load tasks. Please refresh.', true);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async () => {
    if (!title.trim()) {
      showMessage('Please enter a task title.', true);
      return;
    }
    setActionLoading(true);
    try {
      await axios.post(
        API_BASE,
        {
          title,
          description,
          workspace,
          priority,
          dueDate: dueDate || undefined,
          tags,
          recurrence,
          estimatedMinutes: toPositiveInt(estimatedMinutes),
          actualMinutes: toPositiveInt(actualMinutes),
          focusMinutes: toPositiveInt(taskFocusMinutes, focusTime),
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      setTitle('');
      setDescription('');
      setPriority('Medium');
      setDueDate('');
      setTags('');
      setRecurrence('None');
      setEstimatedMinutes('0');
      setActualMinutes('0');
      setTaskFocusMinutes(String(focusTime));
      await fetchTasks(showArchived);
      showMessage('Task added successfully.');
    } catch (error) {
      console.error(error);
      showMessage('Failed to add task.', true);
    } finally {
      setActionLoading(false);
    }
  };

  const addTemplate = (template: Template) => {
    setTitle(template.title);
    setDescription(template.description);
    showMessage('Template loaded. Update details and save.');
  };

  const openEditModal = (task: Task) => {
    setEditingTaskId(task.id);
    setEditDraft({
      title: task.title,
      description: task.description || '',
      workspace: (task.workspace as WorkspaceType) || 'Personal',
      priority: task.priority || 'Medium',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
      tags: task.tags || '',
      recurrence: (task.recurrence as RecurrenceType) || 'None',
      estimatedMinutes: String(task.estimatedMinutes || 0),
      actualMinutes: String(task.actualMinutes || 0),
      focusMinutes: String(task.focusMinutes || focusTime),
    });
  };

  const closeEditModal = () => {
    setEditingTaskId(null);
  };

  const patchTask = async (task: Task, patch: Partial<Task>) => {
    await axios.put(`${API_BASE}/${task.id}`, { ...task, ...patch }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
  };

  const toggleTask = async (task: Task) => {
    setActionLoading(true);
    try {
      await patchTask(task, { completed: !task.completed });
      if (!task.completed) recordCompletion();
      await fetchTasks(showArchived);
      showMessage(`Marked task ${task.completed ? 'incomplete' : 'completed'}.`);
    } catch (error) {
      console.error(error);
      showMessage('Unable to update task.', true);
    } finally {
      setActionLoading(false);
    }
  };

  const archiveTask = async (task: Task, archived: boolean) => {
    setActionLoading(true);
    try {
      await patchTask(task, { archived });
      await fetchTasks(showArchived);
      showMessage(archived ? 'Task archived.' : 'Task restored to active board.');
    } catch (error) {
      console.error(error);
      showMessage('Unable to update archive state.', true);
    } finally {
      setActionLoading(false);
    }
  };

  const addActualTime = async (task: Task, delta = 15) => {
    setActionLoading(true);
    try {
      const next = (task.actualMinutes || 0) + delta;
      await patchTask(task, { actualMinutes: next });
      await fetchTasks(showArchived);
      showMessage(`Added ${delta} minutes of real work time.`);
    } catch (error) {
      console.error(error);
      showMessage('Unable to update time tracking.', true);
    } finally {
      setActionLoading(false);
    }
  };

  const saveTaskEdits = async () => {
    if (!editingTaskId) return;
    if (!editDraft.title.trim()) {
      showMessage('Task title is required.', true);
      return;
    }
    const task = tasks.find(item => item.id === editingTaskId);
    if (!task) return;

    setActionLoading(true);
    try {
      await patchTask(task, {
        title: editDraft.title.trim(),
        description: editDraft.description,
        workspace: editDraft.workspace,
        priority: editDraft.priority,
        dueDate: editDraft.dueDate || null,
        tags: editDraft.tags,
        recurrence: editDraft.recurrence,
        estimatedMinutes: toPositiveInt(editDraft.estimatedMinutes),
        actualMinutes: toPositiveInt(editDraft.actualMinutes),
        focusMinutes: toPositiveInt(editDraft.focusMinutes, focusTime),
      });
      await fetchTasks(showArchived);
      setEditingTaskId(null);
      showMessage('Task updated successfully.');
    } catch (error) {
      console.error(error);
      showMessage('Unable to update task.', true);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteTask = async (id: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    setActionLoading(true);
    try {
      await axios.delete(`${API_BASE}/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      await fetchTasks(showArchived);
      showMessage('Task deleted successfully.');
    } catch (error) {
      console.error(error);
      showMessage('Failed to delete task.', true);
    } finally {
      setActionLoading(false);
    }
  };

  const exportCsv = () => {
    const header = ['Title', 'Description', 'Completed', 'Workspace', 'Priority', 'DueDate', 'Tags', 'Recurrence', 'EstimatedMinutes', 'ActualMinutes', 'FocusMinutes'];
    const rows = filteredTasks.map(task => [
      task.title,
      task.description || '',
      String(task.completed),
      task.workspace || 'Personal',
      task.priority || 'Medium',
      task.dueDate || '',
      task.tags || '',
      task.recurrence || 'None',
      String(task.estimatedMinutes || 0),
      String(task.actualMinutes || 0),
      String(task.focusMinutes || focusTime),
    ]);

    const content = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lmo-tasks-${showArchived ? 'archived' : 'active'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showMessage('CSV exported successfully.');
  };

  const importCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const raw = await file.text();
    const lines = raw.split(/\r?\n/).filter(Boolean);
    if (lines.length <= 1) {
      showMessage('CSV is empty.', true);
      return;
    }

    const parseCsvLine = (line: string) => {
      const matches = line.match(/("([^"]|"")*"|[^,]+)/g);
      return (matches || []).map(part => part.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
    };

    const headers = parseCsvLine(lines[0]);
    const idx = (name: string) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());

    const titleIndex = idx('Title');
    if (titleIndex === -1) {
      showMessage('CSV must include a Title column.', true);
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      for (const line of lines.slice(1)) {
        const cols = parseCsvLine(line);
        const taskTitle = cols[titleIndex];
        if (!taskTitle) continue;

        await axios.post(
          API_BASE,
          {
            title: taskTitle,
            description: cols[idx('Description')] || '',
            completed: (cols[idx('Completed')] || 'false').toLowerCase() === 'true',
            workspace: cols[idx('Workspace')] || workspace,
            priority: cols[idx('Priority')] || 'Medium',
            dueDate: cols[idx('DueDate')] || undefined,
            tags: cols[idx('Tags')] || '',
            recurrence: cols[idx('Recurrence')] || 'None',
            estimatedMinutes: toPositiveInt(cols[idx('EstimatedMinutes')] || '0'),
            actualMinutes: toPositiveInt(cols[idx('ActualMinutes')] || '0'),
            focusMinutes: toPositiveInt(cols[idx('FocusMinutes')] || String(focusTime), focusTime),
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      await fetchTasks(showArchived);
      showMessage('CSV import completed.');
    } catch (error) {
      console.error(error);
      showMessage('CSV import failed.', true);
    } finally {
      setActionLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startFocus = (task: Task) => {
    setFocusTaskId(task.id);
    setFocusSeconds((task.focusMinutes || focusTime) * 60);
    setFocusRunning(true);
  };

  const resetFocus = () => {
    setFocusRunning(false);
    setFocusSeconds(1500);
    setFocusTaskId(null);
  };

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const scrollToAddTask = () => {
    addTaskRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const filteredTasks = useMemo(
    () =>
      tasks
        .filter(task => {
          if (filter === 'active') return !task.completed;
          if (filter === 'completed') return task.completed;
          return true;
        })
        .filter(task => getWorkspaceTag(task) === workspace),
    [tasks, filter, workspace]
  );

  const completedCount = tasks.filter(task => task.completed).length;
  const overdueCount = tasks.filter(task => !task.completed && !!task.dueDate && new Date(task.dueDate) < new Date()).length;
  const dueSoonCount = tasks.filter(task => {
    if (!task.dueDate || task.completed) return false;
    const due = new Date(task.dueDate).getTime();
    const now = Date.now();
    const in48h = now + (48 * 60 * 60 * 1000);
    return due >= now && due <= in48h;
  }).length;
  const totalEstimated = tasks.reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0);
  const totalActual = tasks.reduce((sum, task) => sum + (task.actualMinutes || 0), 0);
  const completionRate = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const activeFocusTask = tasks.find(task => task.id === focusTaskId);

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <header className="dashboard-header">
          <div className="header-top">
            <div>
              <div className="brand-line"><span className="brand-mark">LM</span><h1>LMO To-Do List</h1></div>
              <p className="header-subtitle">Professional productivity platform for task management and focus optimization.</p>
            </div>
            <div className="header-actions">
              <button className="btn-secondary" onClick={exportCsv} type="button"><UiIcon name="export" /> Export CSV</button>
              <button className="btn-secondary" onClick={() => fileInputRef.current?.click()} type="button"><UiIcon name="import" /> Import CSV</button>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={importCsv} style={{ display: 'none' }} />
              <button className="btn-secondary" onClick={() => navigate('/settings')} type="button"><UiIcon name="settings" /> Settings</button>
              <button className="btn-secondary" onClick={logout} type="button"><UiIcon name="logout" /> Logout</button>
            </div>
          </div>
        </header>

        <div className="summary-grid">
          <div className="summary-card"><span><UiIcon name="tasks" /> Total Tasks</span><strong>{tasks.length}</strong></div>
          <div className="summary-card"><span><UiIcon name="done" /> Completed</span><strong>{completedCount}</strong></div>
          <div className="summary-card"><span><UiIcon name="clock" /> Due In 48h</span><strong>{dueSoonCount}</strong></div>
          <div className="summary-card"><span><UiIcon name="trend" /> Completion Rate</span><strong>{completionRate}%</strong></div>
        </div>
        <div className="kpi-row">
          <div className="kpi-item">Overdue: <strong>{overdueCount}</strong></div>
          <div className="kpi-item">Today Completed: <strong>{completedToday || 0}</strong></div>
          <div className="kpi-item">Streak: <strong>{streak} day{streak === 1 ? '' : 's'}</strong></div>
          <div className="kpi-item">Estimated vs Real: <strong>{totalEstimated}m / {totalActual}m</strong></div>
        </div>

        <div className="workspace-panel">
          <h2>Workspace</h2>
          <div className="workspace-buttons">
            {workspaceOptions.map(option => (
              <button key={option} type="button" className={`btn-filter ${workspace === option ? 'active' : ''}`} onClick={() => setWorkspace(option)}>{option}</button>
            ))}
            <button type="button" className={`btn-filter ${showArchived ? 'active' : ''}`} onClick={() => setShowArchived(prev => !prev)}>
              {showArchived ? 'Showing Archived' : 'Show Archived'}
            </button>
          </div>
        </div>

        <div className="template-panel">
          <div className="section-header-row"><h2>Quick Task Templates</h2></div>
          <div className="template-grid">
            {templates.map(template => (
              <button key={template.title} type="button" className="template-card" onClick={() => addTemplate(template)}>
                <strong>{template.title}</strong>
                <span>{template.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="focus-panel">
          <div className="section-header-row"><h2>Focus Mode</h2></div>
          <div className="focus-content">
            <div className="focus-card">
              <p className="focus-title">{activeFocusTask ? activeFocusTask.title : 'Select a task to focus'}</p>
              <p className="focus-description">{activeFocusTask?.description ?? 'Task details will appear here.'}</p>
              <div className="focus-timer">{formatTime(focusSeconds)}</div>
            </div>
            <div className="focus-actions">
              <button type="button" className="btn-add" onClick={resetFocus}>Reset</button>
              <button type="button" className="btn-secondary" onClick={() => setFocusRunning(prev => !prev)} disabled={!focusTaskId}>
                {focusRunning ? 'Pause' : 'Resume'}
              </button>
            </div>
          </div>
        </div>

        <div className="add-task-section" ref={addTaskRef}>
          <div className="section-header-row">
            <h2>Add New Task</h2>
            <div className="filter-group">
              {(['all', 'active', 'completed'] as TaskFilter[]).map(value => (
                <button key={value} className={`btn-filter ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value)} type="button">
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {statusMessage && <div className="status-message success">{statusMessage}</div>}
          {errorMessage && <div className="status-message error">{errorMessage}</div>}

          <div className="input-group">
            <input type="text" placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" disabled={actionLoading} />
            <input type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="input-field" disabled={actionLoading} />
            <input type="text" placeholder="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} className="input-field" disabled={actionLoading} />
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input-field" disabled={actionLoading}>
              <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
            </select>
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as RecurrenceType)} className="input-field" disabled={actionLoading}>
              {recurrenceOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
            <input type="number" min="0" placeholder="Estimated min" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} className="input-field" disabled={actionLoading} />
            <input type="number" min="0" placeholder="Actual min" value={actualMinutes} onChange={(e) => setActualMinutes(e.target.value)} className="input-field" disabled={actionLoading} />
            <input type="number" min="1" placeholder="Focus min" value={taskFocusMinutes} onChange={(e) => setTaskFocusMinutes(e.target.value)} className="input-field" disabled={actionLoading} />
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-field" disabled={actionLoading} />
            <button onClick={addTask} className="btn-add" type="button" disabled={actionLoading}>{actionLoading ? 'Saving...' : 'Add Task'}</button>
          </div>
        </div>

        <div className="tasks-section">
          <div className="section-header-row">
            <h2>{showArchived ? 'Archived Tasks' : 'Task Board'}</h2>
            <span className="task-count-label">{filteredTasks.length} tasks shown</span>
          </div>

          {loading ? (
            <p className="loading-text">Loading tasks...</p>
          ) : filteredTasks.length === 0 ? (
            <p className="no-tasks">No tasks to display.</p>
          ) : (
            <ul className="tasks-list">
              {filteredTasks.map(task => (
                <li key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                  <div className="task-content">
                    <input type="checkbox" checked={task.completed} onChange={() => void toggleTask(task)} className="task-checkbox" disabled={actionLoading || task.archived} />
                    <div className="task-text">
                      <span className="task-title">{task.title}</span>
                      {task.description && <span className="task-description">{task.description}</span>}
                      <div className="task-metadata">
                        <span className="task-workspace">{getWorkspaceTag(task)}</span>
                        {task.priority && <span className={`task-priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span>}
                        {task.tags && <span className="task-workspace">#{task.tags}</span>}
                        {task.recurrence && task.recurrence !== 'None' && <span className="task-workspace">{task.recurrence}</span>}
                        {task.dueDate && <span className="task-due-date">{formatDueDate(task.dueDate)}</span>}
                        <span className="task-workspace">Est: {task.estimatedMinutes || 0}m</span>
                        <span className="task-workspace">Real: {task.actualMinutes || 0}m</span>
                      </div>
                    </div>
                  </div>
                  <div className="task-actions">
                    {!task.archived && <button onClick={() => startFocus(task)} type="button" className="btn-secondary">Focus</button>}
                    {!task.archived && <button onClick={() => void addActualTime(task)} type="button" className="btn-secondary">+15m</button>}
                    <button onClick={() => openEditModal(task)} type="button" className="btn-secondary" disabled={actionLoading}>Edit</button>
                    <button onClick={() => void archiveTask(task, !task.archived)} type="button" className="btn-secondary" disabled={actionLoading}>
                      {task.archived ? 'Restore' : 'Archive'}
                    </button>
                    <button onClick={() => void deleteTask(task.id)} className="btn-delete" type="button" disabled={actionLoading}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {editingTaskId !== null && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Task</h3>
            <p className="modal-shortcuts">Esc: close | Ctrl+Enter: save</p>
            <div className="edit-grid">
              <input
                className="input-field"
                type="text"
                value={editDraft.title}
                onChange={(e) => setEditDraft((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Task title"
              />
              <input
                className="input-field"
                type="text"
                value={editDraft.description}
                onChange={(e) => setEditDraft((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description"
              />
              <select
                className="input-field"
                value={editDraft.workspace}
                onChange={(e) => setEditDraft((prev) => ({ ...prev, workspace: e.target.value as WorkspaceType }))}
              >
                {workspaceOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
              <select
                className="input-field"
                value={editDraft.priority}
                onChange={(e) => setEditDraft((prev) => ({ ...prev, priority: e.target.value }))}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
              <input
                className="input-field"
                type="date"
                value={editDraft.dueDate}
                onChange={(e) => setEditDraft((prev) => ({ ...prev, dueDate: e.target.value }))}
              />
              <input
                className="input-field"
                type="text"
                value={editDraft.tags}
                onChange={(e) => setEditDraft((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="Tags"
              />
              <select
                className="input-field"
                value={editDraft.recurrence}
                onChange={(e) => setEditDraft((prev) => ({ ...prev, recurrence: e.target.value as RecurrenceType }))}
              >
                {recurrenceOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
              <input
                className="input-field"
                type="number"
                min="0"
                value={editDraft.estimatedMinutes}
                onChange={(e) => setEditDraft((prev) => ({ ...prev, estimatedMinutes: e.target.value }))}
                placeholder="Estimated minutes"
              />
              <input
                className="input-field"
                type="number"
                min="0"
                value={editDraft.actualMinutes}
                onChange={(e) => setEditDraft((prev) => ({ ...prev, actualMinutes: e.target.value }))}
                placeholder="Actual minutes"
              />
              <input
                className="input-field"
                type="number"
                min="1"
                value={editDraft.focusMinutes}
                onChange={(e) => setEditDraft((prev) => ({ ...prev, focusMinutes: e.target.value }))}
                placeholder="Focus minutes"
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={closeEditModal}>Cancel</button>
              <button type="button" className="btn-add" onClick={() => void saveTaskEdits()} disabled={actionLoading}>
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mobile-action-bar">
        <button type="button" className="mobile-action-btn" onClick={scrollToAddTask}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Add
        </button>
        <button
          type="button"
          className="mobile-action-btn"
          onClick={() => activeFocusTask ? setFocusRunning(prev => !prev) : scrollToAddTask()}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Focus
        </button>
        <button type="button" className="mobile-action-btn" onClick={() => navigate('/settings')}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5m8.5 3.5-1.7-.7-.5-1.2.7-1.7-1.8-1.8-1.7.7-1.2-.5L13 3.5h-2l-.7 1.7-1.2.5-1.7-.7-1.8 1.8.7 1.7-.5 1.2-1.7.7v2l1.7.7.5 1.2-.7 1.7 1.8 1.8 1.7-.7 1.2.5.7 1.7h2l.7-1.7 1.2-.5 1.7.7 1.8-1.8-.7-1.7.5-1.2 1.7-.7Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          Settings
        </button>
        <button type="button" className="mobile-action-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="m6 14 6-6 6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Top
        </button>
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;
