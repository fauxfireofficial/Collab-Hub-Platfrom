import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Send, Video, Info, ArrowLeft, Paperclip, FileSpreadsheet, 
  Scale, Image as ImageIcon, FileText, X, Loader2, Mic, Trash2, 
  Play, Pause, CheckCircle, CircleDollarSign, Layers, Lock, ShieldCheck, Briefcase, Calendar, Bot,
  History, Archive, AlertCircle
} from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { ChatMessage } from '../../components/chat/ChatMessage';
import { ChatUserList } from '../../components/chat/ChatUserList';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Message } from '../../types';
import api from '../../services/api';
import { MessageCircle } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

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
  const [isSupportActive, setIsSupportActive] = useState(false);
  const [showBotOptions, setShowBotOptions] = useState(false);
  const [showArchivesModal, setShowArchivesModal] = useState(false);
  const [archivesList, setArchivesList] = useState<any[]>([]);

  // Info Sidebar State
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  // Direct Payment States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isEscrow, setIsEscrow] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Payment Receipt Modal States
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    id: string;
    type: 'deposit' | 'withdraw' | 'transfer' | 'escrow';
    amount: number;
    recipientName?: string;
    senderName?: string;
    date: string;
    status: string;
  } | null>(null);
  
  // Call/Socket States
  const [socket, setSocket] = useState<Socket | null>(null);

  // Meeting Booking States in Info Panel
  const [showBookForm, setShowBookForm] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDesc, setMeetingDesc] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingStartTime, setMeetingStartTime] = useState('');
  const [meetingEndTime, setMeetingEndTime] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [partnerMeeting, setPartnerMeeting] = useState<any | null>(null);
  
  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  const downloadReceiptImage = () => {
    if (!receiptData) return;
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check theme
    const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');

    // Theme variables
    const bgGradStart = isDark ? '#1e1b4b' : '#f5f3ff';
    const bgGradEnd = isDark ? '#0f172a' : '#eff6ff';
    const outerBorder = isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.15)';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.04)' : '#ffffff';
    const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(99, 102, 241, 0.1)';
    const brandColor = isDark ? '#6366f1' : '#4f46e5';
    const brandText = isDark ? '#ffffff' : '#1e1b4b';
    const taglineText = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(30, 27, 75, 0.5)';
    const successBg = isDark ? '#10b981' : '#059669';
    const amountText = isDark ? '#ffffff' : '#0f172a';
    const labelText = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.55)';
    const valueText = isDark ? '#ffffff' : '#1e293b';
    const dividerColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)';
    const footerText = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(15, 23, 42, 0.4)';

    // 1. Draw modern gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, 800);
    gradient.addColorStop(0, bgGradStart);
    gradient.addColorStop(1, bgGradEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 800);

    // 2. Draw outer border/decorations
    ctx.strokeStyle = outerBorder;
    ctx.lineWidth = 10;
    ctx.strokeRect(15, 15, 570, 770);

    // 3. Draw Branding Logo
    ctx.fillStyle = brandColor;
    ctx.beginPath();
    ctx.arc(300, 85, 25, 0, Math.PI * 2);
    ctx.fill();
    
    // Letter inside logo mark
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', 300, 93);
    
    ctx.fillStyle = brandText;
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillText('NEXUS', 300, 150);
    
    ctx.fillStyle = taglineText;
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText('SECURE PAYMENTS & ESCROW', 300, 172);

    // 4. Draw Receipt Box card background
    ctx.fillStyle = cardBg;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(50, 200, 500, 480, 20);
    } else {
      ctx.rect(50, 200, 500, 480);
    }
    ctx.fill();
    ctx.strokeStyle = cardBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 5. Draw Success Checkmark
    ctx.fillStyle = successBg;
    ctx.beginPath();
    ctx.arc(300, 250, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // draw white check mark
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(288, 250);
    ctx.lineTo(297, 259);
    ctx.lineTo(314, 241);
    ctx.stroke();

    ctx.fillStyle = successBg;
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TRANSACTION SUCCESSFUL', 300, 305);

    // 6. Draw Transaction Amount
    ctx.fillStyle = amountText;
    ctx.font = 'bold 36px Inter, sans-serif';
    const formattedAmt = `$${receiptData.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    ctx.fillText(formattedAmt, 300, 355);

    // 7. Draw Divider
    ctx.strokeStyle = dividerColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, 385);
    ctx.lineTo(520, 385);
    ctx.stroke();

    // 8. Draw Details
    const details = [
      { label: 'TRANSACTION ID', value: receiptData.id },
      { label: 'DATE & TIME', value: receiptData.date },
      { label: 'TYPE', value: receiptData.type.toUpperCase() },
      { label: 'SENDER', value: receiptData.senderName || 'N/A' },
      { label: 'RECIPIENT', value: receiptData.recipientName || 'N/A' },
      { label: 'STATUS', value: receiptData.status.toUpperCase() }
    ];

    ctx.textAlign = 'left';
    let y = 430;
    details.forEach(item => {
      ctx.fillStyle = labelText;
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText(item.label, 90, y);

      ctx.fillStyle = valueText;
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(item.value, 510, y);
      ctx.textAlign = 'left';

      y += 42;
    });

    // 9. Draw Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = footerText;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Thank you for using Nexus. This receipt is automatically generated.', 300, 745);

    // 10. Download
    const link = document.createElement('a');
    link.download = `receipt_${receiptData.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleDirectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatPartner || !currentUser) return;
    
    if (currentUser.role === 'investor' && !agreementAccepted) {
      toast.error('You must accept the Terms of Investment.');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const amountInUSD = parseFloat(paymentAmount);
      if (isNaN(amountInUSD) || amountInUSD <= 0) {
        toast.error('Please enter a valid amount.');
        return;
      }
      
      const idempotencyKey = 'chat_' + Math.random().toString(36).substring(2, 11) + Date.now();
      const sendEscrow = currentUser.role === 'investor' ? isEscrow : false;
      const sendAgreement = currentUser.role === 'investor' ? agreementAccepted : true;
      
      const response = await api.post('/payments/transfer', { 
        recipientId: chatPartner.id || chatPartner._id, 
        amount: amountInUSD,
        isEscrow: sendEscrow,
        agreementAccepted: sendAgreement,
        milestoneTitle: sendEscrow ? milestoneTitle || undefined : undefined,
        idempotencyKey
      });
      
      if (sendEscrow) {
        toast.success(`Escrow initialized: held $${amountInUSD.toLocaleString()} until milestone release.`);
      } else {
        toast.success(`Successfully transferred $${amountInUSD.toLocaleString()}!`);
      }
      
      const tx = response.data.transaction;
      
      setReceiptData({
        id: tx?.id || tx?._id || 'txf_' + Math.random().toString(36).substring(2, 6),
        type: tx?.type || (sendEscrow ? 'escrow' : 'transfer'),
        amount: amountInUSD,
        recipientName: chatPartner.startupName ? `${chatPartner.name} (${chatPartner.startupName})` : chatPartner.name,
        senderName: currentUser.name,
        date: format(new Date(tx?.createdAt || Date.now()), 'dd MMM yyyy, hh:mm a'),
        status: tx?.status || 'completed'
      });

      setShowPaymentModal(false);
      setPaymentAmount('');
      setIsEscrow(false);
      setAgreementAccepted(false);
      setMilestoneTitle('');
      setShowReceipt(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Payment transfer failed.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

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

  const fetchActiveMeeting = async () => {
    if (!userId) return;
    try {
      const res = await api.get('/meetings');
      // Find an active meeting (pending or accepted) with this chat partner
      const activeMeeting = res.data.find((m: any) => 
        (m.organizer?.id === userId || m.organizer?._id === userId || m.invitee?.id === userId || m.invitee?._id === userId) && 
        (m.status === 'pending' || m.status === 'accepted')
      );
      setPartnerMeeting(activeMeeting || null);
    } catch (err) {
      console.error('Error fetching partner meeting:', err);
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
          const newMessages = res.data.map((m: any) => ({
            id: m._id || m.id,
            senderId: m.senderId,
            receiverId: m.receiverId,
            content: m.content,
            timestamp: m.createdAt || m.timestamp,
            isRead: m.isRead,
            isEdited: m.isEdited || false
          }));

          setMessages(prev => {
            if (JSON.stringify(prev) === JSON.stringify(newMessages)) {
              return prev;
            }
            return newMessages;
          });
          // Fetch partner details if not loaded
          let partnerData = chatPartner;
          if (!chatPartner || (chatPartner._id !== userId && chatPartner.id !== userId) || currentUser.role === 'admin') {
            const partnerRes = await api.get(`/users/profile/${userId}`);
            partnerData = partnerRes.data;
            setChatPartner(partnerData);
          }

          // Fetch support session state if applicable
          if (currentUser.role !== 'admin' && partnerData?.role === 'admin') {
            const meRes = await api.get(`/users/profile/${currentUser.id}`);
            setIsSupportActive(meRes.data.supportSessionActive);
          } else if (currentUser.role === 'admin' && partnerData?.role !== 'admin') {
            setIsSupportActive(partnerData?.supportSessionActive);
          }
        } catch (err) {
          console.error('Error fetching chat messages:', err);
        }
      }
    };

    if (currentUser && userId) {
      fetchMessages();
      fetchActiveMeeting();
      const interval = setInterval(() => {
        fetchMessages();
        fetchActiveMeeting();
      }, 3000);
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

  const handleSendBotOption = async (option: string) => {
    const text = `I need help with: ${option}`;
    if (!currentUser || !userId) return;
    
    try {
      const res = await api.post('/chat/send', {
        receiverId: userId,
        content: text
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

      isAtBottomRef.current = true;
      setMessages(prev => [...prev, sentMsg]);
      setShowBotOptions(false);
      fetchConversations();
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleStartSupport = async () => {
    try {
      await api.post('/users/support/start');
      setIsSupportActive(true);
      setShowBotOptions(true);
    } catch (err) {
      toast.error('Could not start support session');
    }
  };

  const handleEndSupport = async () => {
    try {
      await api.post('/users/support/end', { userId: chatPartner?.id || chatPartner?._id });
      setIsSupportActive(false);
      
      // Admin sends an automated closing message
      await api.post('/chat/send', {
        receiverId: chatPartner?.id || chatPartner?._id,
        content: "Admin has closed this support session. If you need further assistance, please start a new chat."
      });
      
      toast.success('Support session ended and archived');
      // Update local messages array to clear it out since it's archived
      setMessages([]);
    } catch (err) {
      toast.error('Could not end support session');
    }
  };

  const fetchArchives = async () => {
    if (!chatPartner) return;
    try {
      const res = await api.get(`/users/support/archives/${chatPartner.id || chatPartner._id}`);
      setArchivesList(res.data);
      setShowArchivesModal(true);
    } catch (err) {
      toast.error('Could not fetch archives');
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
  
  // Meeting Booking Handler
  const handleBookMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatPartner || !currentUser) return;
    setIsBooking(true);

    const startDateTime = new Date(`${meetingDate}T${meetingStartTime}`);
    const endDateTime = new Date(`${meetingDate}T${meetingEndTime}`);

    const isBefore = (date1: Date, date2: Date) => date1.getTime() < date2.getTime();
    if (isBefore(endDateTime, startDateTime)) {
      toast.error(t('End time must be after start time.'));
      setIsBooking(false);
      return;
    }

    try {
      await api.post('/meetings/schedule', {
        title: meetingTitle,
        description: meetingDesc,
        inviteeId: chatPartner.id || chatPartner._id,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
      });

      toast.success(t('Meeting scheduled successfully!'));
      // Reset form
      setMeetingTitle('');
      setMeetingDesc('');
      setMeetingDate('');
      setMeetingStartTime('');
      setMeetingEndTime('');
      setShowBookForm(false);
    } catch (error: any) {
      console.error('Failed to schedule meeting:', error);
      const msg = error.response?.data?.message || t('Failed to schedule meeting.');
      toast.error(msg);
    } finally {
      setIsBooking(false);
    }
  };

  if (!currentUser) return null;
  
  return (
    <>


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
      <div className="flex h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden animate-fade-in">
        {/* Conversations sidebar */}
        <div className={`w-full md:w-1/3 lg:w-1/4 border-r border-gray-200 dark:border-gray-800 ${userId ? 'hidden md:block' : 'block'}`}>
          <ChatUserList conversations={conversations} />
        </div>
        
        {/* Main chat area */}
        <div className={`flex-1 flex flex-col ${!userId ? 'hidden md:flex' : 'flex'}`}>
          {/* Chat header */}
          {chatPartner ? (
            <>
              <div className="border-b border-gray-200 dark:border-gray-800 p-4 flex justify-between items-center bg-white dark:bg-gray-900 shadow-sm">
                <div className="flex items-center">
                  <button 
                    onClick={() => navigate('/chat')}
                    className="mr-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden"
                    aria-label="Back to messages"
                  >
                    <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
                  </button>
                  <Avatar
                    src={chatPartner.avatarUrl}
                    alt={chatPartner.name}
                    size="md"
                    status={chatPartner.isOnline ? 'online' : 'offline'}
                    className="mr-3"
                  />
                  
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">{chatPartner.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {chatPartner.isOnline ? t('Online') : t('Offline')}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2 items-center">
                  {currentUser.role === 'admin' && isSupportActive && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded-full px-3 py-1 font-bold bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-900/50 shadow-sm transition-colors"
                      onClick={handleEndSupport}
                    >
                      <X size={14} className="mr-1 inline" />
                      End Chat
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`rounded-full p-2 ${showInfoPanel ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'text-gray-550'}`}
                    aria-label="Info"
                    onClick={() => setShowInfoPanel(!showInfoPanel)}
                  >
                    <Info size={18} />
                  </Button>
                </div>
              </div>
              
              {/* Messages container */}
              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className="flex-1 p-4 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50"
              >
                {messages.length > 0 || (chatPartner && chatPartner.role === 'admin') ? (
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
                    {/* Support Bot Greeting */}
                    {showBotOptions && (
                      <div className="flex justify-start mb-6 w-full animate-fade-in">
                        <div className="flex gap-3 max-w-[85%] relative">
                          <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                            <Bot size={16} />
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 mb-1 ml-1 block font-medium">Nexus Support Bot</span>
                            <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 dark:border-gray-700">
                              <p className="mb-3 text-sm">Hello! I am the Nexus Support Bot. Please select the category that best describes your issue so we can direct you to the right admin:</p>
                              <div className="flex flex-col gap-2">
                                {[
                                  "Payment or Wallet Issue",
                                  "Profile or Account Settings",
                                  "Escrow or Contract Dispute",
                                  "Report a Bug",
                                  "Other"
                                ].map((option) => (
                                  <button 
                                    key={option}
                                    type="button"
                                    onClick={() => handleSendBotOption(option)}
                                    className="text-left px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-xs font-semibold rounded-lg transition-colors border border-indigo-100 dark:border-indigo-800/30"
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center">
                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
                      <MessageCircle size={32} className="text-gray-400 dark:bg-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">{t('No messages yet')}</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('Send a message to start the conversation')}</p>
                  </div>
                )}
              </div>
              
              {/* Message input */}
              {currentUser.role !== 'admin' && chatPartner?.role === 'admin' && !isSupportActive ? (
                <div className="border-t border-gray-200 dark:border-gray-800 p-8 bg-white dark:bg-gray-900 flex flex-col justify-center items-center">
                  <Bot size={40} className="text-indigo-200 dark:text-indigo-900/50 mb-3" />
                  <p className="text-sm text-gray-500 mb-4 font-medium text-center">Start a support session to talk with our team.</p>
                  <Button
                    onClick={handleStartSupport}
                    size="lg"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8 py-2.5 font-bold shadow-md flex items-center gap-2"
                  >
                    <MessageCircle size={18} />
                    Start Support Chat
                  </Button>
                </div>
              ) : (
              <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900 relative">
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
                          className={`rounded-full p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 ${showAttachmentMenu ? 'bg-gray-100 dark:bg-gray-800 text-primary-600 dark:text-primary-400' : ''}`}
                          onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                          aria-label="Attach file"
                        >
                          <Paperclip size={20} className={showAttachmentMenu ? 'text-primary-600 rotate-45 transition-transform duration-200' : 'transition-transform duration-200'} />
                        </Button>

                        {/* Dropdown Menu */}
                        {showAttachmentMenu && (
                          <div className="absolute bottom-full left-0 mb-3 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 w-64 z-50 origin-bottom-left transition-all">
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
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-4 bg-gray-50/20 dark:bg-gray-900/50">
              <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-4">
                <MessageCircle size={48} className="text-gray-400 dark:text-gray-500" />
              </div>
              <h2 className="text-xl font-medium text-gray-700 dark:text-gray-300">{t('Select a conversation')}</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-center max-w-xs">
                {t('Choose a contact from the sidebar or request connection to start a chat.')}
              </p>
            </div>
          )}
        </div>

        {/* Info panel */}
        {showInfoPanel && chatPartner && (
          <div className="w-80 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col h-full overflow-hidden shrink-0 animate-fade-in">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <h3 className="font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider">{t('Contact Information')}</h3>
              <button 
                onClick={() => setShowInfoPanel(false)} 
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile Header Card */}
              <div className="text-center pb-6 border-b border-gray-100 dark:border-gray-800">
                <div className="flex justify-center mb-3">
                  <Avatar 
                    src={chatPartner.avatarUrl || ''} 
                    alt={chatPartner.name} 
                    size="xl" 
                    className="shadow-md ring-2 ring-indigo-100 dark:ring-indigo-900/50" 
                  />
                </div>
                <h4 className="font-semibold text-lg text-gray-900 dark:text-white leading-snug">{chatPartner.name}</h4>
                <div className="mt-1 flex items-center justify-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${chatPartner.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{chatPartner.role}</span>
                </div>

                {/* Send Payment Button */}
                <Button 
                  fullWidth 
                  onClick={() => setShowPaymentModal(true)}
                  className="mt-5 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 py-2 shadow-md shadow-indigo-600/10 rounded-lg text-sm font-medium"
                >
                  <CircleDollarSign size={16} />
                  {t('Send Payment')}
                </Button>
              </div>

              {/* Bio Section */}
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('About')}</h5>
                <p className="text-sm text-gray-650 dark:text-gray-300 leading-relaxed bg-gray-50/50 dark:bg-gray-950/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                  {chatPartner.bio || t('No bio provided.')}
                </p>
              </div>

              {/* Role-Specific details */}
              {chatPartner.role === 'entrepreneur' ? (
                <div className="space-y-4">
                  <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('Startup Details')}</h5>
                  
                  {chatPartner.startupName && (
                    <div className="flex gap-3 items-start">
                      <Briefcase size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-400">{t('Company Name')}</div>
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-250">{chatPartner.startupName}</div>
                      </div>
                    </div>
                  )}

                  {chatPartner.industry && (
                    <div className="flex gap-3 items-start">
                      <Layers size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-400">{t('Industry')}</div>
                        <div className="text-sm text-gray-800 dark:text-gray-250">{chatPartner.industry}</div>
                      </div>
                    </div>
                  )}

                  {chatPartner.fundingNeeded && (
                    <div className="flex gap-3 items-start bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/30 p-3 rounded-lg">
                      <CircleDollarSign size={16} className="text-indigo-650 dark:text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{t('Funding Needed')}</div>
                        <div className="text-sm font-extrabold text-indigo-900 dark:text-white">${parseFloat(chatPartner.fundingNeeded).toLocaleString()}</div>
                      </div>
                    </div>
                  )}

                  {chatPartner.pitchSummary && (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400 font-medium">{t('Pitch Summary')}</div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed italic bg-gray-50/20 p-2.5 rounded border border-gray-100 dark:border-gray-800">
                        "{chatPartner.pitchSummary}"
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Investor Details
                <div className="space-y-4">
                  <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('Investment Profile')}</h5>
                  
                  {(chatPartner.minimumInvestment || chatPartner.maximumInvestment) && (
                    <div className="flex gap-3 items-start bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/30 p-3 rounded-lg">
                      <CircleDollarSign size={16} className="text-indigo-650 dark:text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{t('Investment Range')}</div>
                        <div className="text-sm font-extrabold text-indigo-900 dark:text-white">
                          ${parseFloat(chatPartner.minimumInvestment || '0').toLocaleString()} - ${parseFloat(chatPartner.maximumInvestment || '0').toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}

                  {chatPartner.investmentStage && chatPartner.investmentStage.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400">{t('Preferred Stages')}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {chatPartner.investmentStage.map((s: string) => (
                          <span key={s} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-805 text-gray-600 dark:text-gray-300 rounded text-[10px] uppercase font-semibold">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {chatPartner.investmentInterests && chatPartner.investmentInterests.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400">{t('Interests')}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {chatPartner.investmentInterests.map((interest: string) => (
                          <span key={interest} className="px-2 py-0.5 bg-indigo-55/60 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 rounded text-[10px] font-semibold">
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Support Tools for Admin */}
              {currentUser?.role === 'admin' && (
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <History size={13} className="text-indigo-500" />
                    {t('Support Management')}
                  </h5>
                  <Button 
                    fullWidth 
                    variant="outline"
                    onClick={fetchArchives}
                    className="flex items-center justify-center gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                  >
                    <History size={16} />
                    {t('View Past Sessions')}
                  </Button>
                </div>
              )}

              {/* Book a Meeting Section */}
              <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={13} className="text-indigo-500" />
                  {t('Book a Meeting')}
                </h5>
                
                {partnerMeeting ? (
                  partnerMeeting.status === 'accepted' ? (
                    <div className="bg-emerald-50/40 dark:bg-emerald-950/15 p-3 rounded-xl border border-emerald-100/80 dark:border-emerald-900/30 space-y-3 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">{t('Confirmed')}</span>
                        <span className="text-[10px] text-gray-550 dark:text-gray-450 font-sans font-semibold">
                          {format(new Date(partnerMeeting.startTime), 'p')}
                        </span>
                      </div>
                      <div>
                        <h6 className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{partnerMeeting.title}</h6>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {partnerMeeting.description || t('No description.')}
                        </p>
                      </div>
                      <Button
                        fullWidth
                        onClick={() => navigate(partnerMeeting.roomUrl)}
                        className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2 shadow-md rounded-lg font-medium transition-all"
                      >
                        <Video size={14} />
                        {t('Join Meeting')}
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-950/30 p-3 rounded-xl border border-gray-150 dark:border-gray-800 space-y-3 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider bg-amber-50/55 dark:bg-amber-950/30 px-2 py-0.5 rounded">{t('Pending')}</span>
                        <span className="text-[10px] text-gray-550 dark:text-gray-450 font-sans font-semibold">
                          {format(new Date(partnerMeeting.startTime), 'p')}
                        </span>
                      </div>
                      <div>
                        <h6 className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{partnerMeeting.title}</h6>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {partnerMeeting.description || t('No description.')}
                        </p>
                      </div>
                      <Button
                        fullWidth
                        disabled
                        className="flex items-center justify-center gap-2 bg-gray-250 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-xs py-2 rounded-lg font-medium cursor-not-allowed border border-gray-200/50 dark:border-gray-800"
                      >
                        <Calendar size={14} />
                        {t('Awaiting Acceptance')}
                      </Button>
                    </div>
                  )
                ) : !showBookForm ? (
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => setShowBookForm(true)}
                    className="flex items-center justify-center gap-2 border-indigo-100 dark:border-indigo-900/60 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-xs py-2 shadow-sm rounded-lg"
                  >
                    <Video size={14} />
                    {t('Schedule Meeting')}
                  </Button>
                ) : (
                  <form onSubmit={handleBookMeeting} className="space-y-3 bg-gray-50/50 dark:bg-gray-950/30 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800">
                    <Input
                      label={t('Meeting Title')}
                      placeholder={t('e.g. Project Alignment')}
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                      required
                      fullWidth
                      className="text-xs text-gray-900 dark:text-white"
                    />
                    <Input
                      label={t('Description')}
                      placeholder={t('Optional')}
                      value={meetingDesc}
                      onChange={(e) => setMeetingDesc(e.target.value)}
                      fullWidth
                      className="text-xs text-gray-900 dark:text-white"
                    />
                    <div className="space-y-2">
                      <Input
                        label={t('Date')}
                        type="date"
                        value={meetingDate}
                        onChange={(e) => setMeetingDate(e.target.value)}
                        required
                        fullWidth
                        className="text-xs text-gray-900 dark:text-white font-sans"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label={t('Start Time')}
                          type="time"
                          value={meetingStartTime}
                          onChange={(e) => setMeetingStartTime(e.target.value)}
                          required
                          fullWidth
                          className="text-xs text-gray-900 dark:text-white font-sans"
                        />
                        <Input
                          label={t('End Time')}
                          type="time"
                          value={meetingEndTime}
                          onChange={(e) => setMeetingEndTime(e.target.value)}
                          required
                          fullWidth
                          className="text-xs text-gray-900 dark:text-white font-sans"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowBookForm(false)}
                        className="flex-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs py-1.5"
                      >
                        {t('Cancel')}
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isBooking}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-750 text-white text-xs py-1.5 shadow-sm"
                      >
                        {isBooking ? <Loader2 className="animate-spin" size={14} /> : t('Confirm')}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Direct Payment / Transfer Modal */}
      {showPaymentModal && chatPartner && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-none">
            <CardHeader className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 p-4">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                {currentUser?.role === 'investor' ? 'Send Startup Investment' : 'Transfer Funds'}
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </CardHeader>
            <CardBody className="p-6">
              <form onSubmit={handleDirectPayment} className="space-y-4">
                {/* Recipient info panel */}
                <div className="bg-gray-50 dark:bg-gray-950/60 p-3 rounded-lg flex items-center gap-3 border border-gray-100 dark:border-gray-800">
                  <Avatar src={chatPartner.avatarUrl} alt={chatPartner.name} size="md" />
                  <div className="leading-tight">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Recipient</div>
                    <div className="font-bold text-sm text-gray-900 dark:text-white">{chatPartner.name}</div>
                    {chatPartner.startupName && <div className="text-xs text-gray-500">{chatPartner.startupName}</div>}
                  </div>
                </div>

                <Input
                  label="Amount to Transfer (USD)"
                  type="number"
                  placeholder="e.g. 5000"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                  fullWidth
                />

                {/* Escrow and Terms Section for Investors */}
                {currentUser?.role === 'investor' && (
                  <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-sm font-semibold text-gray-900 dark:text-white">Hold in Escrow</label>
                        <p className="text-xs text-gray-500">Lock funds until proposed milestone completion.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={isEscrow}
                        onChange={(e) => setIsEscrow(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 bg-gray-100 border-gray-300 focus:ring-indigo-500 focus:ring-2 focus:ring-offset-2"
                      />
                    </div>

                    {isEscrow && (
                      <Input
                        label="Milestone/Escrow Agreement Title"
                        placeholder="e.g. Prototype Development Milestone"
                        value={milestoneTitle}
                        onChange={(e) => setMilestoneTitle(e.target.value)}
                        required
                        fullWidth
                      />
                    )}

                    <div className="flex gap-2 items-start bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 p-3 rounded-lg text-xs text-gray-600 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={agreementAccepted}
                        onChange={(e) => setAgreementAccepted(e.target.checked)}
                        className="w-3.5 h-3.5 rounded mt-0.5 shrink-0 accent-indigo-600"
                        required
                      />
                      <label>
                        I agree to the <span className="font-semibold text-indigo-600 dark:text-indigo-400 underline cursor-pointer">Terms of Startup Investment & Escrow Placement Policy</span>.
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
                  <Button variant="outline" type="button" fullWidth onClick={() => setShowPaymentModal(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    fullWidth 
                    isLoading={isSubmittingPayment}
                    disabled={currentUser?.role === 'investor' && !agreementAccepted}
                  >
                    Execute Transfer
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Payment Receipt Modal */}
      {showReceipt && receiptData && (
        <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border border-gray-100 dark:border-none bg-gradient-to-br from-white to-gray-50 dark:from-indigo-950 dark:to-slate-900 text-gray-900 dark:text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <button 
                onClick={() => setShowReceipt(false)} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <CardBody className="p-8 text-center flex flex-col items-center">
              {/* Branding */}
              <div className="mb-4">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm dark:shadow-lg">
                  <span className="font-bold text-indigo-600 dark:text-white text-xl">N</span>
                </div>
                <h4 className="font-bold text-lg tracking-wider text-gray-900 dark:text-white">NEXUS</h4>
                <p className="text-[10px] text-indigo-500 dark:text-indigo-300 font-medium tracking-widest uppercase">Secure Payments & Escrow</p>
              </div>

              {/* Checkmark icon */}
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-full flex items-center justify-center mb-4 mt-2">
                <CheckCircle size={32} className="animate-bounce" />
              </div>
              
              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wider uppercase mb-1">Transaction Successful</span>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-6">
                ${receiptData.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h2>

              {/* Receipt Details Box */}
              <div className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-sm text-left space-y-3 mb-6 shadow-sm dark:shadow-none">
                <div className="flex justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Transaction ID</span>
                  <span className="font-mono text-xs text-gray-900 dark:text-white select-all">{receiptData.id}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Date & Time</span>
                  <span className="text-gray-900 dark:text-white text-xs">{receiptData.date}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Type</span>
                  <span className="text-gray-900 dark:text-white font-semibold text-xs uppercase">{receiptData.type}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Sender</span>
                  <span className="text-gray-900 dark:text-white text-xs">{receiptData.senderName || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Recipient</span>
                  <span className="text-gray-900 dark:text-white text-xs">{receiptData.recipientName || 'N/A'}</span>
                </div>
              </div>

              <div className="w-full flex gap-3">
                <Button 
                  variant="outline" 
                  fullWidth 
                  onClick={() => setShowReceipt(false)}
                  className="border-gray-300 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  Close
                </Button>
                <Button 
                  fullWidth 
                  onClick={downloadReceiptImage}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30"
                >
                  Download Receipt
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Support Archives Modal */}
      {showArchivesModal && (
        <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                  <History size={16} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Past Support Sessions</h3>
                  {chatPartner && <p className="text-xs text-gray-500 dark:text-gray-400">{chatPartner.name}</p>}
                </div>
              </div>
              <button
                onClick={() => setShowArchivesModal(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {archivesList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                    <Archive size={24} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No past sessions found</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Closed sessions will appear here</p>
                </div>
              ) : (
                archivesList.map((archive: any, idx: number) => (
                  <div key={archive._id} className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                    {/* Session Header */}
                    <div className="flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-[10px] font-bold uppercase">Session #{archivesList.length - idx}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(archive.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded">
                        {archive.messages.length} messages
                      </span>
                    </div>

                    {/* Messages */}
                    <div className="p-4 space-y-2 max-h-64 overflow-y-auto bg-white dark:bg-gray-900">
                      {archive.messages.map((msg: any, i: number) => {
                        const isUserMsg = msg.senderId?.toString() === (chatPartner?.id || chatPartner?._id)?.toString();
                        return (
                          <div
                            key={i}
                            className={`flex ${ isUserMsg ? 'justify-start' : 'justify-end'}`}
                          >
                            <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                              isUserMsg
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
                                : 'bg-indigo-600 text-white rounded-tr-none'
                            }`}>
                              <p>{msg.content}</p>
                              <p className={`text-[10px] mt-1 ${ isUserMsg ? 'text-gray-400' : 'text-indigo-200'}`}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
              <Button
                fullWidth
                variant="outline"
                onClick={() => setShowArchivesModal(false)}
                className="text-gray-600 dark:text-gray-400"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};