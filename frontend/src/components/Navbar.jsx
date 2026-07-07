import React, { useState, useRef, useEffect } from 'react';
import { KeyRound, Sun, Moon, LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';
import api from '../services/api';

const Navbar = ({ currentUser, onLogout, isLight, onThemeToggle, activeTab, onTabChange }) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogoutClick = async () => {
    try {
      await api.post('/auth/logout');
      if (onLogout) onLogout();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const formattedLastLogin = currentUser?.last_login
    ? new Date(currentUser.last_login).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: 'numeric'
      })
    : 'First session';

  return (
    <nav className={`sticky top-0 w-full z-50 backdrop-blur-md border-b transition-all duration-300 ${
      isLight 
        ? 'bg-white/80 border-slate-200/80 text-slate-800' 
        : 'bg-bgDeep/75 border-white/5 text-slate-100'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onTabChange('home')}>
            <div className="p-2 rounded-xl bg-accent/15 border border-accent/20 text-accent flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 animate-pulse">
                {/* Chat bubble body */}
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                {/* Lock body inside */}
                <rect x="9" y="9" width="6" height="4" rx="1" className="fill-accent/30" />
                {/* Lock shackle */}
                <path d="M10 9V8a2 2 0 0 1 4 0v1" />
              </svg>
            </div>
            <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-white via-accent-light to-accent bg-clip-text text-transparent">
              GOSSIPS
            </span>
            <div className="hidden sm:flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-success">
              <ShieldCheck className="w-2.5 h-2.5" /> SECURE
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <button 
              onClick={() => onTabChange('home')}
              className={`transition-colors hover:text-accent ${activeTab === 'home' ? 'text-accent font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Home
            </button>
            <button 
              onClick={() => onTabChange('features')}
              className={`transition-colors hover:text-accent ${activeTab === 'features' ? 'text-accent font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Features
            </button>
            {currentUser && (
              <button 
                onClick={() => onTabChange('dashboard')}
                className={`transition-colors hover:text-accent ${activeTab === 'dashboard' ? 'text-accent font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Dashboard
              </button>
            )}
          </div>

          {/* Right menu actions */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={onThemeToggle}
              className={`p-2 rounded-xl border transition-colors ${
                isLight 
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600' 
                  : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-400 hover:text-white'
              }`}
              title={isLight ? "Dark Mode" : "Light Mode"}
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Profile Dropdown or Auth buttons */}
            {currentUser ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className={`flex items-center gap-2 p-1.5 pr-3 rounded-xl border transition-colors ${
                    isLight 
                      ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' 
                      : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-accent text-white flex items-center justify-center font-bold text-xs uppercase shadow-accent-glow">
                    {currentUser.username.substring(0, 2)}
                  </div>
                  <span className="text-xs font-semibold max-w-[80px] truncate">{currentUser.username}</span>
                </button>

                {/* Dropdown Menu */}
                {profileOpen && (
                  <div className={`absolute right-0 mt-2 w-56 rounded-xl shadow-glass-glow border overflow-hidden transition-all duration-200 ${
                    isLight 
                      ? 'bg-white border-slate-200 text-slate-800' 
                      : 'bg-bgPanel border-white/5 text-slate-200'
                  }`}>
                    <div className="p-4 border-b border-white/5 space-y-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Signed in as</p>
                      <p className="font-semibold text-sm truncate">{currentUser.username}</p>
                      <p className="text-[9px] text-slate-500 truncate" title={currentUser.last_login}>
                        Last access: {formattedLastLogin}
                      </p>
                    </div>

                    <div className="p-2">
                      <button
                        onClick={handleLogoutClick}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-error hover:bg-error/10 hover:text-white transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onTabChange('login')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    isLight 
                      ? 'text-slate-700 hover:bg-slate-100' 
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => onTabChange('register')}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-accent text-white hover:bg-accent-hover shadow-accent-glow transition-all"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
