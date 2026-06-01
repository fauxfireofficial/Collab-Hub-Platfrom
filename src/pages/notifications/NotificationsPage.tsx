import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, MessageCircle, UserPlus, DollarSign, Trash2,
  CheckCheck, RefreshCw, X, Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../../components/ui/Avatar';
import { Badge, BadgeVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useNotifications, AppNotification } from '../../context/NotificationContext';

const getIcon = (type: AppNotification['type']) => {
  switch (type) {
    case 'message':
      return (
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
          <MessageCircle size={16} className="text-blue-600" />
        </span>
      );
    case 'connection_request':
      return (
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100">
          <UserPlus size={16} className="text-violet-600" />
        </span>
      );
    case 'connection_accepted':
      return (
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
          <Users size={16} className="text-green-600" />
        </span>
      );
    case 'investment_interest':
      return (
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100">
          <DollarSign size={16} className="text-amber-600" />
        </span>
      );
    default:
      return (
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
          <Bell size={16} className="text-gray-600" />
        </span>
      );
  }
};

const getBadgeColor = (type: AppNotification['type']) => {
  switch (type) {
    case 'message':            return 'primary';
    case 'connection_request': return 'secondary';
    case 'connection_accepted':return 'success';
    case 'investment_interest':return 'warning';
    default:                   return 'gray';
  }
};

export const NotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refetch,
  } = useNotifications();

  const getTypeLabel = (type: AppNotification['type']) => {
    switch (type) {
      case 'message':             return t('Message');
      case 'connection_request':  return t('Request');
      case 'connection_accepted': return t('Connected');
      case 'investment_interest': return t('Investment');
      default:                    return t('Notification');
    }
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const pageHeader = (
    <>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Notifications')}</h1>
      <p className="text-gray-600 dark:text-gray-400">
        {t('Stay updated with your network activity')}
        {unreadCount > 0 && (
          <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">
            {unreadCount} {t('unread')}
          </span>
        )}
      </p>
    </>
  );

  if (!isLoading && notifications.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>{pageHeader}</div>
          <Button variant="outline" size="sm" onClick={refetch} leftIcon={<RefreshCw size={14} />}>
            {t('Refresh')}
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Bell size={36} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-1">{t('All caught up!')}</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
            {t("You have no notifications right now. We'll let you know when something happens.")}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>{pageHeader}</div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>{pageHeader}</div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={refetch} leftIcon={<RefreshCw size={14} />}>
            {t('Refresh')}
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} leftIcon={<CheckCheck size={14} />}>
              {t('Mark all as read')}
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              leftIcon={<Trash2 size={14} />}
              className="text-red-500 border-red-200 hover:bg-red-50"
            >
              {t('Clear all')}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {notifications.map(notification => (
          <div
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            className={`
              group relative flex items-start gap-4 p-4 rounded-xl border cursor-pointer
              transition-all duration-200 hover:shadow-md
              ${notification.isRead
                ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-200'
                : 'bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900 hover:border-blue-200'
              }
            `}
          >
            {!notification.isRead && (
              <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" />
            )}

            <div className="relative flex-shrink-0">
              <Avatar
                src={notification.senderId?.avatarUrl}
                alt={notification.senderId?.name || t('Someone')}
                size="md"
              />
              <span className="absolute -bottom-1 -right-1">
                {getIcon(notification.type)}
              </span>
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 dark:text-white text-sm">
                  {notification.senderId?.name || t('Someone')}
                </span>
                <Badge variant={getBadgeColor(notification.type) as BadgeVariant} size="sm" rounded>
                  {getTypeLabel(notification.type)}
                </Badge>
                {!notification.isRead && (
                  <Badge variant="primary" size="sm" rounded>{t('New')}</Badge>
                )}
              </div>

              <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm leading-relaxed">
                {notification.content}
              </p>

              <p className="text-xs text-gray-400 mt-1.5">
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </p>
            </div>

            <button
              onClick={e => {
                e.stopPropagation();
                deleteNotification(notification.id);
              }}
              className="
                absolute top-3 right-3 opacity-0 group-hover:opacity-100
                w-6 h-6 flex items-center justify-center rounded-full
                text-gray-400 hover:text-red-500 hover:bg-red-50
                transition-all duration-200
              "
              title={t('Delete notification')}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
