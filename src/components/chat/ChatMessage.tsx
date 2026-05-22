import React, { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Message } from '../../types';
import { Avatar } from '../ui/Avatar';
import { FileText, FileSpreadsheet, Download, Scale, ChevronDown, Edit2, Trash2, Check, X, Play, Video as VideoIcon } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatMediaName = (
  timestamp: string | Date,
  originalName: string,
  isVideo: boolean
): { displayName: string; downloadName: string } => {
  try {
    const d = new Date(timestamp);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    const ext = originalName.includes('.') ? originalName.split('.').pop() : isVideo ? 'mp4' : 'jpg';
    const prefix = isVideo ? 'Nexus Video' : 'Nexus Image';

    return {
      displayName: `${prefix} ${year}-${month}-${day} at ${hours}.${minutes}.${seconds} ${ampm}`,
      downloadName: `${prefix} ${year}-${month}-${day} at ${hours}.${minutes}.${seconds} ${ampm}.${ext}`
    };
  } catch {
    const prefix = isVideo ? 'Nexus Video' : 'Nexus Image';
    const ext = originalName.includes('.') ? originalName.split('.').pop() : isVideo ? 'mp4' : 'jpg';
    return {
      displayName: prefix,
      downloadName: `${prefix}.${ext}`
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface ChatMessageProps {
  message: Message;
  isCurrentUser: boolean;
  partnerAvatarUrl?: string;
  partnerName?: string;
  currentUserAvatarUrl?: string;
  currentUserName?: string;
  onEdit?: (messageId: string, newContent: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isCurrentUser,
  partnerAvatarUrl,
  partnerName,
  currentUserAvatarUrl,
  currentUserName,
  onEdit,
  onDelete
}) => {
  const avatarUrl = (isCurrentUser ? currentUserAvatarUrl : partnerAvatarUrl) || '';
  const name = isCurrentUser ? currentUserName : partnerName;

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // ─── Download helper ───────────────────────────────────────────────────────
  const downloadFile = (url: string, fileName: string) => {
    try {
      let downloadUrl = url.replace('/uploads/', '/api/documents/download/');
      if (fileName) {
        downloadUrl += `?name=${encodeURIComponent(fileName)}`;
      }
      window.location.href = downloadUrl;
    } catch (error) {
      console.error('Download failed, falling back to open in new tab:', error);
      window.open(url, '_blank');
    }
  };

  // ─── Keyboard listeners ────────────────────────────────────────────────────
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowLightbox(false);
    };
    if (showLightbox) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showLightbox]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setShowDeleteConfirm(false);
      }
    };
    if (showMenu || showDeleteConfirm) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu, showDeleteConfirm]);

  const handleSave = async () => {
    if (editValue.trim() && editValue.trim() !== message.content && onEdit) {
      await onEdit(message.id, editValue.trim());
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete(message.id);
      setShowDeleteConfirm(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(message.content);
    }
  };

  // ─── Parse attachment ──────────────────────────────────────────────────────
  let isAttachment = false;
  let attachmentData: any = null;

  if (message.content.trim().startsWith('{"attachment":')) {
    try {
      attachmentData = JSON.parse(message.content);
      isAttachment = !!(attachmentData && attachmentData.fileUrl);
    } catch (e) {
      // Fallback to text
    }
  }

  const isVideo = isAttachment && attachmentData?.fileType === 'video';
  const isImage = isAttachment && attachmentData?.fileType === 'image';

  const formattedNames =
    isAttachment && attachmentData && (isImage || isVideo)
      ? formatMediaName(message.timestamp, attachmentData.fileName, isVideo)
      : null;

  // ─── Render attachment ─────────────────────────────────────────────────────
  const renderAttachment = () => {
    if (!attachmentData) return null;
    const fileUrl = attachmentData.fileUrl;
    const fullFileUrl = fileUrl.startsWith('http') ? fileUrl : `http://localhost:5000${fileUrl}`;
    const caption: string | undefined = attachmentData.caption;

    // ── Image ──────────────────────────────────────────────────────────────
    if (isImage) {
      return (
        <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 max-w-xs sm:max-w-sm">
          <img
            src={fullFileUrl}
            alt={attachmentData.fileName}
            className="max-h-64 object-cover w-full cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => setShowLightbox(true)}
          />
          {caption && (
            <div className={`px-3 py-2 text-sm ${isCurrentUser ? 'bg-primary-600 text-white' : 'bg-white text-gray-800'}`}>
              {caption}
            </div>
          )}
        </div>
      );
    }

    // ── Video ──────────────────────────────────────────────────────────────
    if (isVideo) {
      return (
        <div className="rounded-xl overflow-hidden border border-gray-200 bg-black max-w-xs sm:max-w-sm">
          {/* Thumbnail / clickable area */}
          <div className="relative cursor-pointer group" onClick={() => setShowLightbox(true)}>
            <video
              src={fullFileUrl}
              className="max-h-64 w-full object-cover"
              preload="metadata"
              muted
            />
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play size={20} className="text-gray-900 ml-1" fill="currentColor" />
              </div>
            </div>
          </div>
          {caption && (
            <div className={`px-3 py-2 text-sm ${isCurrentUser ? 'bg-primary-600 text-white' : 'bg-white text-gray-800'}`}>
              {caption}
            </div>
          )}
        </div>
      );
    }

    // ── Document / PDF / Spreadsheet Card ─────────────────────────────────
    const isPdf = attachmentData.fileType === 'pdf';
    const isExcel = attachmentData.fileType === 'excel';
    const isLegal = attachmentData.fileType === 'legal';

    return (
      <div className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg max-w-xs sm:max-w-sm text-gray-800 shadow-sm relative">
        <div className={`p-2.5 rounded-lg ${
          isPdf ? 'bg-red-50 text-red-600' :
          isExcel ? 'bg-green-50 text-green-600' :
          isLegal ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'
        }`}>
          {isPdf && <FileText size={24} />}
          {isExcel && <FileSpreadsheet size={24} />}
          {isLegal && <Scale size={24} />}
          {!isPdf && !isExcel && !isLegal && <FileText size={24} />}
        </div>
        
        <div className="flex-1 min-w-0 pr-6">
          <p className="text-sm font-semibold text-gray-900 truncate" title={attachmentData.fileName}>
            {attachmentData.fileName}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {attachmentData.fileSize} • {
              isPdf ? 'PITCH DECK' :
              isExcel ? 'FINANCIAL MODEL' :
              isLegal ? 'LEGAL/NDA' : 'DOCUMENT'
            }
          </p>
        </div>
        
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            downloadFile(fullFileUrl, attachmentData.fileName);
          }}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors mr-2 z-10 focus:outline-none"
          title="Download file locally"
        >
          <Download size={16} />
        </button>
      </div>
    );
  };

  // ─── Download name for dropdown / lightbox ─────────────────────────────────
  const resolvedDownloadName = formattedNames
    ? formattedNames.downloadName
    : attachmentData?.fileName;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}>
      {!isCurrentUser && (
        <Avatar
          src={avatarUrl}
          alt={name || 'User'}
          size="sm"
          className="mr-2 self-end"
        />
      )}
      
      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center space-x-2 group relative" ref={menuRef}>
          <div
            className={`max-w-xs sm:max-w-md rounded-lg relative ${
              isAttachment
                ? 'p-1 bg-transparent'
                : `px-4 py-2 ${
                    isCurrentUser
                      ? 'bg-primary-600 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`
            }`}
          >
            {/* ─── Chevron dropdown trigger ───────────────────────────── */}
            {((isCurrentUser && !isAttachment) || isAttachment) && !isEditing && (
              <div className="absolute top-1.5 right-1.5 z-20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                    setShowDeleteConfirm(false);
                  }}
                  className={`opacity-0 group-hover:opacity-100 p-0.5 rounded-full transition-all duration-150 focus:opacity-100 focus:outline-none shadow-sm ${
                    isCurrentUser && !isAttachment
                      ? 'text-white hover:text-white hover:bg-primary-700 bg-primary-600 border border-primary-500'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 bg-white border border-gray-200'
                  }`}
                  aria-label="Message options"
                >
                  <ChevronDown size={14} />
                </button>

                {/* Dropdown menu */}
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-32 z-50 text-gray-800 animate-fade-in">
                    {isAttachment ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setShowMenu(false);
                            const fileUrl = attachmentData.fileUrl;
                            const fullFileUrl = fileUrl.startsWith('http') ? fileUrl : `http://localhost:5000${fileUrl}`;
                            downloadFile(fullFileUrl, resolvedDownloadName);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center font-medium"
                        >
                          <Download size={13} className="mr-2 text-gray-500" />
                          Download
                        </button>
                        {isCurrentUser && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowDeleteConfirm(true);
                              setShowMenu(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center font-semibold border-t border-gray-100 transition-colors"
                          >
                            <Trash2 size={13} className="mr-2 text-red-600" />
                            Delete
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(true);
                            setEditValue(message.content);
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center font-medium"
                        >
                          <Edit2 size={13} className="mr-2 text-gray-500" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDeleteConfirm(true);
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center font-semibold border-t border-gray-100 transition-colors"
                        >
                          <Trash2 size={13} className="mr-2 text-red-600" />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Delete confirmation */}
                {showDeleteConfirm && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-red-100 rounded-lg shadow-xl p-3 w-44 z-50 text-gray-800 animate-fade-in">
                    <p className="text-xs font-semibold text-gray-900 mb-2">Delete message completely?</p>
                    <div className="flex space-x-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-150 rounded font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="px-2 py-1 text-[10px] text-white bg-red-600 hover:bg-red-700 rounded font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── Content ─────────────────────────────────────────────── */}
            {isEditing ? (
              <div className="flex flex-col space-y-1.5 min-w-[200px]">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  className={`w-full text-sm rounded p-1.5 focus:outline-none focus:ring-1 ${
                    isCurrentUser
                      ? 'bg-primary-700 text-white border-primary-500 focus:ring-white placeholder-primary-300'
                      : 'bg-white text-gray-800 border-gray-300 focus:ring-primary-500'
                  }`}
                  autoFocus
                />
                <div className="flex justify-end space-x-1.5">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className={`p-1 rounded-full transition-colors ${
                      isCurrentUser ? 'hover:bg-primary-700 text-primary-200' : 'hover:bg-gray-200 text-gray-500'
                    }`}
                    title="Cancel"
                  >
                    <X size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!editValue.trim() || editValue.trim() === message.content}
                    className={`p-1 rounded-full transition-colors ${
                      isCurrentUser
                        ? 'hover:bg-primary-700 text-white disabled:text-primary-400'
                        : 'hover:bg-gray-200 text-primary-600 disabled:text-gray-400'
                    }`}
                    title="Save"
                  >
                    <Check size={14} />
                  </button>
                </div>
              </div>
            ) : isAttachment ? (
              renderAttachment()
            ) : (
              <p className="text-sm break-words whitespace-pre-wrap pr-5">{message.content}</p>
            )}
          </div>
        </div>

        <span className="text-xs text-gray-500 mt-1 flex items-center">
          {message.isEdited && <span className="mr-1 text-gray-400 font-normal italic">(edited)</span>}
          {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
        </span>
      </div>

      {isCurrentUser && (
        <Avatar
          src={avatarUrl}
          alt={name || 'User'}
          size="sm"
          className="ml-2 self-end"
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Lightbox (Image or Video)                                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showLightbox && attachmentData && (
        <div
          className="fixed inset-0 bg-gray-950/97 backdrop-blur-md z-[999] flex flex-col justify-between animate-fade-in"
          onClick={() => setShowLightbox(false)}
        >
          {/* Lightbox Header */}
          <div
            className="flex items-center justify-between p-4 bg-gray-900/60 backdrop-blur-sm border-b border-white/10 text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 min-w-0 pr-4">
              <div className={`p-2 rounded-lg ${isVideo ? 'bg-purple-500/20' : 'bg-blue-500/20'}`}>
                {isVideo
                  ? <VideoIcon size={16} className="text-purple-400" />
                  : <Play size={16} className="text-blue-400" />
                }
              </div>
              <div className="min-w-0">
                <span className="text-sm font-semibold truncate block text-left">
                  {(formattedNames && formattedNames.displayName) || attachmentData.fileName}
                </span>
                <span className="text-xs text-gray-400 text-left block">{attachmentData.fileSize}</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => {
                  const fileUrl = attachmentData.fileUrl;
                  const fullFileUrl = fileUrl.startsWith('http') ? fileUrl : `http://localhost:5000${fileUrl}`;
                  downloadFile(fullFileUrl, resolvedDownloadName);
                }}
                className="p-2 rounded-full hover:bg-white/10 text-gray-200 hover:text-white transition-colors focus:outline-none"
                title="Download"
              >
                <Download size={20} />
              </button>
              <button
                type="button"
                onClick={() => setShowLightbox(false)}
                className="p-2 rounded-full hover:bg-white/10 text-gray-200 hover:text-white transition-colors focus:outline-none"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Media Content */}
          <div
            className="flex-1 flex items-center justify-center p-4"
            onClick={() => setShowLightbox(false)}
          >
            {isVideo ? (
              <video
                src={attachmentData.fileUrl.startsWith('http')
                  ? attachmentData.fileUrl
                  : `http://localhost:5000${attachmentData.fileUrl}`}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] rounded-xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={attachmentData.fileUrl.startsWith('http')
                  ? attachmentData.fileUrl
                  : `http://localhost:5000${attachmentData.fileUrl}`}
                alt={attachmentData.fileName}
                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl select-none cursor-zoom-out"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>

          {/* Lightbox Footer — show caption if present */}
          <div
            className="p-3 bg-gray-900/30 text-center select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {attachmentData.caption && (
              <p className="text-white text-sm mb-1 font-medium">{attachmentData.caption}</p>
            )}
            <p className="text-xs text-gray-500">
              Click anywhere outside or press Escape to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
};