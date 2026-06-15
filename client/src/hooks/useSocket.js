// client/src/hooks/useSocket.js
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function useSocket(serverUrl = SOCKET_URL) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(serverUrl, {
      autoConnect: true,
      reconnectionAttempts: 5,
      transports: ["websocket", "polling"],
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, [serverUrl]);

  return socket;
}