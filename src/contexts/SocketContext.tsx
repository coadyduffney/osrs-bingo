import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinEvent: (eventId: string) => void;
  leaveEvent: (eventId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinEvent: () => {},
  leaveEvent: () => {},
});

export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to Socket.IO server
    // In development, connect to backend server; in production, use relative path
    const serverUrl = import.meta.env.VITE_API_URL || '/';
    const socketInstance = io(serverUrl, {
      withCredentials: true,
    });

    socketInstance.on('connect', () => {
      console.log('✅ Socket.IO connected');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
      setIsConnected(false);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinEvent = (eventId: string) => {
    if (socket) {
      socket.emit('join-event', eventId);
      console.log(`Joined event room: ${eventId}`);
    }
  };

  const leaveEvent = (eventId: string) => {
    if (socket) {
      socket.emit('leave-event', eventId);
      console.log(`Left event room: ${eventId}`);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinEvent, leaveEvent }}>
      {children}
    </SocketContext.Provider>
  );
};
