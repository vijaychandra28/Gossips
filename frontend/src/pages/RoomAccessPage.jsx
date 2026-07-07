import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Lock, ShieldAlert, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import { deriveKey } from '../services/crypto';
import GlassCard from '../components/GlassCard';

const RoomAccessPage = ({ roomId, onAccessGranted, onBack, isLight }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Password is required to decrypt this room.');
      return;
    }

    setLoading(true);
    try {
      // Verify password with backend and authorize session
      const response = await api.post('/rooms/join', {
        room_id: roomId,
        password: password
      });

      const room = response.data.room;
      
      // Derive E2E AES decryption key on the client side
      const cryptoKey = await deriveKey(password, room.id);
      
      // Grant access
      onAccessGranted(room, cryptoKey, password);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Incorrect password or connection failed.');
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
        <GlassCard isLight={isLight} className="p-8 space-y-6 border-amber-500/25">
          <button 
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return Home</span>
          </button>

          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-500 mb-2">
              <KeyRound className="w-8 h-8 animate-bounce" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Decryption Authorization Required</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Room <code className="px-1.5 py-0.5 rounded bg-black/35 font-mono text-amber-400">{roomId}</code> is locked. 
              Enter the room password to derive the local decryption key.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-xs text-error flex items-center gap-2 font-medium">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Room Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  placeholder="Enter encryption password"
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
              className="w-full flex items-center justify-center gap-2 py-3 mt-2 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Derive Key & Enter</span>
              )}
            </button>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default RoomAccessPage;
