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
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { vaultApi } from '../utils/api';
import { decryptPassword, calculatePasswordStrength } from '../utils/crypto';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import VaultItemModal from '../components/VaultItemModal';
import PasswordGeneratorModal from '../components/PasswordGeneratorModal';

export default function DashboardPage() {
  const { token, encryptionKey, isVaultUnlocked, unlockVault } = useAuth();

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
  const [editingItem, setEditingItem] = useState(null);

  // Unlock Master Password state (if re-entered)
  const [masterPassInput, setMasterPassInput] = useState('');
  const [unlockError, setUnlockError] = useState('');

  // Toast notification state
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Fetch Vault Items from API
  const fetchItems = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const data = await vaultApi.getItems(token, currentCategory, showFavoritesOnly);
      setVaultItems(data);
      
      // Decrypt items if vault key is available
      if (encryptionKey) {
        decryptAllItems(data, encryptionKey);
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
  }, [token, currentCategory, showFavoritesOnly, encryptionKey]);

  // Handle Master Password unlock submission if session restored without key
  const handleUnlockSubmit = async (e) => {
    e.preventDefault();
    setUnlockError('');
    const success = await unlockVault(masterPassInput);
    if (!success) {
      setUnlockError('Invalid Master Password');
    }
  };

  // Item counts for Sidebar
  const itemCounts = {
    all: vaultItems.length,
    login: vaultItems.filter(i => i.category === 'LOGIN').length,
    card: vaultItems.filter(i => i.category === 'CARD').length,
    note: vaultItems.filter(i => i.category === 'NOTE').length,
    identity: vaultItems.filter(i => i.category === 'IDENTITY').length,
    favorites: vaultItems.filter(i => i.favorite).length,
  };

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

  // Delete Vault Item
  const handleDeleteItem = async (id) => {
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

  // Filter items based on search query
  const filteredItems = vaultItems.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (item.title && item.title.toLowerCase().includes(term)) ||
      (item.username && item.username.toLowerCase().includes(term)) ||
      (item.url && item.url.toLowerCase().includes(term))
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
          itemCounts={itemCounts}
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

          {/* Locked Vault Prompt overlay if key is missing */}
          {!isVaultUnlocked && (
            <div className="glass-panel p-5 border-amber-500/20 bg-amber-500/[0.02] flex flex-col sm:flex-row items-center justify-between gap-4 mb-2 shadow-premium">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs tracking-wider text-amber-400 uppercase">Vault Session Locked</h4>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Enter your Master Password to derive your AES encryption key and view secrets.</p>
                </div>
              </div>
              <form onSubmit={handleUnlockSubmit} className="flex gap-2 w-full sm:w-auto shrink-0">
                <input
                  type="password"
                  required
                  value={masterPassInput}
                  onChange={(e) => setMasterPassInput(e.target.value)}
                  placeholder="Master Password"
                  className="glass-input text-xs py-2 w-48 font-mono border border-white/5"
                />
                <button type="submit" className="btn-primary text-xs py-2 px-4 whitespace-nowrap hover:scale-[1.01] active:scale-[0.99] transition">
                  Unlock
                </button>
              </form>
              {unlockError && <div className="text-xs text-rose-400 font-medium">{unlockError}</div>}
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
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-indigo-400 group-hover:border-indigo-500/20 group-hover:text-indigo-300 transition duration-300">
                          <KeyRound className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-200 text-xs tracking-wide truncate max-w-[140px] mb-1">
                            {item.title}
                          </h4>
                          <span className={`badge badge-${(item.category || 'LOGIN').toLowerCase()} text-[9px] font-bold px-2 py-0.5 rounded-full`}>
                            {item.category}
                          </span>
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
                    </div>

                    {/* Footer Controls */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] z-10">
                      {/* Strength indicator */}
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: str.color }} />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{str.label}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingItem({ ...item, decryptedPassword: plainPass });
                            setIsVaultModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-transparent text-slate-500 hover:text-slate-200 hover:bg-white/[0.03] transition"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 rounded-lg border border-transparent text-slate-500 hover:text-rose-400 hover:bg-white/[0.03] transition"
                          title="Delete"
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
    </div>
  );
}
