import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Footer from '../components/Footer';
import { API_BASE_URL } from '../config/api';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      localStorage.setItem('token', res.data.token);
      navigate('/');
    } catch (error) {
      setError('Login failed. Please check your credentials and try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container auth-gradient-bg">
      <div className="auth-content auth-grid">
        <div className="auth-info-panel">
          <div className="auth-branding">
            <span className="brand-pill">LMO To-Do List</span>
            <h1>Professional Task Management Excellence</h1>
            <p className="auth-subtitle">Master your workflow with intelligent task organization, focused productivity, and team collaboration.</p>
          </div>

          <div className="feature-card">
            <h3>LMO To-Do List Premium Features</h3>
            <ul className="feature-list">
              <li>Workspace-driven task views</li>
              <li>Ready-to-use productivity templates</li>
              <li>Built-in focus timer for better sprints</li>
            </ul>
          </div>
        </div>

        <div className="auth-card auth-form-card">
          <div className="auth-header">
            <h1>Welcome to LMO To-Do List</h1>
            <p className="auth-subtitle">Secure login for premium task management.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <h2>Sign In</h2>
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field"
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="auth-footer">
            <p>New here? <Link to="/register">Create an account</Link></p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
