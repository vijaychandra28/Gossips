import React, { useState, useEffect } from 'react';
import { 
  File, Image as ImageIcon, Video as VideoIcon, FileText, 
  FileSpreadsheet, Presentation, FolderArchive, Code2, 
  Cpu, Music, Download, Trash2, Eye, Loader2, Play
} from 'lucide-react';
import api from '../services/api';
import { decryptFile, decryptString } from '../services/crypto';
import GlassCard from './GlassCard';

const FileCard = ({ file, cryptoKey, onDeleteClick, currentUser, isLight, onPreviewTrigger }) => {
  const [decryptedName, setDecryptedName] = useState('');
  const [thumbUrl, setThumbUrl] = useState('');
  const [isDecryptingThumb, setIsDecryptingThumb] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(-1); // -1 means idle
  const [downloadStatus, setDownloadStatus] = useState('');

  // 1. Decrypt filename on mount
  useEffect(() => {
    let active = true;
    async function decryptName() {
      try {
        if (!cryptoKey) return;
        const name = await decryptString(file.encrypted_filename, cryptoKey, file.iv);
        if (active) setDecryptedName(name);
      } catch (err) {
        console.error("Failed to decrypt filename:", err);
        if (active) setDecryptedName("Decryption Failed (incorrect key)");
      }
    }
    decryptName();
    return () => { active = false; };
  }, [file, cryptoKey]);

  // Helper to check file extension
  const getExtension = (name) => {
    if (!name) return '';
    return name.split('.').pop().toLowerCase();
  };

  // Helper to categorize files
  const getFileCategory = (name) => {
    const ext = getExtension(name);
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video';
    if (ext === 'pdf') return 'pdf';
    if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return 'audio';
    if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) return 'document';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'spreadsheet';
    if (['ppt', 'pptx'].includes(ext)) return 'presentation';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
    if (['py', 'c', 'cpp', 'h', 'java', 'js', 'ts', 'html', 'css', 'json', 'xml', 'yml', 'yaml', 'sql', 'go', 'rb', 'swift', 'sh'].includes(ext)) return 'code';
    if (['exe', 'dmg', 'pkg', 'msi', 'apk'].includes(ext)) return 'executable';
    return 'unknown';
  };

  const fileCategory = getFileCategory(decryptedName);

  // 2. Fetch and decrypt image thumbnails (limit to files < 20MB for performance)
  useEffect(() => {
    let active = true;
    if (!decryptedName || fileCategory !== 'image' || file.file_size > 20 * 1024 * 1024) return;

    async function loadThumbnail() {
      try {
        if (active) setIsDecryptingThumb(true);
        const response = await api.get(`/files/${file.id}/download`, { 
          responseType: 'arraybuffer' 
        });
        
        const decryptedBytes = await decryptFile(response.data, cryptoKey, file.iv);
        const blob = new Blob([decryptedBytes], { type: file.mime_type || 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        
        if (active) setThumbUrl(url);
      } catch (err) {
        console.error("Failed to load image thumbnail:", err);
      } finally {
        if (active) setIsDecryptingThumb(false);
      }
    }
    loadThumbnail();

    return () => {
      active = false;
      if (thumbUrl) URL.revokeObjectURL(thumbUrl);
    };
  }, [decryptedName, file, cryptoKey]);

  // Helper to format file size
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Helper to pick icons
  const getIcon = () => {
    const size = "w-10 h-10";
    switch (fileCategory) {
      case 'image': return <ImageIcon className={`${size} text-blue-400`} />;
      case 'video': return <VideoIcon className={`${size} text-indigo-400`} />;
      case 'pdf': return <FileText className={`${size} text-error`} />;
      case 'audio': return <Music className={`${size} text-emerald-400`} />;
      case 'document': return <FileText className={`${size} text-slate-400`} />;
      case 'spreadsheet': return <FileSpreadsheet className={`${size} text-green-400`} />;
      case 'presentation': return <Presentation className={`${size} text-orange-400`} />;
      case 'archive': return <FolderArchive className={`${size} text-yellow-500`} />;
      case 'code': return <Code2 className={`${size} text-teal-400`} />;
      case 'executable': return <Cpu className={`${size} text-cyan-400`} />;
      default: return <File className={`${size} text-slate-400`} />;
    }
  };

  // 3. Handle File Download & Client Decryption
  const handleDownload = async () => {
    if (downloadProgress >= 0) return; // Prevent double trigger
    
    try {
      setDownloadProgress(0);
      setDownloadStatus('Downloading...');
      
      // Download encrypted binary
      const response = await api.get(`/files/${file.id}/download`, {
        responseType: 'arraybuffer',
        onDownloadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setDownloadProgress(percent);
        }
      });

      setDownloadStatus('Decrypting...');
      
      // Decrypt client-side
      const decryptedBytes = await decryptFile(response.data, cryptoKey, file.iv);
      
      // Save file locally via blob download
      const blob = new Blob([decryptedBytes], { type: file.mime_type || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = decryptedName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadProgress(-1);
      setDownloadStatus('');
    } catch (err) {
      console.error(err);
      alert("Download or Decryption failed. Ensure the room key is correct.");
      setDownloadProgress(-1);
      setDownloadStatus('');
    }
  };

  // 4. Download and trigger parent preview modal
  const handlePreview = async () => {
    try {
      setDownloadStatus('Decrypting preview...');
      setDownloadProgress(50);
      
      const response = await api.get(`/files/${file.id}/download`, { responseType: 'arraybuffer' });
      const decryptedBytes = await decryptFile(response.data, cryptoKey, file.iv);
      
      const blob = new Blob([decryptedBytes], { type: file.mime_type });
      const blobUrl = URL.createObjectURL(blob);

      onPreviewTrigger(decryptedName, blobUrl, fileCategory, file.mime_type);
      
      setDownloadProgress(-1);
      setDownloadStatus('');
    } catch (err) {
      console.error("Preview preparation failed:", err);
      alert("Could not load preview. Encryption error.");
      setDownloadProgress(-1);
      setDownloadStatus('');
    }
  };

  // Date formatter
  const formattedDate = file.uploaded_at
    ? new Date(file.uploaded_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : '';

  const canDelete = currentUser && (file.uploaded_by === currentUser.id);

  const showPreviewBtn = ['image', 'video', 'pdf', 'audio'].includes(fileCategory);

  return (
    <GlassCard isLight={isLight} className="relative group transition-all duration-300 hover:scale-[1.02] hover:shadow-accent-glow p-4 flex flex-col justify-between h-[200px]">
      <div className="space-y-3">
        {/* Card Header (Icon or Image Thumbnail) */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-800/40 border border-slate-700/30 overflow-hidden relative">
            {isDecryptingThumb ? (
              <Loader2 className="w-5 h-5 text-accent animate-spin" />
            ) : thumbUrl ? (
              <img src={thumbUrl} alt="thumbnail" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
            ) : (
              getIcon()
            )}
            
            {fileCategory === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white opacity-60">
                <Play className="w-4 h-4 fill-white" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {showPreviewBtn && (
              <button 
                onClick={handlePreview}
                title="Preview file"
                className={`p-1.5 rounded-lg border transition-colors ${
                  isLight 
                    ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' 
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            )}
            {canDelete && (
              <button 
                onClick={() => onDeleteClick(file.id, decryptedName)}
                title="Delete file"
                className={`p-1.5 rounded-lg border transition-colors ${
                  isLight 
                    ? 'bg-red-50 border-red-100 text-red-500 hover:bg-red-100' 
                    : 'bg-error/10 border-error/10 text-error hover:bg-error/25 hover:text-white'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Card Metadata */}
        <div className="space-y-1">
          <h4 className="font-semibold text-sm truncate" title={decryptedName || "Decrypting filename..."}>
            {decryptedName || (
              <span className="flex items-center gap-1 text-slate-500 text-xs italic animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" /> Decrypting...
              </span>
            )}
          </h4>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{formatSize(file.file_size)}</span>
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Card Action footer / Progress bar */}
      <div className="pt-3 border-t border-white/5 mt-auto">
        {downloadProgress >= 0 ? (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400 truncate">{downloadStatus}</span>
              <span className="text-accent font-semibold">{downloadProgress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
              <div 
                className="h-full bg-accent rounded-full transition-all duration-200" 
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 truncate max-w-[60%]">
              Shared by: <span className="text-slate-400 font-medium">{file.uploader_name}</span>
            </span>
            <button 
              onClick={handleDownload}
              className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                isLight
                  ? 'bg-slate-100 text-accent hover:bg-accent hover:text-white'
                  : 'bg-white/5 text-accent border border-accent/20 hover:bg-accent hover:text-white hover:border-transparent'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export default FileCard;
