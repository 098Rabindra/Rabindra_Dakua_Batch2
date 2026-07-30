import React, { useState } from 'react';
import { Shield, Lock, Mail, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { calculatePasswordStrength } from '../utils/crypto';
import Swal from 'sweetalert2';

export default function RegisterPage({ onSwitchToLogin }) {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const strength = calculatePasswordStrength(password);

  const validate = () => {
    const errors = {};
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername) {
      errors.username = 'Username is required';
    } else if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
      errors.username = 'Username must be between 3 and 50 characters';
    } else {
      const usernameRegex = /^[a-zA-Z0-9_.]+$/;
      if (!usernameRegex.test(trimmedUsername)) {
        errors.username = 'Username must contain only letters, numbers, underscores, or dots';
      }
    }

    if (!trimmedEmail) {
      errors.email = 'Email Address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        errors.email = 'Please enter a valid email address';
      }
    }

    if (!password) {
      errors.password = 'Master password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    } else if (strength.score < 40) {
      errors.password = 'Master password is too weak for vault security';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm Master Password is required';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUsernameChange = (val) => {
    setUsername(val);
    if (fieldErrors.username) {
      setFieldErrors((prev) => ({ ...prev, username: '' }));
    }
  };

  const handleEmailChange = (val) => {
    setEmail(val);
    if (fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: '' }));
    }
  };

  const handlePasswordChange = (val) => {
    setPassword(val);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: '' }));
    }
  };

  const handleConfirmPasswordChange = (val) => {
    setConfirmPassword(val);
    if (fieldErrors.confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!validate()) return;

    setLoading(true);

    try {
      await register(username.trim(), email.trim(), password);

      await Swal.fire({
        title: 'Registration Successful!',
        html: `<p style="color:#94a3b8;font-size:14px;margin-top:4px">Welcome, <strong style="color:#818cf8">${username.trim()}</strong>!<br/>Your secure vault has been initialized.<br/>Please sign in to continue.</p>`,
        icon: 'success',
        iconColor: '#6366f1',
        background: '#0f172a',
        color: '#f1f5f9',
        confirmButtonText: 'Go to Login &nbsp;→',
        confirmButtonColor: '#6366f1',
        timer: 3000,
        timerProgressBar: true,
        showClass: {
          popup: 'animate__animated animate__fadeInDown'
        },
        hideClass: {
          popup: 'animate__animated animate__fadeOutUp'
        },
        customClass: {
          popup: 'swal-vault-popup',
          title: 'swal-vault-title',
          confirmButton: 'swal-vault-btn',
        },
      });

      onSwitchToLogin();
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-transparent">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8 select-none">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 shadow-xl shadow-indigo-500/25 mb-4 border border-white/10">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">PASSWORD</span>
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">VAULT</span>
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-1.5 tracking-wider uppercase">Create Zero-Knowledge Vault Account</p>
        </div>

        {/* Register Card */}
        <div className="glass-panel p-8 shadow-premium border-slate-800/80">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative flex items-center">
                <User className={`w-4 h-4 absolute left-3.5 pointer-events-none transition-colors duration-200 ${fieldErrors.username ? 'text-rose-400' : 'text-slate-400'}`} />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="alex_dev"
                  className={`glass-input pl-11 transition-all duration-200 ${fieldErrors.username ? 'border-rose-500/40 focus:border-rose-500/80 focus:ring-rose-500/10' : ''}`}
                />
              </div>
              {fieldErrors.username && (
                <p className="text-[10px] text-rose-400 font-semibold mt-1.5 transition-all duration-300 ease-in-out">
                  {fieldErrors.username}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className={`w-4 h-4 absolute left-3.5 pointer-events-none transition-colors duration-200 ${fieldErrors.email ? 'text-rose-400' : 'text-slate-400'}`} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="alex@company.com"
                  className={`glass-input pl-11 transition-all duration-200 ${fieldErrors.email ? 'border-rose-500/40 focus:border-rose-500/80 focus:ring-rose-500/10' : ''}`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-[10px] text-rose-400 font-semibold mt-1.5 transition-all duration-300 ease-in-out">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Master Password
              </label>
              <div className="relative flex items-center">
                <Lock className={`w-4 h-4 absolute left-3.5 pointer-events-none transition-colors duration-200 ${fieldErrors.password ? 'text-rose-400' : 'text-slate-400'}`} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="••••••••••••••••"
                  className={`glass-input font-mono pl-11 transition-all duration-200 ${fieldErrors.password ? 'border-rose-500/40 focus:border-rose-500/80 focus:ring-rose-500/10' : ''}`}
                />
              </div>
              {fieldErrors.password && (
                <p className="text-[10px] text-rose-400 font-semibold mt-1.5 transition-all duration-300 ease-in-out">
                  {fieldErrors.password}
                </p>
              )}

              {/* Strength Meter */}
              {password && (
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="flex-1 bg-slate-800/50 h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full transition-all duration-300"
                      style={{ width: `${strength.score}%`, backgroundColor: strength.color }}
                    />
                  </div>
                  <span className="text-[10px] font-bold tracking-wide uppercase shrink-0" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Confirm Master Password
              </label>
              <div className="relative flex items-center">
                <CheckCircle2 className={`w-4 h-4 absolute left-3.5 pointer-events-none transition-colors duration-200 ${fieldErrors.confirmPassword ? 'text-rose-400' : 'text-slate-400'}`} />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  placeholder="••••••••••••••••"
                  className={`glass-input font-mono pl-11 transition-all duration-200 ${fieldErrors.confirmPassword ? 'border-rose-500/40 focus:border-rose-500/80 focus:ring-rose-500/10' : ''}`}
                />
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-[10px] text-rose-400 font-semibold mt-1.5 transition-all duration-300 ease-in-out">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary py-3 text-sm mt-3 w-full shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
            >
              <span>{loading ? 'Initializing Vault Security...' : 'Initialize Vault'}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400 font-medium">
              Already have a vault?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4 transition"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
