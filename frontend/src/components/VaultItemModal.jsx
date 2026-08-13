import React, { useState, useEffect } from 'react';
import { X, Globe, User, Shield, Sparkles, Eye, EyeOff, Lock, KeyRound, Github, Briefcase, Share2, AlertCircle, Check } from 'lucide-react';
import { encryptPassword, calculatePasswordStrength, generateSecurePassword } from '../utils/crypto';
import { useAuth } from '../context/AuthContext';

const CATEGORY_OPTIONS = [
  { id: 'LOGIN', label: 'Login', icon: KeyRound },
  { id: 'GITHUB', label: 'GitHub', icon: Github },
  { id: 'WORK', label: 'Work', icon: Briefcase },
  { id: 'SOCIAL', label: 'Social', icon: Share2 },
];

export default function VaultItemModal({ isOpen, onClose, onSave, initialData }) {
  const { encryptionKey } = useAuth();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setCategory(initialData.category || 'LOGIN');
      setUsername(initialData.username || '');
      setPassword(initialData.decryptedPassword || '');
      setUrl(initialData.url || '');
      setNotes(initialData.notes || '');
    } else {
      setTitle('');
      setCategory('LOGIN');
      setUsername('');
      setPassword('');
      setUrl('');
      setNotes('');
    }
    setError('');
    setFieldErrors({});
  }, [initialData, isOpen]);

  const isReadOnly = Boolean(initialData?.permissionLevel === 'VIEW_ONLY' || initialData?.readOnly);

  if (!isOpen) return null;

  const strength = calculatePasswordStrength(password);

  const getPlaceholders = (cat) => {
    switch (cat) {
      case 'GITHUB':
        return {
          title: 'e.g. GitHub Account, Personal Access Token (PAT)',
          username: 'github_username or user@email.com',
          password: 'Enter password or PAT token',
          url: 'https://github.com',
          notes: 'SSH Key Passphrase, PAT Token scopes, 2FA Recovery Codes...',
        };
      case 'WORK':
        return {
          title: 'e.g. Corporate SSO, Work Slack, Corporate VPN',
          username: 'employee_id or work_email@company.com',
          password: 'Enter work SSO password',
          url: 'https://sso.company.com',
          notes: 'Employee ID, VPN Server, Security pin...',
        };
      case 'SOCIAL':
        return {
          title: 'e.g. Twitter/X, Discord, LinkedIn, Instagram',
          username: 'handle or email',
          password: 'Enter social account password',
          url: 'https://twitter.com',
          notes: 'Recovery codes, linked email...',
        };
      default:
        return {
          title: 'e.g. Google Account, Netflix, Work WiFi',
          username: 'user@example.com',
          password: 'Enter or generate secret password',
          url: 'https://example.com',
          notes: 'Additional security notes...',
        };
    }
  };

  const placeholders = getPlaceholders(category);

  const handleGeneratePassword = () => {
    const generated = generateSecurePassword(16);
    setPassword(generated);
    setShowPassword(true);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: '' }));
    }
  };

  const handleTitleChange = (val) => {
    setTitle(val);
    if (fieldErrors.title) {
      setFieldErrors((prev) => ({ ...prev, title: '' }));
    }
  };

  const handleUsernameChange = (val) => {
    setUsername(val);
    if (fieldErrors.username) {
      setFieldErrors((prev) => ({ ...prev, username: '' }));
    }
  };

  const handlePasswordChange = (val) => {
    setPassword(val);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: '' }));
    }
  };

  const handleUrlChange = (val) => {
    setUrl(val);
    if (fieldErrors.url) {
      setFieldErrors((prev) => ({ ...prev, url: '' }));
    }
  };

  const handleNotesChange = (val) => {
    setNotes(val);
    if (fieldErrors.notes) {
      setFieldErrors((prev) => ({ ...prev, notes: '' }));
    }
  };

  const validate = () => {
    const errors = {};
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      errors.title = 'Title / Item Name is required';
    } else if (trimmedTitle.length < 2) {
      errors.title = 'Title must be at least 2 characters';
    } else if (trimmedTitle.length > 100) {
      errors.title = 'Title cannot exceed 100 characters';
    }

    if (username.trim()) {
      const trimmedUser = username.trim();
      if (trimmedUser.length < 2) {
        errors.username = 'Username / Email must be at least 2 characters';
      } else if (trimmedUser.includes('@')) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(trimmedUser)) {
          errors.username = 'Please enter a valid email address';
        }
      }
    }

    if (!password) {
      errors.password = 'Password / Secret is required';
    } else if (password.length < 4) {
      errors.password = 'Password / Secret must be at least 4 characters';
    }

    if (url.trim()) {
      const trimmedUrl = url.trim();
      const urlPattern = /^(https?:\/\/)?(localhost|(\d{1,3}\.){3}\d{1,3}|([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(:[0-9]+)?(\/.*)?$/i;
      if (!urlPattern.test(trimmedUrl)) {
        errors.url = 'Please enter a valid URL (e.g. example.com or https://example.com)';
      }
    }

    if (notes && notes.length > 2000) {
      errors.notes = 'Notes cannot exceed 2000 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setError('');

    if (!validate()) return;

    if (!encryptionKey) {
      setError('Vault key not initialized. Please re-login.');
      return;
    }

    try {
      setSaving(true);

      // Client-side AES-256-GCM Encryption before network payload
      const { encryptedPassword, iv } = await encryptPassword(password, encryptionKey);

      const payload = {
        title: title.trim(),
        category,
        username: username.trim(),
        encryptedPassword,
        iv,
        url: url.trim(),
        favorite: initialData ? Boolean(initialData.favorite) : false,
        notes,
      };

      await onSave(payload, initialData?.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to encrypt and save vault item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel white-animated-modal w-full max-w-2xl overflow-hidden shadow-2xl bg-slate-950/90">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.01]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white tracking-wide flex items-center gap-2">
              <span>{isReadOnly ? 'Credential Details' : initialData ? 'Edit Vault Item' : 'New Vault Item'}</span>
              {isReadOnly && (
                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  View Only
                </span>
              )}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} noValidate className="p-6 flex flex-col gap-4">
          {isReadOnly && (
            <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-200 text-xs flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-sky-400 shrink-0" />
              <div className="text-[11px] leading-relaxed font-semibold">
                <strong className="font-bold text-sky-300">System Permission Check:</strong> View Only permission level assigned by owner. Editing is disabled.
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-white text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
              Item Category
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORY_OPTIONS.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`py-2 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40 shadow-[inset_0_1px_1px_rgba(99,102,241,0.2)] font-extrabold'
                        : 'bg-slate-900/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/[0.03]'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Item Title */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
              <span>Title / Item Name *</span>
              {title.trim().length >= 2 && !fieldErrors.title && (
                <span className="text-emerald-400 flex items-center gap-1 font-bold text-[9px]">
                  <Check className="w-3 h-3 text-emerald-400" /> Valid Title
                </span>
              )}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder={placeholders.title}
              className={`glass-input text-xs transition-all duration-200 ${
                fieldErrors.title
                  ? 'border-rose-500/80 shadow-[0_0_12px_rgba(244,63,94,0.25)] text-rose-100 placeholder:text-rose-300/40 focus:border-rose-500 focus:ring-rose-500/20'
                  : title.trim().length >= 2
                  ? 'border-emerald-500/50 text-slate-100 focus:border-emerald-400 focus:ring-emerald-500/20'
                  : ''
              }`}
            />
            {fieldErrors.title && (
              <div className="flex items-center gap-1.5 text-[11px] text-white font-semibold mt-1.5 animate-fadeIn">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{fieldErrors.title}</span>
              </div>
            )}
          </div>

          {/* Username / Email */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
              <span>Username / Email</span>
              {username.trim().length >= 2 && !fieldErrors.username && (
                <span className="text-emerald-400 flex items-center gap-1 font-bold text-[9px]">
                  <Check className="w-3 h-3 text-emerald-400" /> Valid Format
                </span>
              )}
            </label>
            <div className="relative flex items-center">
              <User className={`w-4 h-4 absolute left-3.5 pointer-events-none transition-colors duration-200 ${
                fieldErrors.username ? 'text-rose-400' : username.trim().length >= 2 ? 'text-emerald-400' : 'text-slate-400'
              }`} />
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder={placeholders.username}
                className={`glass-input pl-11 text-xs transition-all duration-200 ${
                  fieldErrors.username
                    ? 'border-rose-500/80 shadow-[0_0_12px_rgba(244,63,94,0.25)] text-rose-100 focus:border-rose-500 focus:ring-rose-500/20'
                    : username.trim().length >= 2
                    ? 'border-emerald-500/50 text-slate-100 focus:border-emerald-400 focus:ring-emerald-500/20'
                    : ''
                }`}
              />
            </div>
            {fieldErrors.username && (
              <div className="flex items-center gap-1.5 text-[11px] text-white font-semibold mt-1.5 animate-fadeIn">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{fieldErrors.username}</span>
              </div>
            )}
          </div>

          {/* Password with Strength & Generator */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span>Password / Secret *</span>
                {password.length >= 4 && !fieldErrors.password && (
                  <span className="text-emerald-400 flex items-center gap-1 font-bold text-[9px] lowercase">
                    <Check className="w-3 h-3 text-emerald-400" /> valid secret
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate Secure
              </button>
            </div>
            <div className="relative flex items-center">
              <Shield className={`w-4 h-4 absolute left-3.5 pointer-events-none transition-colors duration-200 ${
                fieldErrors.password ? 'text-rose-400' : password.length >= 4 ? 'text-emerald-400' : 'text-slate-400'
              }`} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder={placeholders.password}
                className={`glass-input font-mono pl-11 pr-12 text-xs transition-all duration-200 ${
                  fieldErrors.password
                    ? 'border-rose-500/80 shadow-[0_0_12px_rgba(244,63,94,0.25)] text-rose-100 focus:border-rose-500 focus:ring-rose-500/20'
                    : password.length >= 4
                    ? 'border-emerald-500/50 text-slate-100 focus:border-emerald-400 focus:ring-emerald-500/20'
                    : ''
                }`}
              />
              <div className="absolute right-2 flex items-center">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {fieldErrors.password && (
              <div className="flex items-center gap-1.5 text-[11px] text-white font-semibold mt-1.5 animate-fadeIn">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{fieldErrors.password}</span>
              </div>
            )}

            {/* Strength Meter */}
            {password && (
              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1 bg-slate-900 border border-white/5 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${strength.score}%`,
                      backgroundColor: strength.color,
                    }}
                  />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide shrink-0" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          {/* Website URL */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
              <span>Website URL</span>
              {url.trim() && !fieldErrors.url && (
                <span className="text-emerald-400 flex items-center gap-1 font-bold text-[9px]">
                  <Check className="w-3 h-3 text-emerald-400" /> Valid URL
                </span>
              )}
            </label>
            <div className="relative flex items-center">
              <Globe className={`w-4 h-4 absolute left-3.5 pointer-events-none transition-colors duration-200 ${
                fieldErrors.url ? 'text-rose-400' : url.trim() ? 'text-emerald-400' : 'text-slate-400'
              }`} />
              <input
                type="text"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder={placeholders.url}
                className={`glass-input pl-11 text-xs transition-all duration-200 ${
                  fieldErrors.url
                    ? 'border-rose-500/80 shadow-[0_0_12px_rgba(244,63,94,0.25)] text-rose-100 focus:border-rose-500 focus:ring-rose-500/20'
                    : url.trim()
                    ? 'border-emerald-500/50 text-slate-100 focus:border-emerald-400 focus:ring-emerald-500/20'
                    : ''
                }`}
              />
            </div>
            {fieldErrors.url && (
              <div className="flex items-center gap-1.5 text-[11px] text-white font-semibold mt-1.5 animate-fadeIn">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{fieldErrors.url}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
              <span>Notes & Recovery Keys</span>
              {notes && !fieldErrors.notes && (
                <span className="text-slate-400 text-[9px] font-mono">{notes.length}/2000</span>
              )}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder={placeholders.notes}
              className={`glass-input resize-none text-xs transition-all duration-200 ${
                fieldErrors.notes
                  ? 'border-rose-500/80 shadow-[0_0_12px_rgba(244,63,94,0.25)] text-rose-100 focus:border-rose-500 focus:ring-rose-500/20'
                  : ''
              }`}
            />
            {fieldErrors.notes && (
              <div className="flex items-center gap-1.5 text-[11px] text-white font-semibold mt-1.5 animate-fadeIn">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{fieldErrors.notes}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-3 pt-4 border-t border-white/[0.05]">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs uppercase font-bold tracking-wider py-2.5 px-4"
            >
              {isReadOnly ? 'Close' : 'Cancel'}
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                disabled={saving}
                className="btn-primary text-xs uppercase font-bold tracking-wider py-2.5 px-5 hover:scale-[1.01] active:scale-[0.99]"
              >
                {saving ? 'Encrypting & Saving...' : 'Save Credential'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
