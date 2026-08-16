import React from 'react';
import { 
  KeyRound, 
  Star, 
  PlusCircle, 
  Layers,
  Upload,
  Download,
  Github,
  Briefcase,
  Share2
} from 'lucide-react';

export default function Sidebar({ 
  currentCategory, 
  setCurrentCategory, 
  showFavoritesOnly, 
  setShowFavoritesOnly,
  onAddNew,
  onOpenImport,
  onOpenExport,
  onOpenAudit,
  onOpenShare,
  itemCounts
}) {
  const categories = [
    { id: 'ALL', label: 'All Credentials', icon: Layers, count: itemCounts.all },
    { id: 'LOGIN', label: 'General Logins', icon: KeyRound, count: itemCounts.login },
    { id: 'GITHUB', label: 'GitHub Vault', icon: Github, count: itemCounts.github },
    { id: 'WORK', label: 'Work Accounts', icon: Briefcase, count: itemCounts.work },
    { id: 'SOCIAL', label: 'Social Media', icon: Share2, count: itemCounts.social },
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
    <aside className="w-64 shrink-0 border-r border-white/[0.05] bg-transparent h-[calc(100vh-69px)] sticky top-[69px] overflow-y-auto custom-scrollbar">
      <div className="p-4 pb-6 flex flex-col gap-4 min-h-full">
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

        {/* Security Workflows Menu */}
        <div className="flex flex-col gap-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2.5 select-none">
            Vault Workflows
          </div>

          <button
            onClick={onOpenShare}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide text-slate-400 border border-transparent hover:text-indigo-300 hover:bg-indigo-500/10 hover:border-indigo-500/20 transition duration-200"
          >
            <Share2 className="w-4 h-4 text-indigo-400" />
            <span>Share Credentials</span>
          </button>

          <button
            onClick={onOpenImport}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide text-slate-400 border border-transparent hover:text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-500/20 transition duration-200"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Import Credentials</span>
          </button>

          <button
            onClick={onOpenExport}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide text-slate-400 border border-transparent hover:text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition duration-200"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Vault</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

