import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Avatar } from '../ui/Avatar';

interface IncomingCallModalProps {
  callerName: string;
  callerAvatar?: string;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  callerName,
  callerAvatar,
  callType,
  onAccept,
  onReject
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Play ringing sound
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.error('Audio play failed:', e));
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/60 backdrop-blur-md animate-fade-in">
      <audio 
        ref={audioRef} 
        src="https://actions.google.com/sounds/v1/communications/telephone_ring.ogg" 
        loop 
        autoPlay 
      />
      <div className="bg-white/10 border border-white/20 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center justify-center transform transition-all animate-scale-up" style={{ backdropFilter: 'blur(20px)' }}>
        
        <div className="relative mb-6 flex items-center justify-center w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-primary-500/30 animate-ping"></div>
          <Avatar 
            src={callerAvatar || ''} 
            alt={callerName} 
            size="xl" 
            className="border-4 border-white/20 relative z-10"
          />
        </div>
        
        <h2 className="text-2xl font-semibold text-white mb-1">{callerName}</h2>
        <p className="text-gray-300 text-sm mb-8">
          Incoming {callType === 'video' ? 'Video' : 'Voice'} Call...
        </p>
        
        <div className="flex w-full justify-center space-x-8">
          <button
            onClick={onReject}
            className="flex flex-col items-center justify-center group"
          >
            <div className="w-14 h-14 rounded-full bg-error-500 hover:bg-error-600 flex items-center justify-center shadow-lg shadow-error-500/40 transition-transform transform group-hover:scale-110">
              <PhoneOff size={24} className="text-white" />
            </div>
            <span className="text-xs text-gray-300 mt-2 font-medium">Decline</span>
          </button>
          
          <button
            onClick={onAccept}
            className="flex flex-col items-center justify-center group"
          >
            <div className="w-14 h-14 rounded-full bg-success-500 hover:bg-success-600 flex items-center justify-center shadow-lg shadow-success-500/40 transition-transform transform group-hover:scale-110 animate-bounce">
              {callType === 'video' ? (
                <Video size={24} className="text-white" />
              ) : (
                <Phone size={24} className="text-white" />
              )}
            </div>
            <span className="text-xs text-gray-300 mt-2 font-medium">Accept</span>
          </button>
        </div>
        
      </div>
    </div>
  );
};
