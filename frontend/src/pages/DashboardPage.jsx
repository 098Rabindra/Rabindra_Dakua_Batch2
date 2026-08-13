import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Star, 
  Copy, 
  Eye, 
  EyeOff, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  KeyRound, 
  Lock, 
  ShieldCheck, 
  RefreshCw,
  Info,
  CreditCard,
  FileText,
  UserCheck,
  Shield,
  Github,
  Globe,
  Briefcase,
  Share2,
  Code
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { vaultApi, authApi } from '../utils/api';
import { decryptPassword, deriveKey, encryptPassword, calculatePasswordStrength } from '../utils/crypto';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import VaultItemModal from '../components/VaultItemModal';
import PasswordGeneratorModal from '../components/PasswordGeneratorModal';
import ExportVaultModal from '../components/ExportVaultModal';
import ImportVaultModal from '../components/ImportVaultModal';
import SecurityAuditModal from '../components/SecurityAuditModal';
import ShareCredentialModal from '../components/ShareCredentialModal';

export default function DashboardPage() {
  const { user, token, encryptionKey, isVaultUnlocked, unlockVault } = useAuth();

  const [vaultItems, setVaultItems] = useState([]);
  const [decryptedMap, setDecryptedMap] = useState({});
  const [visibleMap, setVisibleMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [currentCategory, setCurrentCategory] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Modal state
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareTargetItem, setShareTargetItem] = useState(null);
  const [shareTargetPassword, setShareTargetPassword] = useState('');
  const [editingItem, setEditingItem] = useState(null);

  const handleOpenShare = (itemToShare) => {
    const target = itemToShare || (vaultItems.length > 0 ? vaultItems[0] : null);
    if (!target) {
      showToast('No vault items available to share');
      return;
    }
    // System Permission Check: Only Full Management (or owner) can manage sharing
    if (target.permissionLevel === 'VIEW_ONLY' || target.permissionLevel === 'EDIT_ACCESS') {
      showToast('Permission Denied: Only Full Management permission can manage sharing.');
      return;
    }
    const plain = decryptedMap[target.id] || '';
    setShareTargetItem(target);
    setShareTargetPassword(plain);
    setIsShareOpen(true);
  };

  // Unlock Master Password state (if re-entered)
  const [masterPassInput, setMasterPassInput] = useState('');
  const [showMasterPassInput, setShowMasterPassInput] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Fetch Vault Items from API (always fetch all user items for complete folder counts)
  const fetchItems = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const data = await vaultApi.getItems(token);
      if (Array.isArray(data)) {
        setVaultItems(data);
        if (encryptionKey) {
          decryptAllItems(data, encryptionKey);
        }
      } else {
        setVaultItems([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load vault credentials');
    } finally {
      setLoading(false);
    }
  };

  const decryptAllItems = async (items, key) => {
    const map = {};
    for (const item of items) {
      if (item.encryptedPassword && item.iv) {
        const plain = await decryptPassword(item.encryptedPassword, item.iv, key);
        map[item.id] = plain;
      }
    }
    setDecryptedMap(map);
  };

  useEffect(() => {
    fetchItems();
  }, [token, encryptionKey]);

  // Handle Master Password unlock submission if session restored without key
  const handleUnlockSubmit = async (e) => {
    e.preventDefault();
    setUnlockError('');
    if (!masterPassInput || unlocking) return;

    setUnlocking(true);
    try {
      let freshToken = null;

      // 1. Verify Master Password against backend auth endpoint if email exists
      if (user?.email) {
        try {
          const authRes = await authApi.login({ email: user.email, password: masterPassInput });
          if (authRes && authRes.token) {
            freshToken = authRes.token;
          }
        } catch (apiErr) {
          setUnlockError('Incorrect Master Password. Please enter your correct password.');
          setUnlocking(false);
          return;
        }
      }

      // 2. Derive key and verify item decryption if items exist
      const derivedKey = await deriveKey(masterPassInput, user?.email || 'PasswordVaultSalt');

      // 3. Unlock vault in AuthContext with freshToken if available
      const success = await unlockVault(masterPassInput, freshToken);
      if (!success) {
        setUnlockError('Incorrect Master Password');
      } else {
        setMasterPassInput('');
        showToast('Vault session unlocked!');
        // Immediately fetch vault items using fresh token or active token
        const activeToken = freshToken || token;
        if (activeToken) {
          try {
            const data = await vaultApi.getItems(activeToken);
            setVaultItems(data);
            decryptAllItems(data, derivedKey);
          } catch (e) {
            console.warn('Failed to load items post unlock:', e);
          }
        }
      }
    } catch (err) {
      setUnlockError(err.message || 'Incorrect Master Password');
    } finally {
      setUnlocking(false);
    }
  };

  // Item counts for Sidebar
  const itemCounts = {
    all: vaultItems.length,
    login: vaultItems.filter(i => i.category === 'LOGIN').length,
    github: vaultItems.filter(i => i.category === 'GITHUB').length,
    work: vaultItems.filter(i => i.category === 'WORK').length,
    social: vaultItems.filter(i => i.category === 'SOCIAL').length,
    favorites: vaultItems.filter(i => i.favorite).length,
  };

  // Calculate dynamic security score based on items
  const securityHealthScore = React.useMemo(() => {
    if (!vaultItems || vaultItems.length === 0) return 0;
    let totalScore = 0;
    let count = 0;
    for (const item of vaultItems) {
      const plain = decryptedMap[item.id];
      if (plain) {
        totalScore += calculatePasswordStrength(plain).score;
        count++;
      }
    }
    return count > 0 ? Math.round(totalScore / count) : 85;
  }, [vaultItems, decryptedMap]);

  // Save (Create/Update) Vault Item
  const handleSaveItem = async (payload, id) => {
    if (id) {
      await vaultApi.updateItem(id, payload, token);
      showToast('Vault item updated successfully!');
    } else {
      await vaultApi.createItem(payload, token);
      showToast('New credential added to vault!');
    }
    await fetchItems();
  };

  // Save item with custom secret override (used in Security Audit auto-rotation)
  const handleSaveItemWithSecret = async (payload, id, secretOverride) => {
    if (secretOverride && encryptionKey) {
      const { encryptedPassword, iv } = await encryptPassword(secretOverride, encryptionKey);
      payload.encryptedPassword = encryptedPassword;
      payload.iv = iv;
    }
    await handleSaveItem(payload, id);
  };

  // Import item handler
  const handleImportSingleItem = async (payload) => {
    await vaultApi.createItem(payload, token);
    await fetchItems();
  };

  // Delete Vault Item
  const handleDeleteItem = async (id) => {
    const item = vaultItems.find((i) => i.id === id);
    // System Permission Check: Only Full Management (or owner) can delete credentials
    if (item && (item.permissionLevel === 'VIEW_ONLY' || item.permissionLevel === 'EDIT_ACCESS')) {
      showToast('Permission Denied: Only Full Management permission can delete credentials.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this credential?')) {
      try {
        await vaultApi.deleteItem(id, token);
        showToast('Credential deleted from vault');
        fetchItems();
      } catch (err) {
        alert(err.message || 'Failed to delete credential');
      }
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (id) => {
    try {
      await vaultApi.toggleFavorite(id, token);
      fetchItems();
    } catch (err) {
      console.error(err);
    }
  };

  // Copy to Clipboard helper
  const handleCopyText = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`);
  };

  // Toggle Password visibility
  const toggleVisibility = (id) => {
    setVisibleMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter items based on active category, favorite filter, and search query
  const filteredItems = vaultItems.filter((item) => {
    if (currentCategory && item.category !== currentCategory) return false;
    if (showFavoritesOnly && !item.favorite) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (item.title && item.title.toLowerCase().includes(term)) ||
      (item.username && item.username.toLowerCase().includes(term)) ||
      (item.url && item.url.toLowerCase().includes(term)) ||
      (item.notes && item.notes.toLowerCase().includes(term))
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-slate-100 font-sans">
      <Navbar onOpenGenerator={() => setIsGeneratorOpen(true)} />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 glass-panel px-4 py-3 border-indigo-500/40 text-indigo-200 font-semibold text-xs shadow-premium flex items-center gap-2 animate-pulse bg-indigo-950/80">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex flex-1">
        <Sidebar
          currentCategory={currentCategory}
          setCurrentCategory={setCurrentCategory}
          showFavoritesOnly={showFavoritesOnly}
          setShowFavoritesOnly={setShowFavoritesOnly}
          onAddNew={() => {
            setEditingItem(null);
            setIsVaultModalOpen(true);
          }}
          onOpenImport={() => setIsImportOpen(true)}
          onOpenExport={() => setIsExportOpen(true)}
          onOpenAudit={() => setIsAuditOpen(true)}
          onOpenShare={() => handleOpenShare(null)}
          itemCounts={itemCounts}
          securityHealthScore={securityHealthScore}
        />

        {/* Content Area */}
        <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
          {/* Top Bar: Search & Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-96 flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search credentials, websites, notes..."
                className="glass-input pl-11 text-xs"
              />
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <button
                onClick={fetchItems}
                className="btn-secondary py-2 px-3 text-xs border border-white/5 flex items-center gap-2 hover:border-white/10"
                title="Refresh Vault"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync</span>
              </button>

              <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                Showing <span className="text-white font-bold">{filteredItems.length}</span> items
              </div>
            </div>
          </div>

          {/* API Error Notification Banner */}
          {error && (
            <div className="glass-panel p-4 border-rose-500/30 bg-rose-500/[0.05] flex items-center justify-between gap-4 mb-2 shadow-premium animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs tracking-wider text-rose-300 uppercase">Vault Synchronization Error</h4>
                  <p className="text-xs text-slate-300 mt-0.5">{error}</p>
                </div>
              </div>
              <button
                onClick={fetchItems}
                className="btn-secondary py-1.5 px-3 text-xs border border-rose-500/30 text-rose-200 hover:bg-rose-500/20 whitespace-nowrap"
              >
                Retry Sync
              </button>
            </div>
          )}

          {/* Locked Vault Prompt overlay if key is missing */}
          {!isVaultUnlocked && (
            <div className="glass-panel p-5 border-amber-500/20 bg-amber-500/[0.02] flex flex-col gap-3 mb-2 shadow-premium">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs tracking-wider text-amber-400 uppercase">Vault Session Locked</h4>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Enter your Master Password to derive your AES encryption key and view secrets.</p>
                  </div>
                </div>
                <form onSubmit={handleUnlockSubmit} className="flex gap-2 w-full sm:w-auto shrink-0 items-center">
                  <div className="relative flex items-center">
                    <input
                      type={showMasterPassInput ? 'text' : 'password'}
                      required
                      value={masterPassInput}
                      onChange={(e) => {
                        setMasterPassInput(e.target.value);
                        if (unlockError) setUnlockError('');
                      }}
                      placeholder="Master Password"
                      className={`glass-input text-xs py-2 w-48 font-mono border pr-9 ${unlockError ? 'border-rose-500/60 text-rose-200 focus:border-rose-500' : 'border-white/5'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowMasterPassInput(!showMasterPassInput)}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-200 transition focus:outline-none"
                      title={showMasterPassInput ? 'Hide Password' : 'Show Password'}
                    >
                      {showMasterPassInput ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={unlocking}
                    className="btn-primary text-xs py-2 px-4 whitespace-nowrap hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50"
                  >
                    {unlocking ? 'Verifying...' : 'Unlock'}
                  </button>
                </form>
              </div>
              {unlockError && (
                <div className="flex items-center gap-2.5 text-xs text-rose-200 font-bold bg-rose-500/15 px-3.5 py-2.5 rounded-xl border border-rose-500/30 shadow-md animate-fadeIn">
                  <Info className="w-4 h-4 text-rose-300 shrink-0" />
                  <span>{unlockError}</span>
                </div>
              )}
            </div>
          )}

          {/* Grid of Vault Items */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center min-h-[300px]">
              <div className="flex items-center gap-3 text-indigo-400 font-bold tracking-wide text-sm">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Loading Secure Vault Credentials...</span>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex-1 glass-panel p-12 flex flex-col items-center justify-center text-center border-dashed border-white/[0.08] bg-white/[0.01]">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-500 mb-4 shadow-lg">
                <KeyRound className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-base text-slate-200 mb-1 tracking-wide">No Credentials Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
                {searchTerm ? 'No items match your search term.' : 'Your secure vault is empty. Click below to add your first password or card.'}
              </p>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setIsVaultModalOpen(true);
                }}
                className="btn-primary text-xs py-2.5 px-5 tracking-wide font-bold uppercase"
              >
                <Plus className="w-4 h-4" />
                <span>Add Credential</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredItems.map((item) => {
                const plainPass = decryptedMap[item.id] || '';
                const isVisible = visibleMap[item.id];
                const str = calculatePasswordStrength(plainPass);

                // Category Icon and Styling helper
                const getCategoryMeta = (cat) => {
                  switch (cat) {
                    case 'GITHUB':
                      return { icon: Github, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20 text-purple-300' };
                    case 'GOOGLE':
                      return { icon: Globe, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20 text-sky-300' };
                    case 'WORK':
                      return { icon: Briefcase, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20 text-amber-300' };
                    case 'SOCIAL':
                      return { icon: Share2, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20 text-pink-300' };
                    case 'API_KEY':
                      return { icon: Code, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' };
                    case 'CARD':
                      return { icon: CreditCard, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300' };
                    case 'NOTE':
                      return { icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20 text-amber-300' };
                    case 'IDENTITY':
                      return { icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' };
                    default:
                      return { icon: KeyRound, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' };
                  }
                };

                const catMeta = getCategoryMeta(item.category);
                const CategoryIcon = catMeta.icon;

                return (
                  <div
                    key={item.id}
                    className="glass-panel p-5 flex flex-col justify-between gap-4 border-white/[0.04] hover:border-indigo-500/30 transition-all duration-300 group shadow-lg hover:shadow-premium-glow relative overflow-hidden"
                  >
                    {/* Background faint glow */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none transition group-hover:bg-indigo-500/10" />

                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 z-10">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center ${catMeta.color} group-hover:border-indigo-500/20 transition duration-300`}>
                          <CategoryIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${catMeta.bg}`}>
                              {item.category || 'LOGIN'}
                            </span>
                            {item.permissionLevel && item.permissionLevel !== 'FULL_MANAGEMENT' && (
                              <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                                item.permissionLevel === 'VIEW_ONLY'
                                  ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              }`}>
                                {item.permissionLevel === 'VIEW_ONLY' ? 'View Only' : 'Edit Access'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleFavorite(item.id)}
                        className={`p-1.5 rounded-lg transition duration-200 ${
                          item.favorite
                            ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                            : 'text-slate-600 border border-transparent hover:text-slate-400 hover:bg-white/[0.04]'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${item.favorite ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>

                    {/* Content Fields */}
                    <div className="flex flex-col gap-2 my-1 z-10">
                      {/* Username */}
                      {item.username && (
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/40 border border-white/[0.03] hover:border-white/[0.08] transition duration-200">
                          <div className="text-xs text-slate-300 font-medium truncate max-w-[190px]">
                            {item.username}
                          </div>
                          <button
                            onClick={() => handleCopyText(item.username, 'username')}
                            className="p-1 text-slate-500 hover:text-slate-200 transition"
                            title="Copy Username"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Decrypted Secret Field */}
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/40 border border-white/[0.03] hover:border-white/[0.08] transition duration-200">
                        <div className="font-mono text-xs text-cyan-400 truncate max-w-[170px] tracking-wider">
                          {isVisible ? plainPass || '••••••••' : '••••••••••••••••'}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleVisibility(item.id)}
                            className="p-1 text-slate-500 hover:text-slate-200 transition"
                            title={isVisible ? 'Hide Password' : 'Show Password'}
                          >
                            {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleCopyText(plainPass, 'password')}
                            className="p-1 text-indigo-400 hover:text-indigo-300 transition"
                            title="Copy Password"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* URL */}
                      {item.url && (
                        <a
                          href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 truncate max-w-[220px] font-medium tracking-wide mt-1.5 transition"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{item.url}</span>
                        </a>
                      )}

                      {/* Notes */}
                      {item.notes && (
                        <div className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-slate-900/40 border border-white/[0.03] mt-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <span>Notes</span>
                            <button
                              onClick={() => handleCopyText(item.notes, 'notes')}
                              className="p-0.5 text-slate-500 hover:text-slate-200 transition"
                              title="Copy Notes"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-300 whitespace-pre-wrap font-sans break-words max-h-20 overflow-y-auto leading-relaxed">
                            {item.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer Controls */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] z-10">
                      {/* Strength indicator */}
                      <div className="flex items-center gap-1.5">
                        <div 
                          className="w-1.5 h-1.5 rounded-full" 
                          style={{ backgroundColor: plainPass ? str.color : '#06b6d4' }} 
                        />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          {plainPass ? str.label : 'AES-256 Protected'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenShare(item)}
                          className={`p-1.5 rounded-lg border border-transparent transition ${
                            item.permissionLevel === 'VIEW_ONLY' || item.permissionLevel === 'EDIT_ACCESS'
                              ? 'text-slate-600 cursor-not-allowed opacity-50'
                              : 'text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10'
                          }`}
                          title={
                            item.permissionLevel === 'VIEW_ONLY' || item.permissionLevel === 'EDIT_ACCESS'
                              ? 'Manage Sharing (Denied: Full Management Required)'
                              : 'Share Credential'
                          }
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingItem({ ...item, decryptedPassword: plainPass });
                            setIsVaultModalOpen(true);
                          }}
                          className={`p-1.5 rounded-lg border border-transparent transition ${
                            item.permissionLevel === 'VIEW_ONLY'
                              ? 'text-sky-400/80 hover:text-sky-300 hover:bg-sky-500/10'
                              : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.03]'
                          }`}
                          title={item.permissionLevel === 'VIEW_ONLY' ? 'View Credential Details (View Only)' : 'Edit Credential'}
                        >
                          {item.permissionLevel === 'VIEW_ONLY' ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className={`p-1.5 rounded-lg border border-transparent transition ${
                            item.permissionLevel === 'VIEW_ONLY' || item.permissionLevel === 'EDIT_ACCESS'
                              ? 'text-slate-600 cursor-not-allowed opacity-50'
                              : 'text-slate-500 hover:text-rose-400 hover:bg-white/[0.03]'
                          }`}
                          title={
                            item.permissionLevel === 'VIEW_ONLY' || item.permissionLevel === 'EDIT_ACCESS'
                              ? 'Delete Credential (Denied: Full Management Required)'
                              : 'Delete'
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <VaultItemModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
        onSave={handleSaveItem}
        initialData={editingItem}
      />

      <PasswordGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
      />

      <ExportVaultModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        vaultItems={vaultItems}
        decryptedMap={decryptedMap}
      />

      <ImportVaultModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportItems={handleImportSingleItem}
      />

      <SecurityAuditModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        vaultItems={vaultItems}
        decryptedMap={decryptedMap}
        onSaveItem={handleSaveItemWithSecret}
        onAddNew={() => {
          setIsAuditOpen(false);
          setEditingItem(null);
          setIsVaultModalOpen(true);
        }}
      />

      <ShareCredentialModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        item={shareTargetItem}
        decryptedPassword={shareTargetPassword}
        vaultItems={vaultItems}
        decryptedMap={decryptedMap}
      />
    </div>
  );
}
