import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  X, 
  Clock, 
  AlertTriangle, 
  ExternalLink, 
  User, 
  Key, 
  FileText, 
  Download,
  Flame,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { vaultApi, authApi } from '../utils/api';
import { encryptPassword, decodeSharePayload, deriveKey } from '../utils/crypto';
import Swal from 'sweetalert2';

export default function ReceiveShareModal({ rawHash, onClose }) {
  const { isAuthenticated, token, encryptionKey, user, unlockVault } = useAuth();

  const [payload, setPayload] = useState(null);
  const [error, setError] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [requiresPin, setRequiresPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [pinError, setPinError] = useState('');

  const [visibleSecret, setVisibleSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedSuccess, setImportedSuccess] = useState(false);

  useEffect(() => {
    if (!rawHash) return;

    try {
      setError('');
      setIsExpired(false);

      // Remove #share= or share= if present
      let cleanHash = rawHash;
      const idx = cleanHash.indexOf('share=');
      if (idx !== -1) {
        cleanHash = cleanHash.substring(idx + 6);
      }

      const data = decodeSharePayload(cleanHash);
      if (!data) {
        setError('Invalid or corrupted encrypted share package.');
        return;
      }

      if (data.secret && data.secret.includes('Decryption Error')) {
        setError('The sender generated this share link while their vault was locked. Please ask the sender to unlock their vault and create a new share link.');
        return;
      }

      setPayload(data);

      // Verify expiration
      if (data.created && data.exp && data.exp !== '1view') {
        const createdMs = Number(data.created);
        const nowMs = Date.now();
        let maxDuration = 24 * 60 * 60 * 1000; // default 24h

        if (data.exp === '1h') maxDuration = 1 * 60 * 60 * 1000;
        else if (data.exp === '7d') maxDuration = 7 * 24 * 60 * 60 * 1000;

        if (nowMs - createdMs > maxDuration) {
          setIsExpired(true);
        }
      }

      // Check PIN requirement
      if (data.hasPin || data.pin) {
        setRequiresPin(true);
        setPinUnlocked(false);
      } else {
        setRequiresPin(false);
        setPinUnlocked(true);
      }
    } catch (err) {
      console.error('Failed to parse share payload', err);
      setError('Invalid or corrupted encrypted share package.');
    }
  }, [rawHash]);

  if (!rawHash) return null;

  const handleVerifyPin = (e) => {
    e.preventDefault();
    setPinError('');

    if (!payload || !payload.pin) {
      setPinUnlocked(true);
      return;
    }

    if (pinInput.trim() === payload.pin.trim()) {
      setPinUnlocked(true);
    } else {
      setPinError('Incorrect Access PIN. Please try again.');
    }
  };

  const handleCopySecret = () => {
    if (!payload?.secret) return;
    navigator.clipboard.writeText(payload.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2500);
  };

  const handleCopyUsername = () => {
    if (!payload?.username) return;
    navigator.clipboard.writeText(payload.username);
    setCopiedUsername(true);
    setTimeout(() => setCopiedUsername(false), 2500);
  };

  const handleImportToVault = async () => {
    if (!payload) return;

    if (!isAuthenticated || !token) {
      Swal.fire({
        icon: 'warning',
        title: 'Sign In Required',
        text: 'Please sign in to your Password Vault account to import this credential.',
        background: '#0f172a',
        color: '#f1f5f9',
        confirmButtonColor: '#6366f1',
      });
      return;
    }

    setImporting(true);
    try {
      let keyToUse = encryptionKey;

      // If vault session key is missing, prompt for Master Password
      if (!keyToUse) {
        setImporting(false);
        const { value: masterPassword } = await Swal.fire({
          title: 'Unlock Vault to Import',
          text: 'Enter your Master Password to derive your AES key and save this credential to your vault.',
          input: 'password',
          inputPlaceholder: 'Enter Master Password',
          showCancelButton: true,
          confirmButtonText: 'Unlock & Import',
          confirmButtonColor: '#6366f1',
          cancelButtonColor: '#475569',
          background: '#0f172a',
          color: '#f1f5f9',
          customClass: {
            popup: 'glass-panel border-indigo-500/30 shadow-2xl',
            title: 'text-white font-bold',
            input: 'glass-input text-center text-sm font-mono tracking-widest',
          },
          inputValidator: (val) => {
            if (!val) return 'Master Password is required';
          }
        });

        if (!masterPassword) return;

        setImporting(true);
        const unlocked = await unlockVault(masterPassword);
        if (!unlocked) {
          Swal.fire({
            icon: 'error',
            title: 'Incorrect Master Password',
            text: 'The password you entered is incorrect. Vault remains locked and credential was not imported.',
            background: '#0f172a',
            color: '#f1f5f9',
            confirmButtonColor: '#f43f5e',
          });
          setImporting(false);
          return;
        }

        keyToUse = await deriveKey(masterPassword, user?.email || 'PasswordVaultSalt');
      }

      if (!keyToUse) {
        throw new Error('Vault encryption key is unavailable.');
      }

      // Check for duplicate vault item before importing
      const existingItems = await vaultApi.getItems(token);
      if (Array.isArray(existingItems)) {
        const targetTitleClean = (payload.title || 'Shared Credential').trim().toLowerCase();
        const targetUsernameClean = (payload.username || '').trim().toLowerCase();

        const isDuplicate = existingItems.some((item) => {
          const itemTitleClean = (item.title || '').trim().toLowerCase();
          const itemUsernameClean = (item.username || '').trim().toLowerCase();

          const titleMatch =
            itemTitleClean === targetTitleClean ||
            itemTitleClean === `${targetTitleClean} (shared)` ||
            itemTitleClean.replace(' (shared)', '') === targetTitleClean;

          const usernameMatch = itemUsernameClean === targetUsernameClean;

          return titleMatch && usernameMatch;
        });

        if (isDuplicate) {
          setImporting(false);
          Swal.fire({
            icon: 'warning',
            title: 'Vault Already Exists',
            text: `The shared credential "${payload.title || 'Credential'}" already exists in your vault! Duplicate imports are not allowed.`,
            background: '#0f172a',
            color: '#f1f5f9',
            confirmButtonColor: '#6366f1',
            customClass: {
              popup: 'glass-panel border-amber-500/30 shadow-2xl bg-[#0b0f19]',
              title: 'text-white font-bold',
            }
          });
          return;
        }
      }

      // Encrypt shared secret with user's master key
      const { encryptedPassword, iv } = await encryptPassword(payload.secret || '', keyToUse);

      const newItemPayload = {
        title: payload.title ? `${payload.title} (Shared)` : 'Shared Credential',
        username: payload.username || '',
        encryptedPassword,
        iv,
        url: payload.url || '',
        category: payload.category || 'LOGIN',
        permissionLevel: payload.permissionLevel || 'VIEW_ONLY',
        notes: payload.notes ? `${payload.notes}\n[Imported from Shared Secret]` : '[Imported from Shared Secret]',
        favorite: false,
      };

      await vaultApi.createItem(newItemPayload, token);
      setImportedSuccess(true);
      window.dispatchEvent(new CustomEvent('vault-updated'));

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Saved to Your Vault!',
        text: `"${payload.title || 'Credential'}" has been added to your vault.`,
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        background: '#0f172a',
        color: '#f1f5f9',
      });

      setTimeout(() => setImportedSuccess(false), 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('already exist')) {
        Swal.fire({
          icon: 'warning',
          title: 'Vault Already Exists',
          text: msg || 'This shared credential already exists in your vault!',
          background: '#0f172a',
          color: '#f1f5f9',
          confirmButtonColor: '#6366f1',
          customClass: {
            popup: 'glass-panel border-amber-500/30 shadow-2xl bg-[#0b0f19]',
            title: 'text-white font-bold',
          }
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Import Failed',
          text: msg || 'Failed to import secret to vault',
          background: '#0f172a',
          color: '#f1f5f9',
          confirmButtonColor: '#f43f5e',
        });
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-fadeIn">
      <div className="glass-modal w-full max-w-lg overflow-hidden border-indigo-500/30 shadow-2xl bg-[#0b0f19] flex flex-col max-h-[90vh] relative">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-indigo-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-wide flex items-center gap-2">
                <span>Encrypted Credential Shared</span>
                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  AES-256
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                End-to-End Encrypted One-Time Sharing Package
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">
          {error ? (
            <div className="p-6 text-center flex flex-col items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <ShieldAlert className="w-10 h-10 text-rose-400" />
              <h4 className="font-bold text-slate-100 text-sm">{error}</h4>
              <p className="text-xs text-slate-400">The share link may be malformed or invalid.</p>
            </div>
          ) : isExpired ? (
            <div className="p-6 text-center flex flex-col items-center gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl">
              <Clock className="w-10 h-10 text-amber-400 animate-pulse" />
              <h4 className="font-bold text-slate-100 text-sm tracking-wide uppercase">Share Link Expired</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                This encrypted secret package reached its security expiration limit and can no longer be accessed.
              </p>
            </div>
          ) : requiresPin && !pinUnlocked ? (
            /* PIN / Passcode Verification Form */
            <form onSubmit={handleVerifyPin} className="p-6 rounded-xl bg-slate-900/60 border border-indigo-500/20 flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-200 text-sm tracking-wide">Passcode Protected Secret</h4>
                <p className="text-xs text-slate-400 mt-1">
                  The sender set an Access PIN for this credential. Enter the PIN to view the secret.
                </p>
              </div>

              {pinError && (
                <div className="text-xs text-rose-300 font-bold bg-rose-500/15 border border-rose-500/30 px-3 py-1.5 rounded-lg w-full">
                  {pinError}
                </div>
              )}

              <div className="w-full flex flex-col gap-2 max-w-xs">
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Enter 4-6 digit PIN"
                  className="glass-input text-center text-sm font-mono tracking-widest py-2.5 border-indigo-500/30"
                />
                <button
                  type="submit"
                  className="btn-primary py-2.5 text-xs font-bold uppercase tracking-wider shadow-lg"
                >
                  Unlock Secret
                </button>
              </div>
            </form>
          ) : payload ? (
            /* Credential View Section */
            <div className="flex flex-col gap-4">
              {/* 1-View Warning Banner if applicable */}
              {payload.exp === '1view' && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-200 text-xs flex items-center gap-2.5">
                  <Flame className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-bold text-[11px]">
                    Self-Destruct Notice: This secret will expire after closing this window.
                  </span>
                </div>
              )}

              {/* Title & Category with Permission Badge */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white tracking-wide">{payload.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-indigo-500/20">
                        {payload.category || 'LOGIN'}
                      </span>
                      {/* Permission Level Badge */}
                      <span className={`text-[9px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border ${
                        payload.permissionLevel === 'FULL_MANAGEMENT'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : payload.permissionLevel === 'EDIT_ACCESS'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                      }`}>
                        {payload.permissionLevel === 'FULL_MANAGEMENT'
                          ? 'Full Management'
                          : payload.permissionLevel === 'EDIT_ACCESS'
                          ? 'Edit Access'
                          : 'View Only'}
                      </span>
                    </div>
                  </div>
                </div>
                {payload.url && (
                  <a
                    href={payload.url.startsWith('http') ? payload.url : `https://${payload.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20 transition flex items-center gap-1 text-xs font-semibold"
                  >
                    <span>Visit Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* System Checks Permission Matrix Notice */}
              <div className="p-3.5 rounded-xl bg-slate-900/40 border border-white/[0.05] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>System Permission Checks</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Owner Assigned Permission
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center pt-1">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    ✓ View Only
                  </div>
                  <div className={`p-2 rounded-lg text-[10px] font-bold ${
                    payload.permissionLevel === 'EDIT_ACCESS' || payload.permissionLevel === 'FULL_MANAGEMENT'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                      : 'bg-slate-800/40 border border-white/5 text-slate-500 line-through'
                  }`}>
                    {payload.permissionLevel === 'EDIT_ACCESS' || payload.permissionLevel === 'FULL_MANAGEMENT' ? '✓ Edit Access' : '✕ Edit Access'}
                  </div>
                  <div className={`p-2 rounded-lg text-[10px] font-bold ${
                    payload.permissionLevel === 'FULL_MANAGEMENT'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                      : 'bg-slate-800/40 border border-white/5 text-slate-500 line-through'
                  }`}>
                    {payload.permissionLevel === 'FULL_MANAGEMENT' ? '✓ Delete' : '✕ Delete'}
                  </div>
                  <div className={`p-2 rounded-lg text-[10px] font-bold ${
                    payload.permissionLevel === 'FULL_MANAGEMENT'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                      : 'bg-slate-800/40 border border-white/5 text-slate-500 line-through'
                  }`}>
                    {payload.permissionLevel === 'FULL_MANAGEMENT' ? '✓ Manage Share' : '✕ Manage Share'}
                  </div>
                </div>
              </div>

              {/* Username Field */}
              {payload.username && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <User className="w-3 h-3 text-indigo-400" /> Username / Identity
                  </label>
                  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-white/[0.05]">
                    <span className="text-xs font-medium text-slate-200">{payload.username}</span>
                    <button
                      onClick={handleCopyUsername}
                      className="p-1 text-slate-400 hover:text-white transition"
                      title="Copy Username"
                    >
                      {copiedUsername ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Secret / Password Field */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Key className="w-3 h-3 text-cyan-400" /> Shared Secret / Password
                </label>
                <div className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-slate-900/80 border border-indigo-500/30">
                  <span className="font-mono text-sm text-cyan-300 tracking-wider">
                    {visibleSecret ? payload.secret : '••••••••••••••••'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setVisibleSecret(!visibleSecret)}
                      className="p-1 text-slate-400 hover:text-white transition"
                      title={visibleSecret ? 'Hide Password' : 'Show Password'}
                    >
                      {visibleSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={handleCopySecret}
                      className="btn-primary py-1 px-3 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                    >
                      {copiedSecret ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {payload.notes && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <FileText className="w-3 h-3 text-amber-400" /> Shared Notes
                  </label>
                  <div className="p-3.5 rounded-xl bg-slate-900/50 border border-white/[0.04] text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {payload.notes}
                  </div>
                </div>
              )}

              {/* Import to Vault Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleImportToVault}
                  disabled={importing || importedSuccess}
                  className="w-full btn-secondary py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 active:scale-[0.99] transition cursor-pointer"
                >
                  {importedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">Saved to Your Vault!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-indigo-400" />
                      <span>{importing ? 'Saving to Vault...' : 'Import to My Vault'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Zero-Knowledge Security
          </div>
          <button
            onClick={onClose}
            className="btn-secondary py-1.5 px-4 text-xs font-bold uppercase tracking-wider"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
