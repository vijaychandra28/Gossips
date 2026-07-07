import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, LogIn, ShieldAlert, ArrowRight, Sparkles, Server } from 'lucide-react';
import Hero3D from '../components/Hero3D';
import GlassCard from '../components/GlassCard';
import api from '../services/api';
import { deriveKey } from '../services/crypto';

const LandingPage = ({ currentUser, onRoomEnter, onTabChange, isLight }) => {
  const [action, setAction] = useState(''); // 'create' or 'join'
  const [roomName, setRoomName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      onTabChange('login');
      return;
    }
    
    setError('');
    const cleanRoomName = roomName.trim();
    if (!cleanRoomName) {
      setError('Please provide a room name.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/rooms/create', {
        room_name: cleanRoomName,
        password: roomPassword
      });
      
      const room = response.data.room;
      // Derive CryptoKey client-side immediately
      const cryptoKey = await deriveKey(roomPassword, room.id);
      
      onRoomEnter(room, cryptoKey, roomPassword);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to create room.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      onTabChange('login');
      return;
    }

    setError('');
    const cleanRoomId = roomId.trim();
    if (!cleanRoomId) {
      setError('Please enter a Room ID.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/rooms/join', {
        room_id: cleanRoomId,
        password: roomPassword
      });

      const room = response.data.room;
      const cryptoKey = await deriveKey(roomPassword, room.id);

      onRoomEnter(room, cryptoKey, roomPassword);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Could not access room. Ensure ID and Password are correct.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10 space-y-20">
      
      {/* Hero section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Hero Text */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6 text-left"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-xs font-bold text-accent">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zero-Knowledge Architecture</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-none text-slate-100">
            Share Files <span className="bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">Securely.</span><br />
            Instantly.
          </h1>
          
          <p className="text-base sm:text-lg text-slate-400 max-w-xl font-light">
            A modern and secure platform to share files privately with encrypted transfers.
            Files are locked with client-side AES-256-GCM prior to transmission, ensuring complete privacy.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={() => currentUser ? setAction('create') : onTabChange('login')}
              className="flex items-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-xl bg-accent text-white hover:bg-accent-hover shadow-accent-glow active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Secure Room</span>
            </button>
            
            <button
              onClick={() => currentUser ? setAction('join') : onTabChange('login')}
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-xl border active:scale-95 transition-all ${
                isLight 
                  ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' 
                  : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Join Room</span>
            </button>
          </div>

          {!currentUser && (
            <p className="text-xs text-slate-500 italic">
              * Identity authentication is required to create or join private rooms.
            </p>
          )}
        </motion.div>

        {/* Hero 3D Animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="w-full h-[350px] md:h-[450px]"
        >
          <Hero3D isLight={isLight} />
        </motion.div>
      </div>

      {/* Action modal area */}
      <AnimatePresence mode="wait">
        {action && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-xl mx-auto"
          >
            <GlassCard isLight={isLight} className="p-6 md:p-8 space-y-6 relative border-accent/25">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-lg font-bold">
                  {action === 'create' ? 'Assemble a New Secure Room' : 'Initiate Secure Connection'}
                </h3>
                <button 
                  onClick={() => { setAction(''); setError(''); }}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  Cancel
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-xs text-error flex items-center gap-2 font-medium">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {action === 'create' ? (
                <form onSubmit={handleCreateRoom} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Room Designation</label>
                    <input
                      type="text"
                      placeholder="e.g. Confidential Financial Audit"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      className={`w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-1 focus:ring-accent transition-colors ${
                        isLight 
                          ? 'bg-slate-50 border-slate-200 text-slate-800' 
                          : 'bg-black/25 border-slate-700/50 text-slate-100 placeholder-slate-500'
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Encryption Password</label>
                      <span className="text-[9px] text-accent font-semibold">(Required for E2EE key derivation)</span>
                    </div>
                    <input
                      type="password"
                      placeholder="Enter a secret password"
                      value={roomPassword}
                      onChange={(e) => setRoomPassword(e.target.value)}
                      className={`w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-1 focus:ring-accent transition-colors ${
                        isLight 
                          ? 'bg-slate-50 border-slate-200 text-slate-800' 
                          : 'bg-black/25 border-slate-700/50 text-slate-100 placeholder-slate-500'
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 mt-4 text-xs font-semibold rounded-xl bg-accent text-white hover:bg-accent-hover active:scale-95 shadow-accent-glow transition-all"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Verify & Create Room</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleJoinRoom} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Room Coordinate ID</label>
                    <input
                      type="text"
                      placeholder="e.g. f67a213e"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      className={`w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-1 focus:ring-accent transition-colors ${
                        isLight 
                          ? 'bg-slate-50 border-slate-200 text-slate-800' 
                          : 'bg-black/25 border-slate-700/50 text-slate-100 placeholder-slate-500'
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Room Password</label>
                      <span className="text-[9px] text-accent font-semibold">(Needed to derive the AES decryption key)</span>
                    </div>
                    <input
                      type="password"
                      placeholder="Enter the room's password"
                      value={roomPassword}
                      onChange={(e) => setRoomPassword(e.target.value)}
                      className={`w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-1 focus:ring-accent transition-colors ${
                        isLight 
                          ? 'bg-slate-50 border-slate-200 text-slate-800' 
                          : 'bg-black/25 border-slate-700/50 text-slate-100 placeholder-slate-500'
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 mt-4 text-xs font-semibold rounded-xl bg-accent text-white hover:bg-accent-hover active:scale-95 shadow-accent-glow transition-all"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Connect to Room</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info card details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10">
        <GlassCard isLight={isLight} className="p-6 space-y-2 border-white/5 hover:border-accent/15">
          <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold mb-2">
            E2E
          </div>
          <h4 className="font-bold text-sm">Client-side AES-256-GCM</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Files are cryptographically sealed in the browser. The database only sees random binary hashes, and raw keys never hit our server.
          </p>
        </GlassCard>

        <GlassCard isLight={isLight} className="p-6 space-y-2 border-white/5 hover:border-accent/15">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-success flex items-center justify-center font-bold mb-2">
            0K
          </div>
          <h4 className="font-bold text-sm">Zero Metadata Leakage</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Original filenames are encrypted on the client side. The server has no knowledge of what files are in the rooms.
          </p>
        </GlassCard>

        <GlassCard isLight={isLight} className="p-6 space-y-2 border-white/5 hover:border-accent/15">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold mb-2">
            500
          </div>
          <h4 className="font-bold text-sm">500MB Size Limit</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Share multi-gigabyte structures across multiple files (up to 20 files at once) without bloating server capacity.
          </p>
        </GlassCard>
      </div>
    </div>
  );
};

export default LandingPage;
