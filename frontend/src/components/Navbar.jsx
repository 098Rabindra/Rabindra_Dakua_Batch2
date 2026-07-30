import React from 'react';
import { Shield, LogOut, User, Lock, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onOpenGenerator }) {
  const { user, logout, isVaultUnlocked } = useAuth();

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-slate-950/60 border-b border-white/[0.05] px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3 select-none">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-white/10">
          <Shield className="w-5.5 h-5.5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1">
              <span className="bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">PASSWORD</span>
              <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">VAULT</span>
            </h1>
            <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-bold px-2 py-0.5 rounded border border-indigo-500/20 tracking-wider">
              ZERO-KNOWLEDGE
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium tracking-wide">Vault & Security Management System</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Password Generator Button */}
        <button
          onClick={onOpenGenerator}
          className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-2 border border-white/5 hover:border-white/15"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Generator</span>
        </button>

        {/* Encryption Status Badge */}
        <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold tracking-wide uppercase ${
          isVaultUnlocked 
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
            : 'bg-amber-500/10 border-amber-500/25 text-amber-400'
        }`}>
          <Lock className="w-3 h-3" />
          <span>{isVaultUnlocked ? 'Vault Active' : 'Vault Locked'}</span>
        </div>

        {/* User Info & Logout */}
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-white/[0.08]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-300">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-semibold text-slate-200">{user.username}</div>
                <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{user.email}</div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Logout"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition duration-150"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
