import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HiMail, HiLockClosed, HiArrowRight } from 'react-icons/hi';
import './login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/chat');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form
        onSubmit={handleSubmit}
        className="login-form"
        aria-label="Login form"
      >
        <h2 className="login-title">Welcome Back</h2>

        {error && (
          <div 
            className="error-message"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Email Input */}
        <div className="input-group">
          <label htmlFor="email" className="input-label">Email address</label>
          <div className="relative">
            <input
              id="email"
              className="input-field"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-required="true"
              aria-invalid={error && !validateEmail(email) ? "true" : "false"}
              disabled={isLoading}
            />
            <div className="input-icon">
              <HiMail size={24} />
            </div>
          </div>
        </div>

        {/* Password Input */}
        <div className="input-group">
          <label htmlFor="password" className="input-label">Password</label>
          <div className="relative">
            <input
              id="password"
              className="input-field"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-required="true"
              minLength={6}
              disabled={isLoading}
            />
            <div className="input-icon">
              <HiLockClosed size={24} />
            </div>
          </div>
        </div>

        {/* Forgot Password */}
        <div className="remember-forgot">
          <Link
            to="/forgot-password"
            className="forgot-password"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit Button */}
        <button
          className="login-button"
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="loading-spinner h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              Sign In <div className="login-button-icon"><HiArrowRight size={24} /></div>
            </span>
          )}
        </button>

        {/* Register Link */}
        <p className="register-link">
          Don't have an account?{' '}
          <Link to="/register">
            Create one now
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
