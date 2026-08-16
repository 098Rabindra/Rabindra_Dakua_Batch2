import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  ShieldCheck, 
  Copy, 
  Check, 
  Lock, 
  Clock, 
  Key, 
  Send, 
  Sparkles, 
  AlertTriangle,
  Globe,
  User,
  ExternalLink,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { vaultApi, authApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { encodeSharePayload, decryptPassword, deriveKey } from '../utils/crypto';

export default function ShareCredentialModal({ 
  isOpen, 
  onClose, 
  item, 
  decryptedPassword, 
  vaultItems = [], 
  decryptedMap = {} 
}) {
  const { token, encryptionKey, user, unlockVault } = useAuth();
  const [selectedItemId, setSelectedItemId] = useState('');
  const [expiration, setExpiration] = useState('24h'); // 1h, 24h, 7d, 1view
  const [permissionLevel, setPermissionLevel] = useState('VIEW_ONLY'); // VIEW_ONLY, EDIT_ACCESS, FULL_MANAGEMENT
  const [passcode, setPasscode] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [sharePayloadStr, setSharePayloadStr] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [emailNotice, setEmailNotice] = useState('');
  const [emailError, setEmailError] = useState('');


  // Master Password Unlock state if session is locked
  const [resolvedSecret, setResolvedSecret] = useState('');
  const [needsMasterPass, setNeedsMasterPass] = useState(false);
  const [masterPass, setMasterPass] = useState('');
  const [showMasterPass, setShowMasterPass] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  // Filter vaultItems to only those the user has permission to share (FULL_MANAGEMENT)
  const shareableItems = vaultItems.filter(
    (i) => !i.permissionLevel || i.permissionLevel === 'FULL_MANAGEMENT'
  );

  // Determine active item from dropdown selection or initial prop
  const activeItem =
    shareableItems.find((i) => i.id === selectedItemId) ||
    (item && (!item.permissionLevel || item.permissionLevel === 'FULL_MANAGEMENT') ? item : null) ||
    (shareableItems.length > 0 ? shareableItems[0] : null);
  const activeSecret = decryptedMap[activeItem?.id] || (activeItem?.id === item?.id ? decryptedPassword : '');

  useEffect(() => {
    if (isOpen) {
      if (item?.id && (!item.permissionLevel || item.permissionLevel === 'FULL_MANAGEMENT')) {
        setSelectedItemId(item.id);
      } else if (shareableItems.length > 0) {
        setSelectedItemId(shareableItems[0].id);
      }
    }
  }, [isOpen, item, shareableItems.length]);

  useEffect(() => {
    if (isOpen && activeItem) {
      setEmailSentSuccess(false);
      setEmailNotice('');
      setEmailError('');
      resolveAndGeneratePackage();
    } else {
      setCopiedLink(false);
      setCopiedPayload(false);
      setEmailSentSuccess(false);
      setEmailNotice('');
      setEmailError('');
      setRecipientEmail('');
      setPasscode('');
      setPermissionLevel('VIEW_ONLY');
      setMasterPass('');
      setUnlockError('');
      setNeedsMasterPass(false);
      setResolvedSecret('');
    }
  }, [isOpen, selectedItemId, activeItem, activeSecret, expiration, passcode, permissionLevel, encryptionKey]);

  if (!isOpen || !activeItem) return null;

  const resolveAndGeneratePackage = async (overrideSecret = null) => {
    try {
      let secretToShare = overrideSecret || resolvedSecret || activeSecret;

      // Check if current secret is valid
      const isValid = secretToShare && !secretToShare.includes('Decryption Error') && secretToShare !== '[ENCRYPTED_SECRET]';

      if (!isValid) {
        if (encryptionKey && activeItem.encryptedPassword && activeItem.iv) {
          const dec = await decryptPassword(activeItem.encryptedPassword, activeItem.iv, encryptionKey);
          if (dec && !dec.includes('Decryption Error')) {
            secretToShare = dec;
            setResolvedSecret(dec);
            setNeedsMasterPass(false);
          } else {
            setNeedsMasterPass(true);
            return;
          }
        } else {
          setNeedsMasterPass(true);
          return;
        }
      }

      setNeedsMasterPass(false);
      const timestamp = Date.now();

      // Create end-to-end encrypted sharing envelope
      const envelope = {
        v: 1,
        title: activeItem.title,
        username: activeItem.username || '',
        url: activeItem.url || '',
        category: activeItem.category || 'LOGIN',
        notes: activeItem.notes || '',
        secret: secretToShare,
        permissionLevel: permissionLevel,
        exp: expiration,
        created: timestamp,
        hasPin: Boolean(passcode.trim()),
        pin: passcode.trim(),
      };

      const encodedPayload = encodeSharePayload(envelope);
      const currentOrigin = window.location.origin;
      const fullShareUrl = `${currentOrigin}/#share=${encodedPayload}`;

      setShareLink(fullShareUrl);
      setSharePayloadStr(encodedPayload);
    } catch (err) {
      console.error('Failed to generate share package', err);
    }
  };

  const handleUnlockAndShare = async (e) => {
    e.preventDefault();
    if (!masterPass || unlocking) return;
    setUnlocking(true);
    setUnlockError('');

    try {
      if (user?.email) {
        try {
          await authApi.login({ email: user.email, password: masterPass });
        } catch (apiErr) {
          setUnlockError('Incorrect Master Password');
          setUnlocking(false);
          return;
        }
      }

      const derivedKey = await deriveKey(masterPass, user?.email || 'PasswordVaultSalt');
      if (activeItem.encryptedPassword && activeItem.iv) {
        const dec = await decryptPassword(activeItem.encryptedPassword, activeItem.iv, derivedKey);
        if (dec.includes('Decryption Error')) {
          setUnlockError('Incorrect Master Password. Unable to decrypt.');
          setUnlocking(false);
          return;
        }
        setResolvedSecret(dec);
        await unlockVault(masterPass);
        await resolveAndGeneratePackage(dec);
      }
    } catch (err) {
      setUnlockError(err.message || 'Incorrect Master Password');
    } finally {
      setUnlocking(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleTestLink = () => {
    if (!shareLink) return;
    onClose(); // close sender modal first
    window.location.hash = `share=${sharePayloadStr}`;
  };

  const handleCopyPayload = () => {
    if (!sharePayloadStr) return;
    navigator.clipboard.writeText(sharePayloadStr);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2500);
  };

  const handleSendShareEmail = async (e) => {
    e.preventDefault();
    if (!recipientEmail.trim() || !shareLink) return;

    setSendingEmail(true);
    setEmailError('');
    setEmailNotice('');
    setEmailSentSuccess(false);

    try {
      const res = await vaultApi.sendShareEmail(
        recipientEmail.trim(),
        shareLink,
        activeItem.title || 'Credential Secret',
        expiration === '1view' ? 'Self-Destruct (1-View)' : expiration,
        permissionLevel,
        passcode.trim(),
        user?.email || '',
        token
      );

      if (res && res.message && res.message.includes('blocked by ISP')) {
        setEmailNotice(res.message);
      } else {
        setEmailSentSuccess(true);
      }
      setTimeout(() => {
        setEmailSentSuccess(false);
        setEmailNotice('');
      }, 7000);
    } catch (err) {
      setEmailError(err.message || 'Failed to dispatch share email');
    } finally {
      setSendingEmail(false);
    }
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 animate-fadeIn">
      {/* Large Screen Modal Container (max-w-3xl) */}
      <div className="glass-modal w-full max-w-3xl overflow-hidden border-indigo-500/30 shadow-2xl bg-[#0b0f19] flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-white/[0.08] flex items-center justify-between bg-indigo-950/30">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-inner">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white tracking-wide flex items-center gap-2.5">
                <span>Secure Credential Sharing</span>
                <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Zero-Knowledge
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                End-to-End Encrypted One-Time Sharing Package with Granular Permissions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          
          {/* Section 1: Credential Selection Dropdown & Active Item Details */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/[0.06] flex flex-col gap-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="text-xs font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-400" />
                <span>Select Credential to Share</span>
              </label>

              {/* Dropdown Select for Shareable Credentials */}
              {shareableItems.length > 0 && (
                <div className="relative min-w-[260px]">
                  <select
                    value={activeItem?.id || ''}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="glass-input text-xs font-semibold py-2 pl-3 pr-8 w-full border-indigo-500/30 text-white bg-slate-900 focus:border-indigo-500"
                  >
                    {shareableItems.map((i) => (
                      <option key={i.id} value={i.id} className="bg-slate-900 text-white">
                        {i.title} {i.username ? `(${i.username})` : ''} [{i.category || 'LOGIN'}]
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Selected Credential Summary Details Card */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-indigo-500/20 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white tracking-wide">{activeItem.title}</h4>
                    <div className="flex items-center gap-2.5 mt-1 text-xs text-slate-400">
                      {activeItem.username && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <strong className="text-slate-200">{activeItem.username}</strong>
                        </span>
                      )}
                      <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-indigo-500/20">
                        {activeItem.category || 'LOGIN'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeItem.url && (
                    <a
                      href={activeItem.url.startsWith('http') ? activeItem.url : `https://${activeItem.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 border border-indigo-500/20 transition flex items-center gap-1 text-xs font-semibold"
                      title="Visit Website"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Visit</span>
                    </a>
                  )}
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                    <ShieldCheck className="w-3.5 h-3.5" /> AES-256
                  </span>
                </div>
              </div>

              {/* Notes Snippet if available */}
              {activeItem.notes && (
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/[0.04] text-[11px] text-slate-300 font-sans leading-relaxed line-clamp-2">
                  <strong className="text-slate-400 font-bold uppercase text-[9px] mr-1.5">Notes:</strong>
                  {activeItem.notes}
                </div>
              )}
            </div>
          </div>

          {needsMasterPass ? (
            <form onSubmit={handleUnlockAndShare} className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col gap-3">
              <div className="flex items-center gap-2.5 text-amber-300 font-bold text-xs uppercase tracking-wider">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Vault Session Locked</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Enter your Master Password to decrypt <strong className="text-white">{activeItem.title}</strong> and generate a valid encrypted share link.
              </p>

              {unlockError && (
                <div className="text-xs text-rose-300 font-bold bg-rose-500/15 border border-rose-500/30 p-2.5 rounded-lg">
                  {unlockError}
                </div>
              )}

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showMasterPass ? 'text' : 'password'}
                    required
                    value={masterPass}
                    onChange={(e) => setMasterPass(e.target.value)}
                    placeholder="Master Password"
                    className="glass-input text-xs py-2 border-amber-500/30 pr-9 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMasterPass(!showMasterPass)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showMasterPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={unlocking}
                  className="btn-primary text-xs py-2 px-4 font-bold uppercase whitespace-nowrap"
                >
                  {unlocking ? 'Decrypting...' : 'Unlock & Share'}
                </button>
              </div>
            </form>
          ) : null}

          {/* Permission Level Selector (Owner Assigns One Permission Level) */}
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Assign Recipient Permission Level</span>
              </label>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold uppercase">
                Owner Control
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPermissionLevel('VIEW_ONLY')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                  permissionLevel === 'VIEW_ONLY'
                    ? 'bg-sky-500/15 border-sky-500/50 shadow-md ring-1 ring-sky-500/30'
                    : 'bg-slate-900/60 border-white/[0.06] hover:bg-slate-900 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${permissionLevel === 'VIEW_ONLY' ? 'text-sky-300' : 'text-slate-200'}`}>
                    View Only
                  </span>
                  <div className={`w-2 h-2 rounded-full ${permissionLevel === 'VIEW_ONLY' ? 'bg-sky-400 animate-pulse' : 'bg-slate-600'}`} />
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">View only</p>
              </button>

              <button
                type="button"
                onClick={() => setPermissionLevel('EDIT_ACCESS')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                  permissionLevel === 'EDIT_ACCESS'
                    ? 'bg-amber-500/15 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                    : 'bg-slate-900/60 border-white/[0.06] hover:bg-slate-900 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${permissionLevel === 'EDIT_ACCESS' ? 'text-amber-300' : 'text-slate-200'}`}>
                    Edit Access
                  </span>
                  <div className={`w-2 h-2 rounded-full ${permissionLevel === 'EDIT_ACCESS' ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">View + Edit</p>
              </button>

              <button
                type="button"
                onClick={() => setPermissionLevel('FULL_MANAGEMENT')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                  permissionLevel === 'FULL_MANAGEMENT'
                    ? 'bg-emerald-500/15 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                    : 'bg-slate-900/60 border-white/[0.06] hover:bg-slate-900 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${permissionLevel === 'FULL_MANAGEMENT' ? 'text-emerald-300' : 'text-slate-200'}`}>
                    Full Management
                  </span>
                  <div className={`w-2 h-2 rounded-full ${permissionLevel === 'FULL_MANAGEMENT' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">View + Edit + Delete + Manage sharing</p>
              </button>
            </div>
          </div>

          {/* Configuration Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Expiration Select */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Link Expiration</span>
              </label>
              <select
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                className="glass-input text-xs font-semibold"
              >
                <option value="1h" className="bg-slate-900 text-white">1 Hour (High Security)</option>
                <option value="24h" className="bg-slate-900 text-white">24 Hours (Recommended)</option>
                <option value="7d" className="bg-slate-900 text-white">7 Days</option>
                <option value="1view" className="bg-slate-900 text-white">Self-Destruct (1-Time View)</option>
              </select>
            </div>

            {/* Optional Passcode / PIN */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <span>Access PIN / Passcode</span>
              </label>
              <input
                type="text"
                maxLength={6}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Optional 4-6 digit PIN"
                className="glass-input text-xs font-mono tracking-wider"
              />
            </div>
          </div>

          {/* Encrypted Shareable Link Box */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-indigo-500/25 flex flex-col gap-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span>Encrypted Shareable Link</span>
              </label>
              <button
                type="button"
                onClick={handleTestLink}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition group"
              >
                <ExternalLink className="w-3 h-3 group-hover:scale-110 transition-transform" />
                <span className="underline underline-offset-2">Preview Link</span>
              </button>
            </div>

            <div className="relative flex items-center">
              <div className="absolute left-3 text-indigo-400 pointer-events-none flex items-center justify-center">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                readOnly
                value={shareLink}
                onClick={(e) => e.target.select()}
                placeholder="Encrypted share link will appear here..."
                className="glass-input pl-9 pr-28 text-xs font-mono text-indigo-300 select-all border-indigo-500/30 bg-slate-950/80 hover:border-indigo-500/50 transition py-2.5 truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`absolute right-1.5 py-1.5 px-3.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition shrink-0 shadow-md ${
                  copiedLink
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'btn-primary hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between px-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> AES-256 Encrypted Payload
              </span>
              <span className="text-slate-500 font-mono text-[9px]">
                {sharePayloadStr ? `${sharePayloadStr.length} Chars` : 'End-to-End Encrypted'}
              </span>
            </div>
          </div>

          {/* Direct Email Sharing Form */}
          <form onSubmit={handleSendShareEmail} className="p-4 rounded-xl bg-slate-900/40 border border-white/[0.04] flex flex-col gap-3">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-cyan-400" />
              <span>Direct Secure Email Dispatch</span>
            </div>
            
            {emailSentSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Encrypted sharing notification {passcode.trim() ? '& access PIN details ' : ''}sent to {recipientEmail}!</span>
              </div>
            )}

            {emailNotice && (
              <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{emailNotice}</span>
              </div>
            )}

            {emailError && (
              <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{emailError}</span>
              </div>
            )}


            <div className="flex gap-2">
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="recipient@example.com"
                className="glass-input text-xs flex-1"
              />
              <button
                type="submit"
                disabled={sendingEmail}
                className="btn-secondary py-2 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:text-cyan-300 hover:border-cyan-500/30"
              >
                {sendingEmail ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security Best Practices Notice */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed font-medium">
              <strong className="font-bold text-amber-300">Security Recommendation:</strong> For maximum safety, send the passcode over a separate communication channel (e.g. Signal or SMS) than the secret link.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-white/[0.06] flex items-center justify-end bg-white/[0.01]">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary py-2 px-5 text-xs font-bold uppercase tracking-wider"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
