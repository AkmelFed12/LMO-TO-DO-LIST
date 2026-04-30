import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Footer from '../components/Footer';
import { API_BASE_URL } from '../config/api';
import './Settings.css';

const Icon = ({ name }: { name: 'timer' | 'bell' | 'display' | 'settings' | 'check' | 'error' | 'save' | 'info' }) => {
  switch (name) {
    case 'timer':
      return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M9 2h6M12 8a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm0 0V5m0 7 4 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'bell':
      return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M15 17H5l2-2v-4a5 5 0 0 1 10 0v4l2 2h-4m0 0a3 3 0 0 1-6 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'display':
      return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3 5h18v12H3zM8 19h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'settings':
      return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Zm8.5-3.5-1.7-.7a7.8 7.8 0 0 0-.5-1.2l.7-1.7-1.8-1.8-1.7.7a7.8 7.8 0 0 0-1.2-.5L13 3.5h-2l-.7 1.7a7.8 7.8 0 0 0-1.2.5l-1.7-.7-1.8 1.8.7 1.7a7.8 7.8 0 0 0-.5 1.2l-1.7.7v2l1.7.7c.1.4.3.8.5 1.2l-.7 1.7 1.8 1.8 1.7-.7c.4.2.8.4 1.2.5l.7 1.7h2l.7-1.7c.4-.1.8-.3 1.2-.5l1.7.7 1.8-1.8-.7-1.7c.2-.4.4-.8.5-1.2l1.7-.7Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'check':
      return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="m5 12 4 4 10-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'error':
      return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 8v5m0 3h.01M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'save':
      return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 3h11l3 3v15H5zM8 3v6h8V3m-8 15h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'info':
      return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 16v-4m0-3h.01M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
};

interface UserSettings {
  focusTime: number;
  breakTime: number;
  sessionsPerCycle: number;
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  emailNotifications: boolean;
  defaultWorkspace: string;
  timeFormat: '12h' | '24h';
  language: string;
  weekStartDay: 'monday' | 'sunday';
  autoArchiveCompleted: boolean;
  autoArchiveDays: number;
  soundEnabled: boolean;
}

const Settings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<UserSettings>({
    focusTime: 25,
    breakTime: 5,
    sessionsPerCycle: 4,
    theme: 'light',
    notifications: true,
    emailNotifications: false,
    defaultWorkspace: 'Personal',
    timeFormat: '24h',
    language: 'en',
    weekStartDay: 'monday',
    autoArchiveCompleted: false,
    autoArchiveDays: 30,
    soundEnabled: true,
  });

  const [saved, setSaved] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string>('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'focus' | 'notifications' | 'display' | 'advanced'>('focus');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    loadSettings();
  }, [navigate]);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/users/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSettings(res.data);
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Use default settings if endpoint doesn't exist yet
    }
  };

  const handleSaveSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/users/settings`, settings, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSaved(true);
      setSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setTimeout(() => setSaved(false), 3000);
      setError('');
    } catch (err) {
      setError('Failed to save settings');
      console.error(err);
    }
  };

  const updateSetting = (key: keyof UserSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Settings & Preferences</h1>
        <p>Customize LMO To-Do List to match your workflow</p>
      </div>

      <div className="settings-layout">
        <div className="settings-sidebar">
          <nav className="settings-nav">
            <button
              className={`settings-nav-item ${activeTab === 'focus' ? 'active' : ''}`}
              onClick={() => setActiveTab('focus')}
            >
              <span aria-hidden="true"><Icon name="timer" /></span> Focus & Productivity
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              <span aria-hidden="true"><Icon name="bell" /></span> Notifications
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'display' ? 'active' : ''}`}
              onClick={() => setActiveTab('display')}
            >
              <span aria-hidden="true"><Icon name="display" /></span> Display & Appearance
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'advanced' ? 'active' : ''}`}
              onClick={() => setActiveTab('advanced')}
            >
              <span aria-hidden="true"><Icon name="settings" /></span> Advanced
            </button>
          </nav>
        </div>

        <div className="settings-content">
          {saved && (
            <div className="success-message">
              <span aria-hidden="true"><Icon name="check" /></span>
              Settings synced successfully{syncedAt ? ` at ${syncedAt}` : ''}.
            </div>
          )}
          {error && <div className="error-message"><span aria-hidden="true"><Icon name="error" /></span> {error}</div>}

          {/* Focus & Productivity Tab */}
          {activeTab === 'focus' && (
            <div className="settings-section">
              <h2>Focus & Productivity</h2>
              <p className="section-description">
                Optimize your Pomodoro timer and focus sessions for maximum productivity
              </p>

              <div className="settings-group">
                <div className="setting-item">
                  <label>Focus Time (minutes)</label>
                  <div className="setting-input-group">
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={settings.focusTime}
                      onChange={(e) => updateSetting('focusTime', parseInt(e.target.value))}
                      className="settings-input"
                    />
                    <span className="input-hint">{settings.focusTime} min focused work session</span>
                  </div>
                </div>

                <div className="setting-item">
                  <label>Break Time (minutes)</label>
                  <div className="setting-input-group">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={settings.breakTime}
                      onChange={(e) => updateSetting('breakTime', parseInt(e.target.value))}
                      className="settings-input"
                    />
                    <span className="input-hint">Short break between sessions</span>
                  </div>
                </div>

                <div className="setting-item">
                  <label>Sessions Per Cycle</label>
                  <div className="setting-input-group">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={settings.sessionsPerCycle}
                      onChange={(e) => updateSetting('sessionsPerCycle', parseInt(e.target.value))}
                      className="settings-input"
                    />
                    <span className="input-hint">
                      {settings.sessionsPerCycle} sessions = {Math.round((settings.focusTime * settings.sessionsPerCycle + settings.breakTime * (settings.sessionsPerCycle - 1)) / 60)} hours total
                    </span>
                  </div>
                </div>

                <div className="setting-item">
                  <label>Sound Notifications</label>
                  <div className="setting-toggle">
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled}
                      onChange={(e) => updateSetting('soundEnabled', e.target.checked)}
                      className="toggle-checkbox"
                      id="sound-toggle"
                    />
                    <label htmlFor="sound-toggle" className="toggle-label">
                      {settings.soundEnabled ? 'Enabled' : 'Disabled'}
                    </label>
                  </div>
                </div>
              </div>

              <div className="preset-buttons">
                <button
                  className="preset-btn"
                  onClick={() => {
                    updateSetting('focusTime', 25);
                    updateSetting('breakTime', 5);
                  }}
                >
                  Standard Pomodoro (25/5)
                </button>
                <button
                  className="preset-btn"
                  onClick={() => {
                    updateSetting('focusTime', 50);
                    updateSetting('breakTime', 10);
                  }}
                >
                  Extended Sessions (50/10)
                </button>
                <button
                  className="preset-btn"
                  onClick={() => {
                    updateSetting('focusTime', 90);
                    updateSetting('breakTime', 20);
                  }}
                >
                  Deep Work (90/20)
                </button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h2>Notifications & Reminders</h2>
              <p className="section-description">Control how and when you receive notifications</p>

              <div className="settings-group">
                <div className="setting-item">
                  <label>In-App Notifications</label>
                  <div className="setting-toggle">
                    <input
                      type="checkbox"
                      checked={settings.notifications}
                      onChange={(e) => updateSetting('notifications', e.target.checked)}
                      className="toggle-checkbox"
                      id="notif-toggle"
                    />
                    <label htmlFor="notif-toggle" className="toggle-label">
                      {settings.notifications ? 'Enabled' : 'Disabled'}
                    </label>
                  </div>
                </div>

                <div className="setting-item">
                  <label>Email Notifications</label>
                  <div className="setting-toggle">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => updateSetting('emailNotifications', e.target.checked)}
                      className="toggle-checkbox"
                      id="email-toggle"
                    />
                    <label htmlFor="email-toggle" className="toggle-label">
                      {settings.emailNotifications ? 'Enabled' : 'Disabled'}
                    </label>
                  </div>
                </div>

                <div className="setting-item">
                  <label>Auto-Archive Completed Tasks</label>
                  <div className="setting-toggle">
                    <input
                      type="checkbox"
                      checked={settings.autoArchiveCompleted}
                      onChange={(e) => updateSetting('autoArchiveCompleted', e.target.checked)}
                      className="toggle-checkbox"
                      id="archive-toggle"
                    />
                    <label htmlFor="archive-toggle" className="toggle-label">
                      {settings.autoArchiveCompleted ? 'Enabled' : 'Disabled'}
                    </label>
                  </div>
                </div>

                {settings.autoArchiveCompleted && (
                  <div className="setting-item">
                    <label>Archive After (days)</label>
                    <div className="setting-input-group">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={settings.autoArchiveDays}
                        onChange={(e) => updateSetting('autoArchiveDays', parseInt(e.target.value))}
                        className="settings-input"
                      />
                      <span className="input-hint">
                        Completed tasks archived after {settings.autoArchiveDays} days
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Display & Appearance Tab */}
          {activeTab === 'display' && (
            <div className="settings-section">
              <h2>Display & Appearance</h2>
              <p className="section-description">Customize how LMO To-Do List looks to you</p>

              <div className="settings-group">
                <div className="setting-item">
                  <label>Theme</label>
                  <div className="setting-select-group">
                    <select
                      value={settings.theme}
                      onChange={(e) => updateSetting('theme', e.target.value)}
                      className="settings-select"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto (System)</option>
                    </select>
                  </div>
                </div>

                <div className="setting-item">
                  <label>Time Format</label>
                  <div className="setting-select-group">
                    <select
                      value={settings.timeFormat}
                      onChange={(e) => updateSetting('timeFormat', e.target.value as '12h' | '24h')}
                      className="settings-select"
                    >
                      <option value="24h">24-Hour (14:30)</option>
                      <option value="12h">12-Hour (2:30 PM)</option>
                    </select>
                  </div>
                </div>

                <div className="setting-item">
                  <label>Language</label>
                  <div className="setting-select-group">
                    <select
                      value={settings.language}
                      onChange={(e) => updateSetting('language', e.target.value)}
                      className="settings-select"
                    >
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                      <option value="es">Español</option>
                      <option value="de">Deutsch</option>
                      <option value="ar">العربية</option>
                    </select>
                  </div>
                </div>

                <div className="setting-item">
                  <label>Default Workspace</label>
                  <div className="setting-select-group">
                    <select
                      value={settings.defaultWorkspace}
                      onChange={(e) => updateSetting('defaultWorkspace', e.target.value)}
                      className="settings-select"
                    >
                      <option value="Personal">Personal</option>
                      <option value="Work">Work</option>
                      <option value="Learning">Learning</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="settings-section">
              <h2>Advanced Settings</h2>
              <p className="section-description">Fine-tune your LMO To-Do List experience</p>

              <div className="settings-group">
                <div className="setting-item">
                  <label>Week Start Day</label>
                  <div className="setting-select-group">
                    <select
                      value={settings.weekStartDay}
                      onChange={(e) => updateSetting('weekStartDay', e.target.value as 'monday' | 'sunday')}
                      className="settings-select"
                    >
                      <option value="monday">Monday</option>
                      <option value="sunday">Sunday</option>
                    </select>
                  </div>
                </div>

                <div className="advanced-info-card">
                  <h3><span aria-hidden="true"><Icon name="info" /></span> Advanced Features Coming Soon</h3>
                  <ul>
                    <li><span aria-hidden="true"><Icon name="check" /></span> Task export to CSV/PDF</li>
                    <li><span aria-hidden="true"><Icon name="check" /></span> Recurring task automation</li>
                    <li><span aria-hidden="true"><Icon name="check" /></span> Time tracking integration</li>
                    <li><span aria-hidden="true"><Icon name="check" /></span> Team collaboration</li>
                    <li><span aria-hidden="true"><Icon name="check" /></span> Analytics dashboard</li>
                    <li><span aria-hidden="true"><Icon name="check" /></span> Calendar integration</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="settings-actions">
            <button className="btn btn-primary" onClick={handleSaveSettings}>
              <span aria-hidden="true"><Icon name="save" /></span> Save All Changes
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Settings;
