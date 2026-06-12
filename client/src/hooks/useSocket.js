// client/src/hooks/useSocket.js
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export default function useSocket(serverUrl ) {
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