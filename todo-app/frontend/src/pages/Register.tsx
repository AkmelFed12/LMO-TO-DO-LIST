import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Footer from '../components/Footer';
import { API_BASE_URL } from '../config/api';
import './Auth.css';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/register`, { email, password, name });
      localStorage.setItem('token', res.data.token);
      navigate('/');
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || 'Registration failed. Please try again later.'
        : 'Registration failed. Please try again later.';
      setError(message);
      console.error('Registration error:', error);
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
            <h1>Professional Task Management Platform</h1>
            <p className="auth-subtitle">Join thousands of professionals organizing their work, learning, and personal goals with LMO To-Do List.</p>
          </div>

          <div className="feature-card">
            <h3>Premium Features Included</h3>
            <ul className="feature-list">
              <li>Multi-workspace organization system</li>
              <li>Priority-based task management</li>
              <li>Customizable focus timer and productivity tracking</li>
            </ul>
          </div>
        </div>

        <div className="auth-card auth-form-card">
          <div className="auth-header">
            <h1>Create LMO To-Do List Account</h1>
            <p className="auth-subtitle">Join our productivity revolution today.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <h2>Get Started</h2>
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="input-field"
                disabled={loading}
              />
            </div>

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
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field"
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login">Login</Link></p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Register;
