import React, { useState, useEffect, useMemo, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import {
  AgoraRTCProvider,
  useLocalCameraTrack,
  useLocalMicrophoneTrack,
  useJoin,
  useRemoteUsers,
  RemoteUser,
  LocalVideoTrack,
  usePublish,
  RemoteAudioTrack,
  useRemoteAudioTracks,
} from 'agora-rtc-react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const APP_ID = '0e4a8ef3cd17483bbb29daf1d3b5eca0';
// Public domain ringback OGG (loops while caller waits)
const RINGBACK_URL =
  'https://actions.google.com/sounds/v1/communications/telephone_ring.ogg';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CallInterfaceProps {
  channelName: string;
  callType: 'audio' | 'video';
  partnerName: string;
  partnerAvatar?: string;
  token: string | null;
  isCaller: boolean;
  onEndCall: () => void;
}

// ─── Timer hook ───────────────────────────────────────────────────────────────
function useCallTimer(active: boolean) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!active) { setSecs(0); return; }
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  const mm = Math.floor(secs / 60).toString().padStart(2, '0');
  const ss = (secs % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

// ─── Outer wrapper: creates ONE stable Agora client ──────────────────────────
export const CallInterface: React.FC<CallInterfaceProps> = (props) => {
  // useState initialiser runs exactly once – client is never recreated
  const [client] = useState(() =>
    AgoraRTC.createClient({ codec: 'vp8', mode: 'rtc' })
  );

  return (
    <AgoraRTCProvider client={client as any}>
      <CallContent {...props} />
    </AgoraRTCProvider>
  );
};

// ─── Inner component: all Agora hooks live here ───────────────────────────────
const CallContent: React.FC<CallInterfaceProps> = ({
  channelName,
  callType,
  partnerName,
  partnerAvatar,
  token,
  isCaller,
  onEndCall,
}) => {
  const [micOn, setMicOn]       = useState(true);
  const [cameraOn, setCameraOn] = useState(callType === 'video');
  const [speakerOn, setSpeakerOn] = useState(true);

  // Unique numeric UID per participant: 1 for caller, 2 for receiver.
  // This avoids Agora UID collisions and guarantees UIDs are within the WebRTC 16-bit range [0, 65535]
  // which prevents "AgoraRTCError INVALID_PARAMS: invalid id: the value range is [0, 65535]" errors during track publishing.
  const [uid] = useState(() => (isCaller ? 1 : 2));

  // ── Join channel ────────────────────────────────────────────────────────────
  // Only attempt to join once we have a token
  const { isConnected: joined } = useJoin(
    { appid: APP_ID, channel: channelName, token: token ?? null, uid },
    !!token,
  );

  // ── Local tracks ────────────────────────────────────────────────────────────
  const { localMicrophoneTrack, error: micError, isLoading: isMicLoading } = useLocalMicrophoneTrack(true);
  const { localCameraTrack,    error: camError,  isLoading: isCamLoading } = useLocalCameraTrack(
    callType === 'video',
  );

  // Toggle mic track enablement based on micOn state
  useEffect(() => {
    if (localMicrophoneTrack) {
      console.log('[CallInterface] Setting mic enabled:', micOn);
      localMicrophoneTrack.setEnabled(micOn).catch((err) => {
        console.error('[CallInterface] Failed to toggle mic track:', err);
      });
    }
  }, [localMicrophoneTrack, micOn]);

  // Toggle camera track enablement based on cameraOn state
  useEffect(() => {
    if (localCameraTrack) {
      console.log('[CallInterface] Setting camera enabled:', cameraOn);
      localCameraTrack.setEnabled(cameraOn).catch((err) => {
        console.error('[CallInterface] Failed to toggle camera track:', err);
      });
    }
  }, [localCameraTrack, cameraOn]);

  useEffect(() => {
    if (micError) {
      console.error('[CallInterface] Mic error:', micError);
      toast.error('Microphone access denied – check browser permissions.');
    }
  }, [micError]);

  useEffect(() => {
    if (camError) {
      console.error('[CallInterface] Cam error:', camError);
      toast.error('Camera access denied – check browser permissions.');
    }
  }, [camError]);

  // ── Remote users ────────────────────────────────────────────────────────────
  const remoteUsers  = useRemoteUsers();
  const isConnected  = remoteUsers.length > 0;
  const callDuration = useCallTimer(isConnected);

  // Subscribe to remote audio tracks explicitly
  const { audioTracks: remoteAudioTracks } = useRemoteAudioTracks(remoteUsers);

  // Debug: log remote user status
  useEffect(() => {
    console.log('[CallInterface] Remote users count:', remoteUsers.length);
    remoteUsers.forEach(u => {
      console.log('[CallInterface] Remote user:', u.uid, '| hasAudio:', u.hasAudio, '| hasVideo:', u.hasVideo);
    });
  }, [remoteUsers]);

  // ── Publish tracks ──────────────────────────────────────────────────────────
  // Publish tracks only when joined and they are finished loading
  const readyToPublish = joined && !isMicLoading && (callType === 'audio' || !isCamLoading) && !!localMicrophoneTrack;

  // Filter out null/undefined tracks safely before passing to hook
  const tracksToPublish = useMemo(() => {
    return [localMicrophoneTrack, localCameraTrack].filter(Boolean);
  }, [localMicrophoneTrack, localCameraTrack]);

  // Debug: log publish status
  useEffect(() => {
    console.log('[CallInterface] Tracks to publish:', tracksToPublish.length, '| readyToPublish:', readyToPublish);
  }, [tracksToPublish, readyToPublish]);

  usePublish(tracksToPublish as any, readyToPublish);

  // ── Ringback audio (caller only, stops when remote user joins) ──────────────
  const ringbackRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = ringbackRef.current;
    if (!audio) return;

    if (isCaller && !isConnected) {
      // Autoplay policies require user gesture; catch & ignore if blocked
      audio.play().catch(() => {});
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [isCaller, isConnected]);

  // ── End call ─────────────────────────────────────────────────────────────────
  const handleEndCall = () => {
    // Explicitly close tracks before unmount
    localMicrophoneTrack?.close();
    localCameraTrack?.close();
    onEndCall();
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[9999] bg-gray-950 flex flex-col">

      {/* Ringback tone – only audible to caller while waiting */}
      <audio ref={ringbackRef} src={RINGBACK_URL} loop preload="auto" />

      {/* ── Video-call header (only when fully connected) ── */}
      {callType === 'video' && isConnected && (
        <div className="absolute top-0 left-0 right-0 p-6 z-20 flex items-center gap-4 bg-gradient-to-b from-black/70 to-transparent">
          <Avatar src={partnerAvatar || ''} alt={partnerName} size="md" />
          <div>
            <h2 className="text-white font-semibold text-lg leading-tight">{partnerName}</h2>
            <p className="text-gray-300 text-sm">{callDuration}</p>
          </div>
        </div>
      )}

      {/* ── Main area ── */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">

        {/* Avatar panel — always visible for audio; shown before video connects */}
        {(callType === 'audio' || !isConnected) && (
          <div className="flex flex-col items-center justify-center text-center p-6 z-10 select-none">
            {/* Pulsing rings */}
            <div className="relative mb-8 flex items-center justify-center">
              <div
                className="absolute rounded-full bg-primary-500/10 animate-ping"
                style={{ width: 180, height: 180, animationDuration: '3s' }}
              />
              <div
                className="absolute rounded-full border border-white/5 animate-pulse"
                style={{ width: 164, height: 164, animationDuration: '2s' }}
              />
              <Avatar
                src={partnerAvatar || ''}
                alt={partnerName}
                size="xxl"
                className="border-4 border-white/10 shadow-2xl relative z-10"
              />
            </div>

            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
              {partnerName}
            </h1>

            <p className="text-gray-400 text-sm font-medium tracking-wide flex items-center gap-2 justify-center">
              {isConnected ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                  <span>{callDuration}</span>
                </>
              ) : (
                <span className="animate-pulse">
                  {isCaller ? 'Ringing...' : 'Connecting...'}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Remote video stream (video call, connected) */}
        {callType === 'video' &&
          remoteUsers.map(user => (
            <div key={user.uid} className="absolute inset-0 z-0">
              <RemoteUser
                user={user}
                playVideo
                playAudio={false} // Disable auto audio to prevent double-playback conflict
                className="w-full h-full object-cover"
              />
            </div>
          ))}

        {remoteAudioTracks.map(track => (
          <RemoteAudioTrack
            key={track.uid}
            play={speakerOn}
            track={track}
          />
        ))}

        {/* Local camera picture-in-picture (video call only) */}
        {callType === 'video' && cameraOn && localCameraTrack && (
          <div className="absolute bottom-28 right-6 w-32 md:w-44 aspect-[3/4] bg-gray-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-700 z-10">
            <LocalVideoTrack
              track={localCameraTrack}
              play
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-0.5 rounded text-[10px] text-white font-medium">
              You
            </div>
          </div>
        )}
      </div>

      {/* ── Controls bar ── */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-5 px-8 py-4 bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl z-20">

        {/* Mic toggle */}
        <button
          onClick={() => setMicOn(p => !p)}
          title={micOn ? 'Mute microphone' : 'Unmute microphone'}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
            micOn
              ? 'bg-gray-800 hover:bg-gray-700 text-white'
              : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
          }`}
        >
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        {/* Speaker toggle */}
        <button
          onClick={() => setSpeakerOn(p => !p)}
          title={speakerOn ? 'Mute speaker' : 'Unmute speaker'}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
            speakerOn
              ? 'bg-gray-800 hover:bg-gray-700 text-white'
              : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
          }`}
        >
          {speakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>

        {/* Camera toggle (video calls only) */}
        {callType === 'video' && (
          <button
            onClick={() => setCameraOn(p => !p)}
            title={cameraOn ? 'Turn off camera' : 'Turn on camera'}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
              cameraOn
                ? 'bg-gray-800 hover:bg-gray-700 text-white'
                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            }`}
          >
            {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>
        )}

        {/* End call */}
        <button
          onClick={handleEndCall}
          title="End call"
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white shadow-lg shadow-red-500/30 transition-transform hover:scale-105"
        >
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
  );
};
