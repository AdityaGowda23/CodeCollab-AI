import { useEffect, useRef, useState } from 'react';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiUser, FiClock, FiCamera } from 'react-icons/fi';

export default function VideoChat({ 
  localStream, 
  remoteStream, 
  isCallActive, 
  participants = [], 
  userRole,
  connectionState = 'new',
  otherUserId
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Set up local video stream (hidden, for track management only)
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      console.log('🎥 Local stream assigned to hidden video element');
      
      // Sync button states with actual track states
      const videoTrack = localStream.getVideoTracks()[0];
      const audioTrack = localStream.getAudioTracks()[0];
      
      if (videoTrack) {
        setIsVideoOff(!videoTrack.enabled);
        console.log('📹 Video track state:', videoTrack.enabled ? 'enabled' : 'disabled');
      }
      if (audioTrack) {
        setIsMuted(!audioTrack.enabled);
        console.log('🎤 Audio track state:', audioTrack.enabled ? 'enabled' : 'disabled');
      }
    }
  }, [localStream]);

  // Set up remote video stream (main display)
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      const stream = Array.isArray(remoteStream) ? remoteStream[0] : remoteStream;
      remoteVideoRef.current.srcObject = stream;
      console.log('📺 Remote stream assigned to display video element');
      
      // Force video to play
      remoteVideoRef.current.play().catch(e => {
        console.log('Video play was prevented:', e);
      });
    }
  }, [remoteStream]);

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        console.log('🎤 Audio toggled:', audioTrack.enabled ? 'unmuted' : 'muted');
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        console.log('📹 Video toggled:', videoTrack.enabled ? 'on' : 'off');
      }
    }
  };

  const getDisplayInfo = () => {
    const otherRole = userRole === 'interviewer' ? 'candidate' : 'interviewer';
    const hasOtherParticipant = participants.some(p => p.userRole === otherRole);
    
    return {
      otherRole,
      hasOtherParticipant,
      displayName: otherRole === 'interviewer' ? 'Interviewer' : 'Candidate',
      icon: otherRole === 'interviewer' ? '👨‍💼' : '👨‍💻',
      color: otherRole === 'interviewer' ? 'blue' : 'green'
    };
  };

  const displayInfo = getDisplayInfo();
  
  const shouldShowRemoteVideo = !!remoteStream && !!otherUserId;

  console.log('🎬 VideoChat render:', {
    hasRemoteStream: !!remoteStream,
    isCallActive,
    hasOtherUserId: !!otherUserId,
    shouldShowRemoteVideo,
    connectionState,
    hasOtherParticipant: displayInfo.hasOtherParticipant
  });

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden">
      {/* Local preview (picture-in-picture) */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className={`absolute bottom-24 right-4 w-40 h-28 object-cover rounded-lg border-2 border-gray-600 shadow-lg z-10 bg-gray-800 ${
          localStream ? '' : 'hidden'
        }`}
      />

      {/* Main Video Display Area */}
      <div className="relative flex-1">
        {shouldShowRemoteVideo ? (
          /* Show remote person's video */
          <div className="relative w-full h-full">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover bg-gray-800"
              onLoadedMetadata={() => console.log('📺 Remote video metadata loaded')}
              onCanPlay={() => console.log('📺 Remote video can play')}
            />
            
            {/* Video overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            
            {/* Remote person info overlay */}
            <div className="absolute bottom-6 left-6 right-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    displayInfo.color === 'blue' ? 'bg-blue-500' : 'bg-green-500'
                  }`}>
                    <span className="text-white text-lg">{displayInfo.icon}</span>
                  </div>
                  <div>
                    <div className="text-white font-semibold text-lg">{displayInfo.displayName}</div>
                    <div className="text-white/80 text-sm">Connected • {otherUserId}</div>
                  </div>
                </div>
                
                {/* Connection quality indicator */}
                <div className="bg-green-500 px-3 py-1 rounded-full">
                  <span className="text-white text-sm font-medium">HD</span>
                </div>
              </div>
            </div>
          </div>
        ) : displayInfo.hasOtherParticipant ? (
          /* Other participant joined but video not connected yet */
          <div className="flex items-center justify-center h-full bg-gray-800">
            <div className="text-center text-gray-300">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                displayInfo.color === 'blue' ? 'bg-blue-500' : 'bg-green-500'
              }`}>
                <span className="text-4xl">{displayInfo.icon}</span>
              </div>
              <div className="text-xl font-semibold mb-3">{displayInfo.displayName}</div>
              <div className="flex items-center justify-center space-x-2 text-yellow-400 mb-4">
                <FiClock className="w-5 h-5 animate-spin" />
                <span className="text-lg">Connecting video...</span>
              </div>
              <div className="text-sm text-gray-400 max-w-sm mb-2">
                Please wait while we establish the video connection
              </div>
              <div className="text-xs text-gray-500">
                Connection State: {connectionState}
              </div>
            </div>
          </div>
        ) : (
          /* Waiting for other participant to join */
          <div className="flex items-center justify-center h-full bg-gray-800">
            <div className="text-center text-gray-300">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                displayInfo.color === 'blue' ? 'bg-blue-500' : 'bg-green-500'
              } animate-pulse`}>
                <span className="text-4xl">{displayInfo.icon}</span>
              </div>
              <div className="text-xl font-semibold mb-3">
                Waiting for {displayInfo.displayName}
              </div>
              <div className="text-lg text-gray-400 mb-4">
                {displayInfo.displayName} will appear here when they join
              </div>
              <div className="text-sm text-gray-500 mb-2">
                Share the room link to get started
              </div>
              <div className="text-xs text-gray-600">
                Participants: {participants.length + 1}
              </div>
            </div>
          </div>
        )}

        {/* Top Status Bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          {/* Connection Status */}
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm ${
            shouldShowRemoteVideo
              ? 'bg-green-500/90 text-white' 
              : displayInfo.hasOtherParticipant && connectionState === 'connecting'
                ? 'bg-yellow-500/90 text-black'
                : displayInfo.hasOtherParticipant
                  ? 'bg-blue-500/90 text-white'
                  : 'bg-gray-600/90 text-white'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              shouldShowRemoteVideo
                ? 'bg-white animate-pulse' 
                : 'bg-white'
            }`} />
            <span>
              {shouldShowRemoteVideo
                ? 'Video Connected' 
                : displayInfo.hasOtherParticipant && connectionState === 'connecting'
                  ? 'Connecting...'
                  : displayInfo.hasOtherParticipant
                    ? 'Audio Connected'
                    : 'Waiting...'}
            </span>
          </div>

          {/* Participant Count and Your Status */}
          <div className="flex items-center space-x-3">
            {/* Your camera status */}
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs backdrop-blur-sm ${
              isVideoOff ? 'bg-red-500/90 text-white' : 'bg-green-500/90 text-white'
            }`}>
              <FiCamera className="w-3 h-3" />
              <span>Your camera: {isVideoOff ? 'Off' : 'On'}</span>
            </div>
            
            {/* Participant count */}
            <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
              <FiUser className="w-3 h-3 inline mr-1" />
              {participants.length + 1} participant{participants.length !== 0 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Your Role Indicator */}
        <div className="absolute bottom-6 right-6">
          <div className={`px-4 py-2 rounded-full backdrop-blur-sm ${
            userRole === 'interviewer' ? 'bg-blue-500/90' : 'bg-green-500/90'
          } text-white`}>
            <div className="flex items-center space-x-2">
              <span className="text-lg">
                {userRole === 'interviewer' ? '👨‍💼' : '👨‍💻'}
              </span>
              <span className="font-medium capitalize">You ({userRole})</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Enhanced Controls */}
      <div className="p-6 bg-gray-900 border-t border-gray-700">
        <div className="flex justify-center gap-6">
          {/* Microphone Control */}
          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={toggleMute}
              disabled={!localStream}
              className={`p-4 rounded-full transition-all duration-200 transform hover:scale-105 ${
                isMuted 
                  ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25' 
                  : 'bg-gray-700 hover:bg-gray-600 shadow-lg'
              } text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <FiMicOff size={24} /> : <FiMic size={24} />}
            </button>
            <span className="text-xs text-gray-400 font-medium">
              {isMuted ? 'Unmute' : 'Mute'}
            </span>
          </div>
          
          {/* Video Control */}
          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={toggleVideo}
              disabled={!localStream}
              className={`p-4 rounded-full transition-all duration-200 transform hover:scale-105 ${
                isVideoOff 
                  ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25' 
                  : 'bg-gray-700 hover:bg-gray-600 shadow-lg'
              } text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
              title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              {isVideoOff ? <FiVideoOff size={24} /> : <FiVideo size={24} />}
            </button>
            <span className="text-xs text-gray-400 font-medium">
              {isVideoOff ? 'Turn On' : 'Turn Off'}
            </span>
          </div>
        </div>

        {/* Debug Control Status Info */}
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${isMuted ? 'bg-red-500' : 'bg-green-500'}`} />
              <span>Microphone {isMuted ? 'muted' : 'active'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-green-500'}`} />
              <span>Camera {isVideoOff ? 'disabled' : 'active'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${shouldShowRemoteVideo ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>Remote video {shouldShowRemoteVideo ? 'active' : 'inactive'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
