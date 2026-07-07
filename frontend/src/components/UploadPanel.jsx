import React, { useState, useRef } from 'react';
import { Upload, File, ShieldAlert, Sparkles } from 'lucide-react';
import api from '../services/api';
import { encryptFile, encryptString } from '../services/crypto';

const MAX_SIZE = 500 * 1024 * 1024; // 500 MB
const MAX_SIMULTANEOUS = 20;

const UploadPanel = ({ roomId, cryptoKey, onUploadComplete, addToast, isLight }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploads, setUploads] = useState({}); // Track uploads by local ID
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (fileList) => {
    if (fileList.length > MAX_SIMULTANEOUS) {
      addToast(`Maximum ${MAX_SIMULTANEOUS} files can be uploaded simultaneously.`, 'warning');
      fileList = fileList.slice(0, MAX_SIMULTANEOUS);
    }

    fileList.forEach(file => {
      if (file.size > MAX_SIZE) {
        addToast(`"${file.name}" exceeds the 500 MB upload limit.`, 'error');
        return;
      }
      uploadSingleFile(file);
    });
  };

  const uploadSingleFile = async (file) => {
    const uploadId = Math.random().toString(36).substring(2, 9);
    
    // Add to local upload monitoring state
    setUploads(prev => ({
      ...prev,
      [uploadId]: {
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'Encrypting...',
        error: null
      }
    }));

    try {
      if (!cryptoKey) {
        throw new Error("Encryption key not found. Re-authenticate room password.");
      }

      // 1. Read file as ArrayBuffer
      const reader = new FileReader();
      const fileDataPromise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read file."));
      });
      reader.readAsArrayBuffer(file);
      
      const fileArrayBuffer = await fileDataPromise;

      // 2. Encrypt file contents using Web Crypto (AES-256-GCM)
      const { cipherText, iv } = await encryptFile(fileArrayBuffer, cryptoKey);

      // 3. Encrypt original filename
      const encryptedFilename = await encryptString(file.name, cryptoKey, iv);

      // 4. Create upload payload
      const encryptedBlob = new Blob([cipherText], { type: 'application/octet-stream' });
      const formData = new FormData();
      formData.append('file', encryptedBlob, file.name);
      formData.append('room_id', roomId);
      formData.append('encrypted_filename', encryptedFilename);
      formData.append('iv', iv);
      formData.append('mime_type', file.type || 'application/octet-stream');

      // 5. Update local status
      setUploads(prev => ({
        ...prev,
        [uploadId]: { ...prev[uploadId], status: 'Uploading...' }
      }));

      // 6. Perform AJAX upload
      const response = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploads(prev => ({
            ...prev,
            [uploadId]: { ...prev[uploadId], progress: percent }
          }));
        }
      });

      // Done
      addToast(`"${file.name}" secured and uploaded.`, 'success');
      
      // Delay cleaning upload list slightly for visual closure
      setTimeout(() => {
        setUploads(prev => {
          const copy = { ...prev };
          delete copy[uploadId];
          return copy;
        });
      }, 1500);

      if (onUploadComplete) {
        onUploadComplete(response.data.file);
      }

    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.error || err.message || "Upload failed.";
      
      setUploads(prev => ({
        ...prev,
        [uploadId]: {
          ...prev[uploadId],
          status: 'Failed',
          error: errorMessage
        }
      }));
      
      addToast(`Failed to upload "${file.name}": ${errorMessage}`, 'error');
    }
  };

  const activeUploadKeys = Object.keys(uploads);

  return (
    <div className="w-full space-y-4">
      {/* Dropzone area */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`w-full rounded-2xl border-2 border-dashed py-8 px-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
          dragActive
            ? 'border-accent bg-accent/15 scale-[1.01]'
            : isLight
            ? 'border-slate-300 hover:border-accent hover:bg-slate-50'
            : 'border-slate-700 hover:border-accent/60 hover:bg-white/5'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
        
        <div className="p-3 rounded-full bg-accent/10 text-accent mb-3 animate-pulse">
          <Upload className="w-6 h-6" />
        </div>

        <p className="text-sm font-semibold mb-1 text-center">
          Drag & drop your files here, or <span className="text-accent underline">browse</span>
        </p>
        <p className="text-xs text-slate-400 text-center">
          Universal support • Client-side encrypted • Max file size: 500 MB
        </p>
      </div>

      {/* Upload queue monitor */}
      {activeUploadKeys.length > 0 && (
        <div className={`p-4 rounded-xl border ${
          isLight ? 'bg-white border-slate-200' : 'bg-bgPanel/60 border-slate-800'
        } space-y-3 max-h-[300px] overflow-y-auto`}>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Active Transfers ({activeUploadKeys.length})</span>
          </div>
          
          {activeUploadKeys.map(key => {
            const up = uploads[key];
            const sizeStr = up.size > 1024 * 1024
              ? `${(up.size / (1024 * 1024)).toFixed(1)} MB`
              : `${(up.size / 1024).toFixed(0)} KB`;
              
            return (
              <div key={key} className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 max-w-[70%]">
                    <File className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-medium">{up.name}</span>
                    <span className="text-slate-400 text-[10px]">({sizeStr})</span>
                  </div>
                  
                  <div>
                    {up.status === 'Failed' ? (
                      <span className="text-error flex items-center gap-0.5 font-semibold">
                        <ShieldAlert className="w-3 h-3" /> Error
                      </span>
                    ) : (
                      <span className={`${up.status === 'Encrypting...' ? 'text-amber-500 font-semibold' : 'text-accent'}`}>
                        {up.status === 'Encrypting...' ? 'Securing...' : `${up.progress}%`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      up.status === 'Failed' 
                        ? 'bg-error' 
                        : up.status === 'Encrypting...'
                        ? 'bg-amber-500 w-1/4 animate-pulse'
                        : 'bg-accent'
                    }`}
                    style={{ width: up.status === 'Encrypting...' ? '25%' : `${up.progress}%` }}
                  />
                </div>
                
                {up.error && (
                  <p className="text-[10px] text-error truncate">{up.error}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UploadPanel;
