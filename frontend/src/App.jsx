import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  CheckCircle, AlertTriangle, AlertCircle, Info, X, 
  ShieldCheck, Cpu, KeyRound, Sparkles, FolderLock
} from 'lucide-react';
import Navbar from './components/Navbar';
import ParticleBg from './components/ParticleBg';
import GlassCard from './components/GlassCard';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import RoomAccessPage from './pages/RoomAccessPage';
import Dashboard from './pages/Dashboard';
import api from './services/api';

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'features', 'login', 'register', 'dashboard'
  
  // Room states
  const [activeRoom, setActiveRoom] = useState(null);
  const [cryptoKey, setCryptoKey] = useState(null);
  const [roomPassword, setRoomPassword] = useState('');

  // Global UI states
  const [isLight, setIsLight] = useState(localStorage.getItem('theme') === 'light');
  const [toasts, setToasts] = useState([]);

  // Check user session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const response = await api.get('/auth/me');
        if (response.data.logged_in) {
          setCurrentUser(response.data.user);
        }
      } catch (err) {
        console.error("Session check failed:", err);
      } finally {
        setAuthChecked(true);
      }
    }
    checkSession();
  }, []);

  // Theme Syncing
  useEffect(() => {
    const root = document.documentElement;
    if (isLight) {
      root.classList.add('light');
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLight]);

  // Toast Handler
  const addToast = (message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Auth Callbacks
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    addToast(`Authenticated as ${user.username}.`, 'success');
    setActiveTab('home');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveRoom(null);
    setCryptoKey(null);
    setRoomPassword('');
    addToast("Session terminated.", "info");
    setActiveTab('home');
  };

  // Room Callbacks
  const handleRoomEnter = (room, key, password) => {
    setActiveRoom(room);
    setCryptoKey(key);
    setRoomPassword(password);
    addToast(`Secure connection established for Room: ${room.room_name}`, 'success');
    setActiveTab('dashboard');
  };

  const handleRoomLeave = () => {
    setActiveRoom(null);
    setCryptoKey(null);
    setRoomPassword('');
    addToast("Disconnected from room.", "info");
    setActiveTab('home');
  };

  if (!authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bgDeep text-slate-100">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold tracking-widest text-slate-400">CONNECTING TO SECURITY GATEWAY...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen animated-bg relative transition-colors duration-500 overflow-hidden ${
      isLight ? 'bg-slate-50 text-slate-800' : 'bg-bgDeep text-slate-100'
    }`}>
      
      {/* Background Particles */}
      <ParticleBg isLight={isLight} />

      {/* Global Navbar */}
      <Navbar 
        currentUser={currentUser}
        onLogout={handleLogout}
        isLight={isLight}
        onThemeToggle={() => setIsLight(!isLight)}
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'dashboard' && !activeRoom) {
            addToast("You must enter or create a room first.", "warning");
            return;
          }
          setActiveTab(tab);
        }}
      />

      {/* Main Pages Router (Framer Motion Transitions) */}
      <main className="relative min-h-[calc(100vh-4rem)]">
        <AnimatePresence mode="wait">
          
          {/* Landing/Home Tab */}
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <LandingPage 
                currentUser={currentUser}
                onRoomEnter={handleRoomEnter}
                onTabChange={setActiveTab}
                isLight={isLight}
              />
            </motion.div>
          )}

          {/* Features Tab */}
          {activeTab === 'features' && (
            <motion.div
              key="features"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-4xl mx-auto px-4 py-16 relative z-10 space-y-8"
            >
              <div className="text-center space-y-3">
                <div className="inline-flex p-3 rounded-2xl bg-accent/10 text-accent mb-2">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight">Security Features Spec</h2>
                <p className="text-sm text-slate-400 max-w-lg mx-auto">
                  A breakdown of the cryptographic standards and zero-knowledge mechanisms implemented.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <GlassCard isLight={isLight} className="p-6 space-y-3">
                  <div className="flex items-center gap-2 text-accent">
                    <KeyRound className="w-5 h-5" />
                    <h3 className="font-bold text-sm">PBKDF2 Key Derivation</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Derives 256-bit symmetric keys using 100,000 iterations of SHA-256 with the room ID acting as a salt. Key generation is performed natively inside your browser.
                  </p>
                </GlassCard>

                <GlassCard isLight={isLight} className="p-6 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <FolderLock className="w-5 h-5" />
                    <h3 className="font-bold text-sm">AES-GCM-256 Encryption</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Uses Authenticated Encryption with Associated Data (AEAD) to guarantee both confidentiality and integrity. If the file is altered by 1 bit on disk, decryption will fail.
                  </p>
                </GlassCard>

                <GlassCard isLight={isLight} className="p-6 space-y-3">
                  <div className="flex items-center gap-2 text-purple-400">
                    <Cpu className="w-5 h-5" />
                    <h3 className="font-bold text-sm">Web Crypto API Native Speed</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Runs at low-level hardware speeds without downloading heavy third-party libraries, providing responsive performance directly in standard browsers.
                  </p>
                </GlassCard>

                <GlassCard isLight={isLight} className="p-6 space-y-3">
                  <div className="flex items-center gap-2 text-amber-500">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="font-bold text-sm">Zero Server Metadata</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Filename bytes are encrypted using the same derived key and IV before uploading. The server's database holds only base64 cipher strings.
                  </p>
                </GlassCard>
              </div>
            </motion.div>
          )}

          {/* Login/Register Tabs */}
          {['login', 'register'].includes(activeTab) && (
            <motion.div
              key="auth"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <LoginPage 
                onLoginSuccess={handleLoginSuccess}
                isLight={isLight}
                initialTab={activeTab}
              />
            </motion.div>
          )}

          {/* Room Dashboard Tab */}
          {activeTab === 'dashboard' && activeRoom && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Dashboard 
                room={activeRoom}
                cryptoKey={cryptoKey}
                onLeave={handleRoomLeave}
                currentUser={currentUser}
                addToast={addToast}
                isLight={isLight}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            let icon = <Info className="w-4 h-4 text-accent" />;
            let borderStyle = 'border-slate-800 bg-slate-900/90';
            if (isLight) borderStyle = 'border-slate-200 bg-white/95';

            if (toast.type === 'success') {
              icon = <CheckCircle className="w-4 h-4 text-success" />;
              borderStyle += ' border-success/35';
            } else if (toast.type === 'warning') {
              icon = <AlertTriangle className="w-4 h-4 text-warning" />;
              borderStyle += ' border-warning/35';
            } else if (toast.type === 'error') {
              icon = <AlertCircle className="w-4 h-4 text-error" />;
              borderStyle += ' border-error/35';
            }

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className={`pointer-events-auto p-4 rounded-xl border flex items-center justify-between gap-3 shadow-lg backdrop-blur-md ${borderStyle}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="shrink-0">{icon}</div>
                  <p className="text-xs font-semibold leading-normal">{toast.message}</p>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-0.5 rounded-lg text-slate-400 hover:text-white transition-colors hover:bg-white/5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

    </div>
  );
};

export default App;
