import React from 'react';
import { 
  KeyRound, 
  Star, 
  CreditCard, 
  FileText, 
  UserCheck, 
  PlusCircle, 
  ShieldCheck, 
  Layers 
} from 'lucide-react';

export default function Sidebar({ 
  currentCategory, 
  setCurrentCategory, 
  showFavoritesOnly, 
  setShowFavoritesOnly,
  onAddNew,
  itemCounts 
}) {
  const categories = [
    { id: 'ALL', label: 'All Items', icon: Layers, count: itemCounts.all },
    { id: 'LOGIN', label: 'Logins & Passwords', icon: KeyRound, count: itemCounts.login },
    { id: 'CARD', label: 'Payment Cards', icon: CreditCard, count: itemCounts.card },
    { id: 'NOTE', label: 'Secure Notes', icon: FileText, count: itemCounts.note },
    { id: 'IDENTITY', label: 'Identities', icon: UserCheck, count: itemCounts.identity },
  ];

  const handleCategoryClick = (catId) => {
    setShowFavoritesOnly(false);
    setCurrentCategory(catId === 'ALL' ? '' : catId);
  };

  const handleFavoriteClick = () => {
    setShowFavoritesOnly(true);
    setCurrentCategory('');
  };

  return (
    <aside className="w-64 shrink-0 p-4 border-r border-white/[0.05] flex flex-col gap-6 bg-transparent min-h-[calc(100vh-61px)]">
      {/* Add New Item Button */}
      <button
        onClick={onAddNew}
        className="btn-primary w-full py-3 text-xs uppercase tracking-wider font-bold shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99]"
      >
        <PlusCircle className="w-4.5 h-4.5" />
        <span>Add Credential</span>
      </button>

      {/* Main Vault Categories */}
      <div className="flex flex-col gap-1">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2.5 select-none">
          Vault Folders
        </div>

        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = !showFavoritesOnly && (
            (cat.id === 'ALL' && !currentCategory) || 
            (cat.id === currentCategory)
          );

          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 border ${
                isActive
                  ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 shadow-[inset_0_1px_1px_rgba(99,102,241,0.1)]'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{cat.label}</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                isActive ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-900 border border-white/5 text-slate-500'
              }`}>
                {cat.count || 0}
              </span>
            </button>
          );
        })}

        {/* Favorites Item */}
        <button
          onClick={handleFavoriteClick}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 border mt-1 ${
            showFavoritesOnly
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/20 shadow-[inset_0_1px_1px_rgba(245,158,11,0.1)]'
              : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/[0.03]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Star className={`w-4 h-4 ${showFavoritesOnly ? 'text-amber-400 fill-amber-400/10' : 'text-slate-400'}`} />
            <span>Favorites</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
            showFavoritesOnly ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-900 border border-white/5 text-slate-500'
          }`}>
            {itemCounts.favorites || 0}
          </span>
        </button>
      </div>

      {/* Security Health Summary */}
      <div className="mt-auto glass-panel p-4 rounded-xl border-white/[0.04] bg-white/[0.01]">
        <div className="flex items-center gap-2 mb-2.5 text-indigo-400 select-none">
          <ShieldCheck className="w-4 h-4" />
          <span className="font-bold text-[10px] uppercase tracking-wider text-slate-300">Vault Security Status</span>
        </div>
        <div className="w-full bg-slate-900 border border-white/5 h-2 rounded-full overflow-hidden mb-2.5">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(100, (itemCounts.all > 0 ? 85 : 0))}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] font-semibold">
          <span className="text-slate-500">Encryption Level</span>
          <span className="text-emerald-400 font-bold">{itemCounts.all > 0 ? 'AES-256 (Optimal)' : 'Vault Empty'}</span>
        </div>
      </div>
    </aside>
  );
}
