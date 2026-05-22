import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Users } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';

const SIGNALING_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const VideoCallPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Video Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // WebRTC/Socket Refs
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // States
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Initializing device...');

  useEffect(() => {
    if (!user || !roomId) return;

    // 1. Get user media (mic & camera)
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setConnectionStatus('Connecting to signaling server...');
        
        // 2. Connect to socket.io server
        socketRef.current = io(SIGNALING_URL, {
          transports: ['websocket']
        });

        // Register WebRTC listeners
        setupSocketListeners();
      })
      .catch((err) => {
        console.error('Failed to get media devices:', err);
        setConnectionStatus('Failed to access camera or microphone.');
        toast.error('Could not access camera/mic. Please grant permissions.');
      });

    return () => {
      // Cleanup on unmount
      cleanupCall();
    };
  }, [roomId, user]);

  const setupSocketListeners = () => {
    const socket = socketRef.current;
    if (!socket || !roomId || !user) return;

    // Join room
    socket.emit('join-room', { roomId, userId: user.id });
    setConnectionStatus('Waiting for partner to join...');

    // A remote peer joined -> We are the caller, so we initiate offer
    socket.on('user-connected', ({ socketId }) => {
      console.log('Peer connected, initiating WebRTC offer:', socketId);
      setIsPeerConnected(true);
      setConnectionStatus('Connecting to peer...');
      initiateOffer();
    });

    // Remote peer disconnected
    socket.on('user-disconnected', () => {
      console.log('Peer disconnected.');
      setIsPeerConnected(false);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      setConnectionStatus('Partner left the call.');
      toast.error('Partner disconnected.');
    });

    // Receive Offer (We are the receiver)
    socket.on('offer', async ({ offer }) => {
      console.log('Received WebRTC offer from peer');
      setIsPeerConnected(true);
      try {
        createPeerConnection();
        const pc = peerConnectionRef.current;
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          socket.emit('answer', { roomId, answer });
          setConnectionStatus('Connected');
        }
      } catch (err) {
        console.error('Error handling WebRTC offer:', err);
      }
    });

    // Receive Answer (We are the caller)
    socket.on('answer', async ({ answer }) => {
      console.log('Received WebRTC answer from peer');
      try {
        const pc = peerConnectionRef.current;
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          setConnectionStatus('Connected');
        }
      } catch (err) {
        console.error('Error setting remote description from answer:', err);
      }
    });

    // Receive Ice Candidate
    socket.on('ice-candidate', async ({ candidate }) => {
      console.log('Received ICE Candidate');
      try {
        const pc = peerConnectionRef.current;
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('Error adding ICE Candidate:', err);
      }
    });
  };

  const createPeerConnection = () => {
    if (peerConnectionRef.current) return;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle ICE Candidates generated locally
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && roomId) {
        socketRef.current.emit('ice-candidate', { roomId, candidate: event.candidate });
      }
    };

    // Handle receiving remote tracks
    pc.ontrack = (event) => {
      console.log('Received remote media track');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state change:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnectionStatus('Connected');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setConnectionStatus('Connection lost.');
        setIsPeerConnected(false);
      }
    };
  };

  const initiateOffer = async () => {
    try {
      createPeerConnection();
      const pc = peerConnectionRef.current;
      if (pc && socketRef.current && roomId) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit('offer', { roomId, offer });
      }
    } catch (err) {
      console.error('Failed to create offer:', err);
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleHangUp = () => {
    cleanupCall();
    navigate('/meetings');
  };

  const cleanupCall = () => {
    // Stop local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close Peer Connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Disconnect Socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setIsPeerConnected(false);
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] bg-gray-950 text-white rounded-xl overflow-hidden relative flex flex-col items-center justify-between p-6">
      {/* Top Banner Status */}
      <div className="absolute top-4 left-6 z-10 flex items-center gap-2 bg-gray-900/80 px-4 py-2 rounded-full border border-gray-800 backdrop-blur-md">
        <div className={`w-2.5 h-2.5 rounded-full ${isPeerConnected ? 'bg-success-500 animate-pulse' : 'bg-warning-500 animate-pulse'}`} />
        <span className="text-xs font-medium text-gray-300">{connectionStatus}</span>
      </div>

      {/* Video Streams Container */}
      <div className="w-full flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 items-center justify-center py-8">
        
        {/* Remote Partner Video (Main Grid) */}
        <div className="bg-gray-900 rounded-lg aspect-video w-full border border-gray-800 overflow-hidden relative shadow-2xl flex items-center justify-center">
          {isPeerConnected ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-gray-800/80 flex items-center justify-center mx-auto text-primary-400">
                <Users size={32} />
              </div>
              <p className="text-sm font-medium text-gray-400">Waiting for partner...</p>
            </div>
          )}
          <div className="absolute bottom-4 left-4 bg-gray-950/60 px-3 py-1 rounded text-xs font-semibold backdrop-blur-sm border border-gray-800">
            Partner Stream
          </div>
        </div>

        {/* Local Stream Video */}
        <div className="bg-gray-900 rounded-lg aspect-video w-full border border-gray-800 overflow-hidden relative shadow-2xl flex items-center justify-center">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted // ALWAYS mute local playbacks to prevent feedback loops
            className="w-full h-full object-cover transform -scale-x-100" // Mirror local stream
          />
          {isVideoOff && (
            <div className="absolute inset-0 bg-gray-950 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <VideoOff size={48} className="mx-auto mb-2" />
                <p className="text-sm">Your Camera is Off</p>
              </div>
            </div>
          )}
          <div className="absolute bottom-4 left-4 bg-gray-950/60 px-3 py-1 rounded text-xs font-semibold backdrop-blur-sm border border-gray-800">
            You ({user?.name || 'User'})
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="flex items-center gap-4 bg-gray-900/90 px-6 py-3 rounded-full border border-gray-800 shadow-xl backdrop-blur-md z-10">
        <Button
          variant={isMuted ? 'primary' : 'outline'}
          className={`p-3 rounded-full border-gray-700 ${isMuted ? 'bg-error-600 hover:bg-error-700 text-white' : 'text-gray-300 hover:text-white'}`}
          onClick={toggleMute}
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </Button>

        <Button
          variant={isVideoOff ? 'primary' : 'outline'}
          className={`p-3 rounded-full border-gray-700 ${isVideoOff ? 'bg-error-600 hover:bg-error-700 text-white' : 'text-gray-300 hover:text-white'}`}
          onClick={toggleVideo}
          title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
        >
          {isVideoOff ? <VideoOff size={20} /> : <VideoIcon size={20} />}
        </Button>

        <Button
          variant="primary"
          className="p-3 bg-error-600 hover:bg-error-700 text-white rounded-full border-none"
          onClick={handleHangUp}
          title="Hang Up"
        >
          <PhoneOff size={20} />
        </Button>
      </div>
    </div>
  );
};
