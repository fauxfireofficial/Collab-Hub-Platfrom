import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Phone, Video, Info, ArrowLeft, Paperclip, FileSpreadsheet, Scale, Image as ImageIcon, FileText, X, Loader2, Mic, Trash2, Play, Pause } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ChatMessage } from '../../components/chat/ChatMessage';
import { ChatUserList } from '../../components/chat/ChatUserList';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Message } from '../../types';
import api from '../../services/api';
import { MessageCircle } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { IncomingCallModal } from '../../components/chat/IncomingCallModal';
import { CallInterface } from '../../components/chat/CallInterface';
import toast from 'react-hot-toast';

const SIGNALING_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export const ChatPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversations, setConversations] = useState<any[]>([]);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const messagesContainerRef = useRef<null | HTMLDivElement>(null);
  const isAtBottomRef = useRef(true); // track if user is scrolled near bottom
  const [chatPartner, setChatPartner] = useState<any | null>(null);
  
  // Call States
  const [socket, setSocket] = useState<Socket | null>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<{ channelName: string; partnerName: string; partnerAvatar?: string; callType: 'audio' | 'video'; token?: string | null; isCaller: boolean; partnerId: string } | null>(null);
  
  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const shouldSendRef = useRef(false);

  // File Upload / Attachment States
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [activeUploadType, setActiveUploadType] = useState<'pdf' | 'excel' | 'legal' | 'image' | null>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Media Preview Modal States
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewIsVideo, setPreviewIsVideo] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const [isSendingMedia, setIsSendingMedia] = useState(false);

  // Clean up object URL on modal close
  const closePreviewModal = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(null);
    setPreviewUrl('');
    setPreviewIsVideo(false);
    setCaptionText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setActiveUploadType(null);
  };

  // Click outside to close attachment menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setShowAttachmentMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close preview modal on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && previewFile) closePreviewModal();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [previewFile]);

  const triggerFileInput = (type: 'pdf' | 'excel' | 'legal' | 'image') => {
    setActiveUploadType(type);
    setShowAttachmentMenu(false);
    
    if (fileInputRef.current) {
      if (type === 'pdf') {
        fileInputRef.current.accept = '.pdf,.ppt,.pptx';
      } else if (type === 'excel') {
        fileInputRef.current.accept = '.xls,.xlsx,.csv';
      } else if (type === 'legal') {
        fileInputRef.current.accept = '.doc,.docx,.pdf';
      } else if (type === 'image') {
        fileInputRef.current.accept = 'image/*,video/*';
      }
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadType || !currentUser || !userId) return;

    // For image/video: show preview modal instead of uploading immediately
    if (activeUploadType === 'image') {
      const isVideo = file.type.startsWith('video/');
      const objectUrl = URL.createObjectURL(file);
      setPreviewFile(file);
      setPreviewUrl(objectUrl);
      setPreviewIsVideo(isVideo);
      setCaptionText('');
      return; // Don't upload yet — wait for user to confirm via modal
    }

    // For documents: upload immediately as before
    await uploadAndSend(file, activeUploadType, '');
  };

  const uploadAndSend = async (file: File, uploadType: 'pdf' | 'excel' | 'legal' | 'image', caption: string) => {
    try {
      const formData = new FormData();
      formData.append('document', file);
      
      const uploadRes = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const docData = uploadRes.data;

      // Determine actual file type (could be video even if uploadType is 'image')
      const actualFileType = file.type.startsWith('video/') ? 'video' : uploadType;
      
      const attachmentPayload: any = {
        attachment: true,
        fileType: actualFileType,
        fileName: docData.name,
        fileUrl: docData.url,
        fileSize: docData.size
      };

      if (caption.trim()) {
        attachmentPayload.caption = caption.trim();
      }
      
      const sendRes = await api.post('/chat/send', {
        receiverId: userId,
        content: JSON.stringify(attachmentPayload)
      });
      
      const sentMsg = {
        id: sendRes.data._id || sendRes.data.id,
        senderId: sendRes.data.senderId,
        receiverId: sendRes.data.receiverId,
        content: sendRes.data.content,
        timestamp: sendRes.data.createdAt || sendRes.data.timestamp,
        isRead: sendRes.data.isRead,
        isEdited: sendRes.data.isEdited || false
      };

      setMessages(prev => [...prev, sentMsg]);
      fetchConversations();
    } catch (err) {
      console.error('Error uploading and sending attachment:', err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setActiveUploadType(null);
    }
  };

  const handleSendMedia = async () => {
    if (!previewFile || !activeUploadType) return;
    setIsSendingMedia(true);
    await uploadAndSend(previewFile, activeUploadType, captionText);
    setIsSendingMedia(false);
    closePreviewModal();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: 'audio/webm;codecs=opus' };
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        if (shouldSendRef.current && audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
          const filename = `voice-note-${Date.now()}.webm`;
          const audioFile = new File([audioBlob], filename, { type: audioBlob.type });
          await uploadVoiceNoteAndSend(audioFile);
        }
        audioChunksRef.current = [];
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      toast.error('Could not access microphone for recording.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = (send: boolean) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      shouldSendRef.current = send;
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
  };

  const uploadVoiceNoteAndSend = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('document', file);

      const uploadRes = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const docData = uploadRes.data;

      const attachmentPayload = {
        attachment: true,
        fileType: 'voice',
        fileName: 'Voice Note',
        fileUrl: docData.url,
        fileSize: docData.size,
      };

      const sendRes = await api.post('/chat/send', {
        receiverId: userId,
        content: JSON.stringify(attachmentPayload),
      });

      const sentMsg = {
        id: sendRes.data._id || sendRes.data.id,
        senderId: sendRes.data.senderId,
        receiverId: sendRes.data.receiverId,
        content: sendRes.data.content,
        timestamp: sendRes.data.createdAt || sendRes.data.timestamp,
        isRead: sendRes.data.isRead,
        isEdited: sendRes.data.isEdited || false,
      };

      setMessages((prev) => [...prev, sentMsg]);
      fetchConversations();
    } catch (err) {
      console.error('Error sending voice note:', err);
      toast.error('Failed to send voice note.');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
  
  // Load active conversations list
  const fetchConversations = async () => {
    try {
      const res = await api.get('/chat/conversations');
      setConversations(res.data);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchConversations();

      // Initialize Socket connection
      const newSocket = io(SIGNALING_URL, { transports: ['websocket'] });
      setSocket(newSocket);

      newSocket.on('connect', () => {
        newSocket.emit('register-user', currentUser.id);
      });

      newSocket.on('incoming-call', (data: any) => {
        setIncomingCall(data);
      });

      newSocket.on('call-accepted', (data: any) => {
        // Partner accepted our call
        setActiveCall(prev => prev ? { ...prev, channelName: data.channelName } : null);
      });

      newSocket.on('call-rejected', () => {
        toast.error('Call was declined.');
        setActiveCall(null);
      });

      newSocket.on('call-ended', () => {
        toast('Call ended', { icon: '📞' });
        setActiveCall(null);
        setIncomingCall(null);
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [currentUser, userId]);
  
  // Load message history with selected user and poll
  useEffect(() => {
    const fetchMessages = async () => {
      if (userId) {
        try {
          const res = await api.get(`/chat/history/${userId}`);
          setMessages(res.data.map((m: any) => ({
            id: m._id || m.id,
            senderId: m.senderId,
            receiverId: m.receiverId,
            content: m.content,
            timestamp: m.createdAt || m.timestamp,
            isRead: m.isRead,
            isEdited: m.isEdited || false
          })));

          // Fetch partner details if not loaded
          if (!chatPartner || (chatPartner._id !== userId && chatPartner.id !== userId)) {
            const partnerRes = await api.get(`/users/profile/${userId}`);
            setChatPartner(partnerRes.data);
          }
        } catch (err) {
          console.error('Error fetching chat messages:', err);
        }
      }
    };

    if (currentUser && userId) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    } else {
      setChatPartner(null);
      setMessages([]);
    }
  }, [currentUser, userId]);
  
  // Smart auto-scroll: only scroll to bottom if user is already near the bottom
  useEffect(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Track scroll position to decide if user has scrolled up
  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 120; // px from bottom
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    isAtBottomRef.current = distanceFromBottom <= threshold;
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !currentUser || !userId) return;
    
    try {
      const res = await api.post('/chat/send', {
        receiverId: userId,
        content: newMessage
      });
      
      const sentMsg = {
        id: res.data._id || res.data.id,
        senderId: res.data.senderId,
        receiverId: res.data.receiverId,
        content: res.data.content,
        timestamp: res.data.createdAt || res.data.timestamp,
        isRead: res.data.isRead,
        isEdited: res.data.isEdited || false
      };

      // Always scroll to bottom when YOU send a message
      isAtBottomRef.current = true;
      setMessages(prev => [...prev, sentMsg]);
      setNewMessage('');
      fetchConversations();
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      const res = await api.put(`/chat/message/${messageId}`, { content: newContent });
      setMessages(prev => prev.map(m => m.id === messageId ? {
        ...m,
        content: res.data.content,
        isEdited: res.data.isEdited || false
      } : m));
      fetchConversations();
    } catch (err) {
      console.error('Error editing message:', err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await api.delete(`/chat/message/${messageId}`);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      fetchConversations();
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };
  
  // Calling Handlers
  const handleStartCall = async (callType: 'audio' | 'video') => {
    if (!chatPartner || !socket || !currentUser) return;
    // Agora channel names must be ≤64 bytes.
    // Old format with full MongoDB ObjectIDs was 71 chars — too long.
    // Use last 8 chars of each ID + base-36 timestamp (~8 chars) = ~27 chars total.
    const id1 = currentUser.id.slice(-8);
    const id2 = chatPartner.id.slice(-8);
    const ts  = Date.now().toString(36);
    const channelName = `call-${id1}-${id2}-${ts}`;
    
    let token: string | null = null;
    try {
      const res = await api.get(`/chat/agora-token?channelName=${channelName}`);
      token = res.data.token;
    } catch(err) {
      console.error('Token fetch failed', err);
    }

    // Set our active call immediately (Ringing state)
    setActiveCall({
      channelName,
      partnerName: chatPartner.name,
      partnerAvatar: chatPartner.avatarUrl,
      callType,
      token,
      isCaller: true,
      partnerId: chatPartner.id,
    });

    socket.emit('call-user', {
      userToCall: chatPartner.id,
      from: currentUser.id,
      callerName: currentUser.name,
      callerAvatar: currentUser.avatarUrl,
      callType,
      channelName
    });
  };

  const handleAcceptCall = async () => {
    if (!incomingCall || !socket) return;
    
    let token: string | null = null;
    try {
      const res = await api.get(`/chat/agora-token?channelName=${incomingCall.channelName}`);
      token = res.data.token;
    } catch(err) {
      console.error('Token fetch failed', err);
    }

    setActiveCall({
      channelName: incomingCall.channelName,
      partnerName: incomingCall.callerName,
      partnerAvatar: incomingCall.callerAvatar,
      callType: incomingCall.callType,
      token,
      isCaller: false,
      partnerId: incomingCall.from,
    });
    socket.emit('accept-call', { to: incomingCall.from, channelName: incomingCall.channelName });
    setIncomingCall(null);
  };

  const handleRejectCall = () => {
    if (!incomingCall || !socket) return;
    socket.emit('reject-call', { to: incomingCall.from });
    setIncomingCall(null);
  };

  const handleEndCall = () => {
    // Use partnerId stored in activeCall so this works regardless of chat window state
    if (activeCall && socket) {
      socket.emit('end-call', { to: activeCall.partnerId });
    }
    setActiveCall(null);
    setIncomingCall(null);
  };

  if (!currentUser) return null;
  
  return (
    <>
      {/* ───────────────────────────────────────────────── */}
      {/* Calling Overlays                                 */}
      {/* ───────────────────────────────────────────────── */}
      {incomingCall && !activeCall && (
        <IncomingCallModal
          callerName={incomingCall.callerName}
          callerAvatar={incomingCall.callerAvatar}
          callType={incomingCall.callType}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {activeCall && (
        <CallInterface
          channelName={activeCall.channelName}
          callType={activeCall.callType}
          partnerName={activeCall.partnerName}
          partnerAvatar={activeCall.partnerAvatar}
          token={activeCall.token || null}
          isCaller={activeCall.isCaller}
          onEndCall={handleEndCall}
        />
      )}

      {/* ───────────────────────────────────────────────── */}
      {/* WhatsApp-like Media Preview Modal                */}
      {/* ───────────────────────────────────────────────── */}
      {previewFile && previewUrl && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col"
          style={{ background: 'rgba(0,0,0,0.97)' }}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: previewIsVideo ? 'rgba(139,92,246,0.25)' : 'rgba(99,179,237,0.2)' }}>
                {previewIsVideo
                  ? <Video size={18} className="text-purple-400" />
                  : <ImageIcon size={18} className="text-blue-400" />
                }
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight truncate max-w-[200px]">
                  {previewFile.name}
                </p>
                <p className="text-gray-400 text-xs">
                  {previewIsVideo ? 'Video' : 'Image'} • {(previewFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closePreviewModal}
              disabled={isSendingMedia}
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
              aria-label="Close preview"
            >
              <X size={20} />
            </button>
          </div>

          {/* Media Preview Area */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
            {previewIsVideo ? (
              <video
                src={previewUrl}
                controls
                className="max-w-full max-h-full rounded-xl shadow-2xl"
                style={{ maxHeight: 'calc(100vh - 220px)' }}
              />
            ) : (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl select-none"
                style={{ maxHeight: 'calc(100vh - 220px)' }}
              />
            )}
          </div>

          {/* Caption Input + Send Button */}
          <div
            className="px-4 py-4 border-t border-white/10"
            style={{ background: 'rgba(15,15,20,0.95)' }}
          >
            <div className="max-w-2xl mx-auto flex items-center space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isSendingMedia) {
                      e.preventDefault();
                      handleSendMedia();
                    }
                  }}
                  placeholder={t('Add a caption...')}
                  disabled={isSendingMedia}
                  className="w-full bg-white/10 border border-white/20 rounded-full px-5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-purple-500/60 transition-all disabled:opacity-50"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={handleSendMedia}
                disabled={isSendingMedia}
                className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: isSendingMedia ? '#4f46e5' : 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}
                aria-label="Send media"
              >
                {isSendingMedia
                  ? <Loader2 size={18} className="text-white animate-spin" />
                  : <Send size={18} className="text-white" />
                }
              </button>
            </div>
            <p className="text-center text-gray-600 text-xs mt-2">
              Press Enter to send • Esc to cancel
            </p>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────── */}
      {/* Main Chat Layout                                 */}
      {/* ───────────────────────────────────────────────── */}
      <div className="flex h-[calc(100vh-4rem)] bg-white border border-gray-200 rounded-lg overflow-hidden animate-fade-in">
        {/* Conversations sidebar */}
        <div className={`w-full md:w-1/3 lg:w-1/4 border-r border-gray-200 ${userId ? 'hidden md:block' : 'block'}`}>
          <ChatUserList conversations={conversations} />
        </div>
        
        {/* Main chat area */}
        <div className={`flex-1 flex flex-col ${!userId ? 'hidden md:flex' : 'flex'}`}>
          {/* Chat header */}
          {chatPartner ? (
            <>
              <div className="border-b border-gray-200 p-4 flex justify-between items-center bg-white shadow-sm">
                <div className="flex items-center">
                  <button 
                    onClick={() => navigate('/chat')}
                    className="mr-3 p-1 rounded-full hover:bg-gray-100 md:hidden"
                    aria-label="Back to messages"
                  >
                    <ArrowLeft size={20} className="text-gray-600" />
                  </button>
                  <Avatar
                    src={chatPartner.avatarUrl}
                    alt={chatPartner.name}
                    size="md"
                    status={chatPartner.isOnline ? 'online' : 'offline'}
                    className="mr-3"
                  />
                  
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">{chatPartner.name}</h2>
                    <p className="text-sm text-gray-500">
                      {chatPartner.isOnline ? t('Online') : t('Offline')}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full p-2"
                    aria-label="Voice call"
                    onClick={() => handleStartCall('audio')}
                  >
                    <Phone size={18} />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full p-2"
                    aria-label="Video call"
                    onClick={() => handleStartCall('video')}
                  >
                    <Video size={18} />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full p-2"
                    aria-label="Info"
                  >
                    <Info size={18} />
                  </Button>
                </div>
              </div>
              
              {/* Messages container */}
              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className="flex-1 p-4 overflow-y-auto bg-gray-50/50"
              >
                {messages.length > 0 ? (
                  <div className="space-y-4">
                    {messages.map(message => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        isCurrentUser={message.senderId === currentUser.id}
                        partnerAvatarUrl={chatPartner.avatarUrl}
                        partnerName={chatPartner.name}
                        currentUserAvatarUrl={currentUser.avatarUrl}
                        currentUserName={currentUser.name}
                        onEdit={handleEditMessage}
                        onDelete={handleDeleteMessage}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center">
                    <div className="bg-gray-150 p-4 rounded-full mb-4">
                      <MessageCircle size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-700">{t('No messages yet')}</h3>
                    <p className="text-gray-500 mt-1">{t('Send a message to start the conversation')}</p>
                  </div>
                )}
              </div>
              
              {/* Message input */}
              <div className="border-t border-gray-200 p-4 bg-white relative">
                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                <form onSubmit={handleSendMessage} className="flex space-x-2 items-center w-full">
                  {isRecording ? (
                    <div className="flex-1 flex items-center justify-between bg-red-50 border border-red-200 rounded-full px-5 py-2 shadow-inner transition-all duration-300">
                      <div className="flex items-center space-x-3">
                        {isPaused ? (
                          <div className="flex items-center space-x-2">
                            <span className="h-3 w-3 rounded-full bg-gray-400"></span>
                            <span className="text-sm font-semibold text-gray-500">
                              {t('Recording Paused')}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            <span className="text-sm font-semibold text-red-600 animate-pulse">
                              {t('Recording Voice Note...')}
                            </span>
                          </div>
                        )}
                        <span className="text-sm font-bold text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-150 shadow-sm font-mono">
                          {formatTime(recordingTime)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {/* Pause / Resume Button */}
                        {isPaused ? (
                          <button
                            type="button"
                            onClick={resumeRecording}
                            className="rounded-full flex items-center justify-center h-[36px] w-[36px] bg-white hover:bg-primary-50 text-primary-600 border border-gray-200 shadow-sm transition-all focus:outline-none"
                            title="Resume Recording"
                          >
                            <Play size={18} className="fill-current text-primary-600 ml-0.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={pauseRecording}
                            className="rounded-full flex items-center justify-center h-[36px] w-[36px] bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 shadow-sm transition-all focus:outline-none"
                            title="Pause Recording"
                          >
                            <Pause size={18} className="text-gray-600" />
                          </button>
                        )}

                        {/* Discard Button */}
                        <button
                          type="button"
                          onClick={() => stopRecording(false)}
                          className="rounded-full flex items-center justify-center h-[36px] w-[36px] bg-white hover:bg-red-50 text-gray-500 hover:text-red-600 border border-gray-200 shadow-sm transition-all focus:outline-none"
                          title="Discard Recording"
                        >
                          <Trash2 size={18} className="transition-colors" />
                        </button>
                        
                        {/* Send Button */}
                        <button
                          type="button"
                          onClick={() => stopRecording(true)}
                          className="rounded-full flex items-center justify-center h-[36px] w-[36px] bg-primary-600 hover:bg-primary-700 text-white shadow-md transition-all focus:outline-none"
                          title="Send Voice Note"
                        >
                          <Send size={16} className="text-white ml-0.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="relative" ref={attachmentMenuRef}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={`rounded-full p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 ${showAttachmentMenu ? 'bg-gray-100 text-primary-600' : ''}`}
                          onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                          aria-label="Attach file"
                        >
                          <Paperclip size={20} className={showAttachmentMenu ? 'text-primary-600 rotate-45 transition-transform duration-200' : 'transition-transform duration-200'} />
                        </Button>

                        {/* Dropdown Menu */}
                        {showAttachmentMenu && (
                          <div className="absolute bottom-full left-0 mb-3 bg-white rounded-xl shadow-xl border border-gray-100 py-2 w-64 z-50 origin-bottom-left transition-all">
                            <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              {t('Send Attachment')}
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => triggerFileInput('pdf')}
                              className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                            >
                              <span className="p-2 bg-red-50 text-red-600 rounded-lg mr-3 flex items-center justify-center">
                                <FileText size={16} />
                              </span>
                              {t('Pitch Deck (PDF/PPT)')}
                            </button>

                            <button
                              type="button"
                              onClick={() => triggerFileInput('excel')}
                              className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
                            >
                              <span className="p-2 bg-green-50 text-green-600 rounded-lg mr-3 flex items-center justify-center">
                                <FileSpreadsheet size={16} />
                              </span>
                              {t('Financial Model (Excel)')}
                            </button>

                            <button
                              type="button"
                              onClick={() => triggerFileInput('legal')}
                              className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            >
                              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg mr-3 flex items-center justify-center">
                                <Scale size={16} />
                              </span>
                              {t('Legal / NDA (DOC/PDF)')}
                            </button>

                            <button
                              type="button"
                              onClick={() => triggerFileInput('image')}
                              className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                            >
                              <span className="p-2 bg-purple-50 text-purple-600 rounded-lg mr-3 flex items-center justify-center">
                                <ImageIcon size={16} />
                              </span>
                              {t('Product Image / Video')}
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <Input
                        type="text"
                        placeholder={t('Type a message...')}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        fullWidth
                        className="flex-1"
                      />
                      
                      {newMessage.trim() ? (
                        <button
                          type="submit"
                          className="rounded-full w-[44px] h-[44px] flex items-center justify-center bg-primary-600 hover:bg-primary-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/60 flex-shrink-0 shadow-md"
                          aria-label="Send message"
                        >
                          <Send size={20} className="text-white ml-0.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="rounded-full w-[44px] h-[44px] flex items-center justify-center bg-gray-50 hover:bg-primary-50 text-gray-500 hover:text-primary-600 border border-gray-300 hover:border-primary-300 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/60 flex-shrink-0 shadow-sm"
                          aria-label="Record voice note"
                        >
                          <Mic size={24} className="text-primary-600" />
                        </button>
                      )}
                    </>
                  )}
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-4 bg-gray-50/20">
              <div className="bg-gray-100 p-6 rounded-full mb-4">
                <MessageCircle size={48} className="text-gray-400" />
              </div>
              <h2 className="text-xl font-medium text-gray-700">{t('Select a conversation')}</h2>
              <p className="text-gray-500 mt-2 text-center max-w-xs">
                {t('Choose a contact from the sidebar or request connection to start a chat.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};