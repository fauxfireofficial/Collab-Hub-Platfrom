import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Video, Calendar, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export const VideoCallPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [meeting, setMeeting] = useState<any | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [isJitsiLoading, setIsJitsiLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch secure meeting room details from backend
  useEffect(() => {
    const fetchRoomDetails = async () => {
      if (!roomId) return;
      try {
        const res = await api.get(`/meetings/room/${roomId}`);
        setMeeting(res.data);
      } catch (err: any) {
        console.error('Failed to load meeting room details:', err);
        setError(err.response?.data?.message || t('Failed to load meeting details or access denied.'));
      } finally {
        setIsLoadingDetails(false);
      }
    };
    fetchRoomDetails();
  }, [roomId, t]);

  // 2. Load Jitsi Meet External API script dynamically and mount the call iframe
  useEffect(() => {
    if (isLoadingDetails || error || !meeting || !currentUser || !roomId) return;

    let apiInstance: any = null;

    const initJitsi = () => {
      if (!jitsiContainerRef.current) return;
      jitsiContainerRef.current.innerHTML = ''; // clean old states

      const domain = 'meet.jit.si';
      const options = {
        roomName: `Nexus-Collab-${roomId}`,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName: currentUser.name,
          email: currentUser.email,
          avatarUrl: currentUser.avatarUrl
        },
        configOverwrite: {
          prejoinPageEnabled: false,           // skip pre-join screen
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          // ── Disable lobby / moderator-login requirement ──────────────
          lobby: {
            enabled: false,
            autoKnock: false,
          },
          enableLobbyChat: false,
          hideLobbyButton: true,
          requireDisplayName: false,
          // ── Disable any auth-based features ─────────────────────────
          enableClosePage: false,
          enableInsecureRoomNameWarning: false,
          // ── Lightweight toolbar (no invite / lobby / security) ───────
          toolbarButtons: [
            'camera', 'microphone', 'hangup',
            'chat', 'desktop', 'fullscreen',
            'participants-pane', 'raisehand',
            'tileview', 'toggle-camera', 'videoquality',
            'select-background', 'noise-suppression',
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: '#0f172a',
          MOBILE_APP_PROMO: false
        }
      };

      try {
        apiInstance = new (window as any).JitsiMeetExternalAPI(domain, options);
        setIsJitsiLoading(false);

        // Listen for user closing conference/leaving call
        apiInstance.addEventListener('videoConferenceLeft', () => {
          navigate('/meetings');
        });

        apiInstance.addEventListener('readyToClose', () => {
          navigate('/meetings');
        });
      } catch (err) {
        console.error('Failed to create Jitsi API instance:', err);
        setError(t('Failed to start the video call. Please try again.'));
        setIsJitsiLoading(false);
      }
    };

    // Load External API script if not present
    if ((window as any).JitsiMeetExternalAPI) {
      initJitsi();
    } else {
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = initJitsi;
      document.body.appendChild(script);
    }

    return () => {
      if (apiInstance) {
        apiInstance.dispose();
      }
    };
  }, [isLoadingDetails, error, meeting, currentUser, roomId, navigate, t]);

  const handleBack = () => {
    navigate('/meetings');
  };

  if (isLoadingDetails) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center bg-gray-50/20 dark:bg-gray-900/10">
        <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400 mb-3" size={32} />
        <p className="text-sm text-gray-550 dark:text-gray-400">{t('Connecting to secure server...')}</p>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="max-w-md mx-auto mt-16 p-4">
        <Card className="border-red-100 dark:border-red-950/40 bg-red-50/20 dark:bg-red-950/5">
          <CardBody className="text-center p-6 space-y-4">
            <ShieldAlert className="text-red-500 mx-auto" size={48} />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('Access Denied')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{error || t('Invalid room session.')}</p>
            <Button onClick={handleBack} className="bg-indigo-600 text-white font-medium py-2 rounded-lg">
              <ArrowLeft size={16} className="mr-2 inline" />
              {t('Back to Appointments')}
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  const partner = meeting.organizer?.id === currentUser?.id ? meeting.invitee : meeting.organizer;

  return (
    <div className="flex flex-col h-[82vh] overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl">
      {/* Header Info Panel */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack} 
            className="rounded-full p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Video className="text-emerald-500 shrink-0" size={18} />
              {meeting.title}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-sans mt-0.5 flex items-center gap-1.5">
              <Calendar size={12} />
              {t('Secure video call with')} <span className="font-semibold text-gray-700 dark:text-gray-300">{partner?.name}</span>
            </p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleBack}
          className="text-error-600 border-red-200 hover:bg-red-50 dark:border-red-950 dark:hover:bg-red-950/20 text-xs font-semibold py-1.5 px-3 rounded-lg"
        >
          {t('Exit Call')}
        </Button>
      </div>

      {/* Embedded Iframe Container */}
      <div className="flex-1 w-full h-full relative bg-gray-950 overflow-hidden">
        {isJitsiLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-950/90 text-white">
            <Loader2 className="animate-spin text-indigo-400 mb-3" size={32} />
            <p className="text-sm text-gray-400">{t('Launching Jitsi Meet...')}</p>
          </div>
        )}
        <div ref={jitsiContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
};
