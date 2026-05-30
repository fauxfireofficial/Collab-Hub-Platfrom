import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { getConversationsForUser } from '../../data/messages';
import { ChatUserList } from '../../components/chat/ChatUserList';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  if (!user) return null;
  
  const conversations = getConversationsForUser(user.id);
  
  return (
    <div className="h-[calc(100vh-8rem)] bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in">
      {conversations.length > 0 ? (
        <ChatUserList conversations={conversations} />
      ) : (
        <div className="h-full flex flex-col items-center justify-center p-8">
          <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-full mb-4" />
          <h2 className="text-xl font-medium text-gray-900 dark:text-white">{t('No messages yet')}</h2>
          <p className="text-gray-600 dark:text-gray-400 text-center mt-2">
            {t('Start connecting with entrepreneurs and investors to begin conversations')}
          </p>
        </div>
      )}
    </div>
  );
};
