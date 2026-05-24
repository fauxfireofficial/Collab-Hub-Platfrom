import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, MessageCircle, UserPlus, DollarSign, Trash2,
  CheckCheck, RefreshCw, X, Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardBody } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge, BadgeVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useNotifications, AppNotification } from '../../context/NotificationContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const getTypeLabel = (type: AppNotification['type']) => {
  switch (type) {
    case 'message':             return 'Message';
    case 'connection_request':  return 'Request';
    case 'connection_accepted': return 'Connected';
    case 'investment_interest': return 'Investment';
    default:                    return 'Notification';
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

export const NotificationsPage: React.FC = () => {
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

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!isLoading && notifications.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600">Stay updated with your network activity</p>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} leftIcon={<RefreshCw size={14} />}>
            Refresh
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Bell size={36} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">All caught up!</h3>
          <p className="text-gray-500 text-sm max-w-xs">
            You have no notifications right now. We'll let you know when something happens.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600">Stay updated with your network activity</p>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">
            Stay updated with your network activity
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            leftIcon={<RefreshCw size={14} />}
          >
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              leftIcon={<CheckCheck size={14} />}
            >
              Mark all as read
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
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Notification list */}
      <div className="space-y-3">
        {notifications.map(notification => (
          <div
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            className={`
              group relative flex items-start gap-4 p-4 rounded-xl border cursor-pointer
              transition-all duration-200 hover:shadow-md
              ${notification.isRead
                ? 'bg-white border-gray-100 hover:border-gray-200'
                : 'bg-blue-50 border-blue-100 hover:border-blue-200'
              }
            `}
          >
            {/* Unread dot */}
            {!notification.isRead && (
              <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" />
            )}

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <Avatar
                src={notification.senderId?.avatarUrl}
                alt={notification.senderId?.name || 'User'}
                size="md"
              />
              {/* Type icon overlay */}
              <span className="absolute -bottom-1 -right-1">
                {getIcon(notification.type)}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 text-sm">
                  {notification.senderId?.name || 'Someone'}
                </span>
                <Badge
                  variant={getBadgeColor(notification.type) as any}
                  size="sm"
                  rounded
                >
                  {getTypeLabel(notification.type)}
                </Badge>
                {!notification.isRead && (
                  <Badge variant="primary" size="sm" rounded>New</Badge>
                )}
              </div>

              <p className="text-gray-600 mt-1 text-sm leading-relaxed">
                {notification.content}
              </p>

              <p className="text-xs text-gray-400 mt-1.5">
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </p>
            </div>

            {/* Delete button */}
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
              title="Delete notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};