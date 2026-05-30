import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';

const formatMessagePreview = (content: string): string => {
  if (!content) return '';
  if (content.trim().startsWith('{"attachment":')) {
    try {
      const data = JSON.parse(content);
      if (data && data.fileUrl) {
        const type = data.fileType;
        if (type === 'image') return '📷 Image';
        if (type === 'pdf') return '📄 Pitch Deck';
        if (type === 'excel') return '📊 Financial Model';
        if (type === 'legal') return '📋 Legal / NDA';
        return '📎 Attachment';
      }
    } catch (e) {
      // fallback
    }
  }
  return content;
};

interface ChatUserListProps {
  conversations: any[];
}

export const ChatUserList: React.FC<ChatUserListProps> = ({ conversations }) => {
  const navigate = useNavigate();
  const { userId: activeUserId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  
  if (!currentUser) return null;
  
  const handleSelectUser = (userId: string) => {
    navigate(`/chat/${userId}`);
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 w-full md:w-64 overflow-y-auto h-full">
      <div className="py-4">
        <h2 className="px-4 text-lg font-semibold text-gray-800 dark:text-white mb-4">Messages</h2>
        
        <div className="space-y-1">
          {conversations && conversations.length > 0 ? (
            conversations.map(conversation => {
              const otherUser = conversation.partner;
              if (!otherUser) return null;
              
              const otherUserId = otherUser._id || otherUser.id || conversation.id;
              const lastMessage = conversation.lastMessage;
              const isActive = activeUserId === otherUserId;
              
              const msgTimestamp = lastMessage ? (lastMessage.createdAt || lastMessage.timestamp) : null;
              
              return (
                <div
                  key={conversation.id || otherUserId}
                  className={`px-4 py-3 flex cursor-pointer transition-colors duration-200 ${
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/30 border-l-4 border-primary-600'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-4 border-transparent'
                  }`}
                  onClick={() => handleSelectUser(otherUserId)}
                >
                  <Avatar
                    src={otherUser.avatarUrl}
                    alt={otherUser.name}
                    size="md"
                    status={otherUser.isOnline ? 'online' : 'offline'}
                    className="mr-3 flex-shrink-0"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {otherUser.name}
                      </h3>
                      
                      {msgTimestamp && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDistanceToNow(new Date(msgTimestamp), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center mt-1">
                      {lastMessage && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                          {lastMessage.senderId === currentUser.id ? 'You: ' : ''}
                          {formatMessagePreview(lastMessage.content)}
                        </p>
                      )}
                      
                      {lastMessage && !lastMessage.isRead && lastMessage.senderId !== currentUser.id && (
                        <Badge variant="primary" size="sm" rounded>New</Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-500">No conversations yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};