import React, { useState, useEffect } from 'react';
import { X, Globe, User, Shield, Sparkles, Eye, EyeOff, Lock } from 'lucide-react';
import { encryptPassword, calculatePasswordStrength, generateSecurePassword } from '../utils/crypto';
import { useAuth } from '../context/AuthContext';

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

  if (!isOpen) return null;

  const strength = calculatePasswordStrength(password);

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

  const validate = () => {
    const errors = {};
    if (!title.trim()) {
      errors.title = 'Title / Item Name is required';
    }
    if (!password) {
      errors.password = 'Password / Secret is required';
    }
    if (url.trim()) {
      const trimmedUrl = url.trim();
      const urlPattern = /^(https?:\/\/)?(localhost|(\d{1,3}\.){3}\d{1,3}|([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(:[0-9]+)?(\/.*)?$/i;
      if (!urlPattern.test(trimmedUrl)) {
        errors.url = 'Please enter a valid URL (e.g. example.com or http://localhost:3000)';
      }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <div className="glass-panel w-full max-w-lg overflow-hidden border-white/[0.05] shadow-premium bg-slate-950/80">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.01]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white tracking-wide">
              {initialData ? 'Edit Vault Item' : 'New Vault Item'}
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
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
              Item Category
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['LOGIN', 'CARD', 'NOTE', 'IDENTITY'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border ${
                    category === cat
                      ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/35 shadow-[inset_0_1px_1px_rgba(99,102,241,0.15)] font-extrabold'
                      : 'bg-slate-900/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/[0.03]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Item Title */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Title / Item Name *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Google Account, Netflix, Work WiFi"
              className={`glass-input text-xs transition-all duration-200 ${fieldErrors.title ? 'border-rose-500/40 focus:border-rose-500/80 focus:ring-rose-500/10' : ''}`}
            />
            {fieldErrors.title && (
              <p className="text-[10px] text-rose-400 font-semibold mt-1.5 transition-all duration-300 ease-in-out">
                {fieldErrors.title}
              </p>
            )}
          </div>

          {/* Username / Email */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Username / Email
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="user@example.com"
                className="glass-input pl-11 text-xs"
              />
            </div>
          </div>

          {/* Password with Strength & Generator */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Password / Secret *
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
              <Shield className={`w-4 h-4 absolute left-3.5 pointer-events-none transition-colors duration-200 ${fieldErrors.password ? 'text-rose-400' : 'text-slate-400'}`} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="Enter or generate secret password"
                className={`glass-input font-mono pl-11 pr-12 text-xs transition-all duration-200 ${fieldErrors.password ? 'border-rose-500/40 focus:border-rose-500/80 focus:ring-rose-500/10' : ''}`}
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
              <p className="text-[10px] text-rose-400 font-semibold mt-1.5 transition-all duration-300 ease-in-out">
                {fieldErrors.password}
              </p>
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
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Website URL
            </label>
            <div className="relative flex items-center">
              <Globe className={`w-4 h-4 absolute left-3.5 pointer-events-none transition-colors duration-200 ${fieldErrors.url ? 'text-rose-400' : 'text-slate-400'}`} />
              <input
                type="text"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://example.com"
                className={`glass-input pl-11 text-xs transition-all duration-200 ${fieldErrors.url ? 'border-rose-500/40 focus:border-rose-500/80 focus:ring-rose-500/10' : ''}`}
              />
            </div>
            {fieldErrors.url && (
              <p className="text-[10px] text-rose-400 font-semibold mt-1.5 transition-all duration-300 ease-in-out">
                {fieldErrors.url}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Notes & Recovery Keys
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional security notes..."
              className="glass-input resize-none text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-3 pt-4 border-t border-white/[0.05]">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs uppercase font-bold tracking-wider py-2.5 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs uppercase font-bold tracking-wider py-2.5 px-5 hover:scale-[1.01] active:scale-[0.99]"
            >
              {saving ? 'Encrypting & Saving...' : 'Save Credential'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
