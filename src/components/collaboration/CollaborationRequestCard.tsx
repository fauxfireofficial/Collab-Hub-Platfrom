import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, MessageCircle } from 'lucide-react';
import { CollaborationRequest } from '../../types';
import { Card, CardBody, CardFooter } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatDistanceToNow } from 'date-fns';

interface CollaborationRequestCardProps {
  request: CollaborationRequest;
  onStatusUpdate?: (requestId: string, status: 'accepted' | 'rejected') => void;
}

export const CollaborationRequestCard: React.FC<CollaborationRequestCardProps> = ({
  request,
  onStatusUpdate
}) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [targetUser, setTargetUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const targetUserId = currentUser?.role === 'investor' ? request.entrepreneurId : request.investorId;
  
  useEffect(() => {
    const fetchTargetUser = async () => {
      try {
        const res = await api.get(`/users/profile/${targetUserId}`);
        setTargetUser(res.data);
      } catch (err) {
        console.error('Failed to load user for request card:', err);
        // Fallback to sender info from request object properties
        setTargetUser({
          id: targetUserId,
          name: (request as any).senderName || 'User',
          avatarUrl: (request as any).senderAvatar || '',
          isOnline: false
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (targetUserId) {
      fetchTargetUser();
    }
  }, [targetUserId, request]);
  
  const handleAccept = () => {
    if (onStatusUpdate) {
      onStatusUpdate(request.id, 'accepted');
    }
  };
  
  const handleReject = () => {
    if (onStatusUpdate) {
      onStatusUpdate(request.id, 'rejected');
    }
  };
  
  const handleMessage = () => {
    if (targetUser) {
      navigate(`/chat/${targetUser._id || targetUser.id}`);
    }
  };
  
  const handleViewProfile = () => {
    if (targetUser) {
      const role = currentUser?.role === 'investor' ? 'entrepreneur' : 'investor';
      navigate(`/profile/${role}/${targetUser._id || targetUser.id}`);
    }
  };
  
  const getStatusBadge = () => {
    switch (request.status) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'accepted':
        return <Badge variant="success">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="error">Declined</Badge>;
      default:
        return null;
    }
  };

  if (isLoading && !targetUser) {
    return (
      <Card className="animate-pulse">
        <CardBody className="h-24 bg-gray-50 rounded-lg">{null}</CardBody>
      </Card>
    );
  }

  const userDisplayName = targetUser?.name || (request as any).senderName || 'User';
  const userAvatar = targetUser?.avatarUrl || (request as any).senderAvatar || '';
  const userOnline = targetUser?.isOnline || false;
  
  return (
    <Card className="transition-all duration-300 shadow-sm border border-gray-100 hover:shadow-md">
      <CardBody className="flex flex-col">
        <div className="flex justify-between items-start">
          <div className="flex items-start">
            <Avatar
              src={userAvatar}
              alt={userDisplayName}
              size="md"
              status={userOnline ? 'online' : 'offline'}
              className="mr-3"
            />
            
            <div>
              <h3 className="text-md font-semibold text-gray-900">{userDisplayName}</h3>
              <p className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          
          {getStatusBadge()}
        </div>
        
        <div className="mt-4">
          <p className="text-sm text-gray-650 italic bg-gray-50/50 p-3 rounded-lg border border-gray-100/50">
            "{request.message}"
          </p>
        </div>
      </CardBody>
      
      <CardFooter className="border-t border-gray-100 bg-gray-50/50 flex justify-between items-center py-3 px-4">
        {request.status === 'pending' ? (
          <div className="flex justify-between w-full">
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<X size={16} />}
                onClick={handleReject}
              >
                Decline
              </Button>
              <Button
                variant="success"
                size="sm"
                leftIcon={<Check size={16} />}
                onClick={handleAccept}
              >
                Accept
              </Button>
            </div>
            
            <Button
              variant="primary"
              size="sm"
              leftIcon={<MessageCircle size={16} />}
              onClick={handleMessage}
            >
              Message
            </Button>
          </div>
        ) : (
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<MessageCircle size={16} />}
              onClick={handleMessage}
            >
              Message
            </Button>
            
            <Button
              variant="primary"
              size="sm"
              onClick={handleViewProfile}
            >
              View Profile
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};