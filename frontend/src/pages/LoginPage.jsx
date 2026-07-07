import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import GlassCard from '../components/GlassCard';

const LoginPage = ({ onLoginSuccess, isLight, initialTab = 'login' }) => {
  const [activeTab, setActiveTab] = useState(initialTab); // 'login' or 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (activeTab === 'register') {
      if (cleanUsername.length < 3) {
        setError('Username must be at least 3 characters.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
    }

    setLoading(true);

    try {
      if (activeTab === 'login') {
        const response = await api.post('/auth/login', {
          username: cleanUsername,
          password: password
        });
        
        onLoginSuccess(response.data.user);
      } else {
        const response = await api.post('/auth/register', {
          username: cleanUsername,
          password: password
        });
        setSuccessMsg(response.data.message);
        setActiveTab('login');
        setPassword('');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <GlassCard isLight={isLight} className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-accent/10 text-accent mb-2">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              {activeTab === 'login' ? 'Access Gate' : 'Establish Identity'}
            </h2>
            <p className="text-xs text-slate-400">
              {activeTab === 'login' 
                ? 'Authenticate your credentials to access encrypted rooms' 
                : 'Create secure login coordinates to share files'}
            </p>
          </div>

          {/* Tab selector */}
          <div className="flex rounded-lg bg-black/20 p-1">
            <button
              onClick={() => { setActiveTab('login'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'login' 
                  ? 'bg-accent text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setActiveTab('register'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'register' 
                  ? 'bg-accent text-white shadow' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-xs text-error font-medium">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-xs text-success font-medium">
                {successMsg}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="admin_secure"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-1 focus:ring-accent transition-colors ${
                    isLight 
                      ? 'bg-slate-50 border-slate-200 text-slate-800' 
                      : 'bg-black/25 border-slate-700/50 text-slate-100 placeholder-slate-500'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-1 focus:ring-accent transition-colors ${
                    isLight 
                      ? 'bg-slate-50 border-slate-200 text-slate-800' 
                      : 'bg-black/25 border-slate-700/50 text-slate-100 placeholder-slate-500'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 mt-4 text-xs font-semibold rounded-xl bg-accent text-white hover:bg-accent-hover active:scale-95 shadow-accent-glow transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{activeTab === 'login' ? 'Authenticate' : 'Register Credentials'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default LoginPage;
