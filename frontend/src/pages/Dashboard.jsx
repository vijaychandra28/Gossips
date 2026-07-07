import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Copy, Check, LogOut, Shield, Search, ArrowUpDown, 
  HelpCircle, Trash2, X, AlertTriangle, Play, FileText,
  MessageSquare, Send
} from 'lucide-react';
import api from '../services/api';
import { decryptString, encryptString, arrayBufferToBase64 } from '../services/crypto';
import GlassCard from '../components/GlassCard';
import UploadPanel from '../components/UploadPanel';
import FileCard from '../components/FileCard';

const Dashboard = ({ room, cryptoKey, onLeave, currentUser, addToast, isLight }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc'); // name_asc, name_desc, date_desc, date_asc, size_desc, size_asc, type_asc
  const [copied, setCopied] = useState(false);
  
  // Modals / Dialogs
  const [deleteDialog, setDeleteDialog] = useState(null); // { id, name }
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null); // { name, url, category, mimeType }

  // Chat states
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('files'); // 'files' or 'chat'
  
  const chatEndRef = useRef(null);

  // 1. Fetch files and decrypt their names in Dashboard
  const fetchFiles = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await api.get(`/rooms/${room.id}/files`);
      const rawFiles = response.data.files;

      // Decrypt all filenames in parallel
      const decrypted = await Promise.all(
        rawFiles.map(async (f) => {
          try {
            const name = await decryptString(f.encrypted_filename, cryptoKey, f.iv);
            return { ...f, decryptedName: name };
          } catch (err) {
            console.error("Failed to decrypt filename for file ID:", f.id);
            return { ...f, decryptedName: "Decryption Failed" };
          }
        })
      );

      setFiles(decrypted);
    } catch (err) {
      console.error(err);
      if (!silent) addToast("Failed to fetch files in this room.", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // 2. Fetch and decrypt chat messages
  const fetchMessages = async (silent = false) => {
    try {
      if (!silent) setMessagesLoading(true);
      const response = await api.get(`/rooms/${room.id}/messages`);
      const rawMessages = response.data.messages;

      // Decrypt all messages in parallel
      const decrypted = await Promise.all(
        rawMessages.map(async (m) => {
          try {
            const text = await decryptString(m.encrypted_text, cryptoKey, m.iv);
            return { ...m, decryptedText: text };
          } catch (err) {
            console.error("Failed to decrypt message ID:", m.id);
            return { ...m, decryptedText: "Decryption Failed" };
          }
        })
      );

      setMessages(decrypted);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  };

  // 3. Encrypt and send a message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const cleanText = newMessage.trim();
    if (!cleanText) return;

    setSendingMessage(true);
    try {
      // Generate a random IV
      const ivBytes = window.crypto.getRandomValues(new Uint8Array(12));
      const ivBase64 = arrayBufferToBase64(ivBytes.buffer);
      
      // Encrypt client-side
      const encryptedText = await encryptString(cleanText, cryptoKey, ivBase64);

      const response = await api.post('/messages', {
        room_id: room.id,
        encrypted_text: encryptedText,
        iv: ivBase64
      });

      const newMsg = response.data.chat_message;
      setMessages(prev => [...prev, { ...newMsg, decryptedText: cleanText }]);
      setNewMessage('');
    } catch (err) {
      console.error(err);
      addToast("Failed to send message.", "error");
    } finally {
      setSendingMessage(false);
    }
  };

  // Poll files & messages
  useEffect(() => {
    if (room && cryptoKey) {
      fetchFiles();
      fetchMessages();

      const interval = setInterval(() => {
        fetchFiles(true);
        fetchMessages(true);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [room, cryptoKey]);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (activeSubTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeSubTab]);

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  // Copy Room ID to Clipboard
  const handleCopyId = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    addToast("Room ID copied to clipboard.", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  // Callback after successful upload
  const handleUploadComplete = async (newFile) => {
    try {
      const name = await decryptString(newFile.encrypted_filename, cryptoKey, newFile.iv);
      setFiles(prev => [{ ...newFile, decryptedName: name }, ...prev]);
    } catch (err) {
      setFiles(prev => [{ ...newFile, decryptedName: "Decryption Error" }, ...prev]);
    }
  };

  // Handle File Deletion
  const handleDeleteConfirm = async () => {
    if (!deleteDialog) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/files/${deleteDialog.id}`);
      addToast("File deleted permanently.", "success");
      setFiles(prev => prev.filter(f => f.id !== deleteDialog.id));
      setDeleteDialog(null);
    } catch (err) {
      console.error(err);
      addToast("Failed to delete file.", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Helper to extract extension
  const getExtension = (name) => {
    if (!name) return '';
    return name.split('.').pop().toLowerCase();
  };

  // Filter & Sort files
  const filteredFiles = files.filter(file => 
    file.decryptedName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    switch (sortBy) {
      case 'name_asc':
        return a.decryptedName.localeCompare(b.decryptedName);
      case 'name_desc':
        return b.decryptedName.localeCompare(a.decryptedName);
      case 'size_desc':
        return b.file_size - a.file_size;
      case 'size_asc':
        return a.file_size - b.file_size;
      case 'type_asc':
        return getExtension(a.decryptedName).localeCompare(getExtension(b.decryptedName));
      case 'date_asc':
        return new Date(a.uploaded_at) - new Date(b.uploaded_at);
      case 'date_desc':
      default:
        return new Date(b.uploaded_at) - new Date(a.uploaded_at);
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-6">
      
      {/* Dashboard Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-success border border-emerald-500/25 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> ZERO-KNOWLEDGE ACTIVE
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight mt-1">{room.room_name}</h2>
          <p className="text-xs text-slate-400">Secure room designated for encrypted file transmission</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Room ID Copy Button */}
          <div className={`flex items-center rounded-xl border p-1 text-xs ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-slate-700/50'
          }`}>
            <span className="font-mono px-3 text-slate-400 select-all">{room.id}</span>
            <button
              onClick={handleCopyId}
              className="p-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors"
              title="Copy Room ID"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Leave Room Button */}
          <button
            onClick={onLeave}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-error/10 border border-error/20 text-error hover:bg-error/20 hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave Room</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Upload Zone & Security Specs */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard isLight={isLight} className="p-6 space-y-4">
            <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase">Transmission Gateway</h3>
            <UploadPanel 
              roomId={room.id}
              cryptoKey={cryptoKey}
              onUploadComplete={handleUploadComplete}
              addToast={addToast}
              isLight={isLight}
            />
          </GlassCard>

          <GlassCard isLight={isLight} className="p-6 space-y-3">
            <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase">Encryption parameters</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Algorithm:</span>
                <span className="font-mono text-slate-300">AES-256-GCM (Web Crypto)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Key Source:</span>
                <span className="font-mono text-slate-300">PBKDF2 Derivation</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Scope:</span>
                <span className="text-success font-semibold">Zero-knowledge (No plain name)</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Side: Search, Sort & Files Grid */}
        {/* Right Side: Search, Sort & Files Grid OR Secure Chat */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Sub-tab Selector */}
          <div className="flex border-b border-white/5 pb-2 gap-4">
            <button
              onClick={() => setActiveSubTab('files')}
              className={`flex items-center gap-2 pb-2 px-1 text-sm font-bold relative transition-colors cursor-pointer ${
                activeSubTab === 'files' ? 'text-accent' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Secure Files</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 border border-accent/25 text-accent font-mono font-bold">
                {files.length}
              </span>
              {activeSubTab === 'files' && (
                <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('chat')}
              className={`flex items-center gap-2 pb-2 px-1 text-sm font-bold relative transition-colors cursor-pointer ${
                activeSubTab === 'chat' ? 'text-accent' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Secure Chat</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-success font-mono font-bold">
                {messages.length}
              </span>
              {activeSubTab === 'chat' && (
                <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeSubTab === 'files' ? (
              <motion.div
                key="files-subtab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* File Controls (Search / Sort) */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  
                  {/* Search Bar */}
                  <div className="relative w-full sm:max-w-xs">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Search files..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-accent transition-colors ${
                        isLight 
                          ? 'bg-white border-slate-200 text-slate-800' 
                          : 'bg-black/25 border-slate-700/50 text-slate-100 placeholder-slate-500'
                      }`}
                    />
                  </div>

                  {/* Sort Dropdown */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <ArrowUpDown className="w-4 h-4 text-slate-500" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className={`py-2.5 px-3 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-accent transition-colors ${
                        isLight 
                          ? 'bg-white border-slate-200 text-slate-800' 
                          : 'bg-bgPanel/60 border-slate-700/50 text-slate-300'
                      }`}
                    >
                      <option value="date_desc">Upload Date (Newest)</option>
                      <option value="date_asc">Upload Date (Oldest)</option>
                      <option value="name_asc">Name (A-Z)</option>
                      <option value="name_desc">Name (Z-A)</option>
                      <option value="size_desc">File Size (Largest)</option>
                      <option value="size_asc">File Size (Smallest)</option>
                      <option value="type_asc">File Type</option>
                    </select>
                  </div>

                </div>

                {/* Files Grid View */}
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className={`h-[200px] rounded-2xl animate-pulse border ${
                        isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800/20 border-slate-700/30'
                      }`} />
                    ))}
                  </div>
                ) : sortedFiles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sortedFiles.map(file => (
                      <FileCard 
                        key={file.id}
                        file={file}
                        cryptoKey={cryptoKey}
                        onDeleteClick={(id, name) => setDeleteDialog({ id, name })}
                        currentUser={currentUser}
                        isLight={isLight}
                        onPreviewTrigger={(name, url, category, mimeType) => setPreviewFile({ name, url, category, mimeType })}
                      />
                    ))}
                  </div>
                ) : (
                  <GlassCard isLight={isLight} className="py-16 px-4 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-slate-800/40 border border-slate-700/40 flex items-center justify-center text-slate-500 animate-bounce">
                      <HelpCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">No Secure Files Found</h4>
                      <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
                        {searchQuery ? "No files matched your search parameters." : "Drag & drop files in the transmission panel to execute end-to-end encrypted uploads."}
                      </p>
                    </div>
                  </GlassCard>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="chat-subtab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-[550px] relative rounded-2xl border overflow-hidden bg-black/20 border-slate-800/50"
              >
                {/* Chat Messages Log */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                  {messagesLoading && messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
                      <span className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      <p className="text-[10px] tracking-wider uppercase font-bold text-slate-500">Decrypting communication...</p>
                    </div>
                  ) : messages.length > 0 ? (
                    messages.map((m) => {
                      const isMe = m.user_id === currentUser.id;
                      return (
                        <div key={m.id} className={`flex flex-col max-w-[75%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                          {/* Username */}
                          <span className="text-[9px] font-bold text-slate-400 mb-1 px-1">{isMe ? 'You' : m.sender_name}</span>
                          
                          {/* Bubble */}
                          <div className={`p-3 text-xs rounded-2xl leading-relaxed shadow-sm break-words ${
                            isMe 
                              ? 'bg-accent text-white rounded-tr-none' 
                              : isLight 
                                ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-none' 
                                : 'bg-white/5 border border-white/5 text-slate-100 rounded-tl-none'
                          }`}>
                            <p>{m.decryptedText}</p>
                          </div>
                          
                          {/* Timestamp */}
                          <span className="text-[9px] text-slate-500 mt-1 px-1">{formatTime(m.created_at)}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2">
                      <div className="p-3 bg-accent/10 text-accent rounded-full">
                        <MessageSquare className="w-6 h-6 animate-bounce" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs">Secure Chat Channel</h4>
                        <p className="text-[10px] text-slate-500 max-w-xs mt-1 leading-relaxed">
                          This channel is end-to-end encrypted using your room's private keys. 
                          Only people with the correct room password can read these messages.
                        </p>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input Form */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5 bg-black/10 flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Type a secure message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sendingMessage}
                    className={`flex-1 px-4 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-accent transition-colors ${
                      isLight 
                        ? 'bg-white border-slate-200 text-slate-800' 
                        : 'bg-black/35 border-slate-700/50 text-slate-100 placeholder-slate-500'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || !newMessage.trim()}
                    className="p-2.5 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:hover:bg-accent cursor-pointer flex items-center justify-center"
                  >
                    {sendingMessage ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

      {/* 1. Delete Confirmation Dialog Overlay */}
      <AnimatePresence>
        {deleteDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <GlassCard isLight={isLight} className="p-6 border-error/20 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-error/15 text-error">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">Confirm Deletion</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Are you sure you want to permanently delete <code className="px-1 py-0.5 rounded bg-black/25 text-error break-all">{deleteDialog.name}</code>?
                      This action is irreversible and the encrypted data will be removed from disk.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    disabled={deleteLoading}
                    onClick={() => setDeleteDialog(null)}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={deleteLoading}
                    onClick={handleDeleteConfirm}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-error hover:bg-red-600 text-white transition-all"
                  >
                    {deleteLoading ? "Deleting..." : "Permanently Delete"}
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Decrypted Media Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl max-h-[90vh] flex flex-col justify-between"
            >
              <GlassCard isLight={isLight} className="p-4 flex flex-col flex-1 h-full border-white/10 bg-black/45">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                  <div className="max-w-[80%]">
                    <h3 className="font-bold text-sm text-slate-200 truncate">{previewFile.name}</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{previewFile.category} Preview</p>
                  </div>
                  <button 
                    onClick={() => {
                      URL.revokeObjectURL(previewFile.url);
                      setPreviewFile(null);
                    }}
                    className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content Viewer Body */}
                <div className="flex-1 flex items-center justify-center min-h-[300px] max-h-[70vh] bg-black/40 rounded-xl overflow-hidden p-2">
                  {previewFile.category === 'image' && (
                    <img 
                      src={previewFile.url} 
                      alt={previewFile.name} 
                      className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-lg"
                    />
                  )}

                  {previewFile.category === 'video' && (
                    <video 
                      controls 
                      autoPlay
                      src={previewFile.url} 
                      className="max-h-[65vh] w-full rounded-lg shadow-lg"
                    />
                  )}

                  {previewFile.category === 'pdf' && (
                    <iframe 
                      src={previewFile.url} 
                      title={previewFile.name}
                      className="w-full h-[65vh] rounded-lg border border-white/5 bg-slate-900"
                    />
                  )}

                  {previewFile.category === 'audio' && (
                    <div className="p-8 w-full max-w-md bg-slate-950/80 rounded-xl border border-white/5 text-center space-y-4">
                      <div className="p-3 bg-accent/10 text-accent rounded-full inline-block animate-pulse">
                        <FileText className="w-8 h-8" />
                      </div>
                      <p className="text-xs text-slate-400 font-semibold truncate">{previewFile.name}</p>
                      <audio 
                        controls 
                        src={previewFile.url} 
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Dashboard;
