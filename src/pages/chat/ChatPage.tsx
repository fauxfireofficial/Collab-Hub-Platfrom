import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Phone, Video, Info, ArrowLeft, Paperclip, FileSpreadsheet, Scale, Image as ImageIcon, FileText } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ChatMessage } from '../../components/chat/ChatMessage';
import { ChatUserList } from '../../components/chat/ChatUserList';
import { useAuth } from '../../context/AuthContext';
import { Message } from '../../types';
import api from '../../services/api';
import { MessageCircle } from 'lucide-react';

export const ChatPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversations, setConversations] = useState<any[]>([]);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const [chatPartner, setChatPartner] = useState<any | null>(null);
  
  // File Upload / Attachment States
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [activeUploadType, setActiveUploadType] = useState<'pdf' | 'excel' | 'legal' | 'image' | null>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    try {
      const formData = new FormData();
      formData.append('document', file);
      
      const uploadRes = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const docData = uploadRes.data;
      
      const attachmentPayload = {
        attachment: true,
        fileType: activeUploadType,
        fileName: docData.name,
        fileUrl: docData.url,
        fileSize: docData.size
      };
      
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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setActiveUploadType(null);
    }
  };
  
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
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
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
  
  if (!currentUser) return null;
  
  return (
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
                    {chatPartner.isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full p-2"
                  aria-label="Voice call"
                >
                  <Phone size={18} />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full p-2"
                  aria-label="Video call"
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
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50">
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
                  <h3 className="text-lg font-medium text-gray-700">No messages yet</h3>
                  <p className="text-gray-500 mt-1">Send a message to start the conversation</p>
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

              <form onSubmit={handleSendMessage} className="flex space-x-2 items-center">
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
                        Send Attachment
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => triggerFileInput('pdf')}
                        className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <span className="p-2 bg-red-50 text-red-600 rounded-lg mr-3 flex items-center justify-center">
                          <FileText size={16} />
                        </span>
                        Pitch Deck (PDF/PPT)
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerFileInput('excel')}
                        className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
                      >
                        <span className="p-2 bg-green-50 text-green-600 rounded-lg mr-3 flex items-center justify-center">
                          <FileSpreadsheet size={16} />
                        </span>
                        Financial Model (Excel)
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerFileInput('legal')}
                        className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        <span className="p-2 bg-blue-50 text-blue-600 rounded-lg mr-3 flex items-center justify-center">
                          <Scale size={16} />
                        </span>
                        Legal / NDA (DOC/PDF)
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerFileInput('image')}
                        className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                      >
                        <span className="p-2 bg-purple-50 text-purple-600 rounded-lg mr-3 flex items-center justify-center">
                          <ImageIcon size={16} />
                        </span>
                        Product Demo / Image
                      </button>
                    </div>
                  )}
                </div>
                
                <Input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  fullWidth
                  className="flex-1"
                />
                
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newMessage.trim()}
                  className="rounded-full p-2 w-10 h-10 flex items-center justify-center"
                  aria-label="Send message"
                >
                  <Send size={18} />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-4 bg-gray-50/20">
            <div className="bg-gray-100 p-6 rounded-full mb-4">
              <MessageCircle size={48} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-medium text-gray-700">Select a conversation</h2>
            <p className="text-gray-500 mt-2 text-center max-w-xs">
              Choose a contact from the sidebar or request connection to start a chat.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};