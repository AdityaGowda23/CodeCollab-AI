require('dotenv').config();

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());

const httpServer = createServer(app);

// Initialize Socket.IO with CORS enabled
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-memory store of rooms: Map<roomId, { participants: Map<userId, { socketId, userRole }>, messages: Array }>
const rooms = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    activeRooms: rooms.size,
    totalParticipants: Array.from(rooms.values()).reduce((total, room) => total + room.participants.size, 0),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Handle new socket connections
io.on('connection', (socket) => {
  console.log(`🟢 User connected: ${socket.id}`);

  // Join a room
  socket.on('join-room', (roomId, userId, userRole) => {
    try {
      socket.join(roomId);
      socket.roomId = roomId;
      socket.userId = userId;
      socket.userRole = userRole;

      console.log(`👤 User ${userId} joining room ${roomId} as ${userRole}`);

      // Create room record if needed
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          participants: new Map(),
          messages: [],
          createdAt: new Date(),
          lastActivity: new Date()
        });
        console.log(`🏠 Created new room: ${roomId}`);
      }

      const room = rooms.get(roomId);
      
      // Update last activity
      room.lastActivity = new Date();
      
      // Add participant to room
      room.participants.set(userId, { 
        socketId: socket.id, 
        userRole,
        joinedAt: new Date()
      });

      // Notify others in the room about new user
      socket.to(roomId).emit('user-connected', { userId, userRole });
      console.log(`📢 Notified room ${roomId} about user ${userId} joining`);

      // Send existing chat history to the new user
      socket.emit('existing-messages', room.messages);
      console.log(`📜 Sent ${room.messages.length} existing messages to ${userId}`);

      console.log(`✅ User ${userId} successfully joined room ${roomId} as ${userRole}`);
      console.log(`👥 Room ${roomId} now has ${room.participants.size} participants`);

    } catch (error) {
      console.error('❌ Error in join-room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Get room participants (for when user joins existing room)
  socket.on('get-participants', (callback) => {
    try {
      const room = rooms.get(socket.roomId);
      if (room) {
        const participants = Array.from(room.participants.entries()).map(([userId, data]) => ({
          userId,
          userRole: data.userRole,
          socketId: data.socketId,
          joinedAt: data.joinedAt
        }));
        
        console.log(`📋 Sending participants list for room ${socket.roomId}:`, participants.length);
        callback({ 
          success: true, 
          participants 
        });
      } else {
        console.log(`❌ Room ${socket.roomId} not found for get-participants`);
        callback({ 
          success: false, 
          error: 'Room not found' 
        });
      }
    } catch (error) {
      console.error('❌ Get participants error:', error);
      callback({ 
        success: false, 
        error: 'Failed to get participants' 
      });
    }
  });

  // Handle chat messages
  socket.on('send-message', (messageText) => {
    try {
      const room = rooms.get(socket.roomId);
      if (!room) {
        console.log(`❌ Room ${socket.roomId} not found for message`);
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const newMessage = {
        id: uuidv4(),
        userId: socket.userId,
        userRole: socket.userRole,
        text: messageText,
        timestamp: new Date().toISOString()
      };

      // Add message to room history
      room.messages.push(newMessage);
      room.lastActivity = new Date();

      // Keep only last 100 messages to prevent memory issues
      if (room.messages.length > 100) {
        room.messages = room.messages.slice(-100);
      }

      // Broadcast the new message to all participants in room
      io.to(socket.roomId).emit('receive-message', newMessage);
      
      console.log(`💬 Message sent in room ${socket.roomId} by ${socket.userId}: ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}`);

    } catch (error) {
      console.error('❌ Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // WebRTC Signaling: Offer
  socket.on('offer', ({ offer, targetUserId }) => {
    try {
      const room = rooms.get(socket.roomId);
      if (!room) {
        console.log(`❌ Room ${socket.roomId} not found for offer`);
        return;
      }

      const targetParticipant = room.participants.get(targetUserId);
      if (targetParticipant) {
        console.log(`📤 Forwarding offer from ${socket.userId} to ${targetUserId}`);
        io.to(targetParticipant.socketId).emit('offer', { 
          offer, 
          senderId: socket.userId 
        });
        
        // Update room activity
        room.lastActivity = new Date();
      } else {
        console.log(`❌ Target user ${targetUserId} not found in room ${socket.roomId}`);
        socket.emit('error', { message: 'Target user not found' });
      }
    } catch (error) {
      console.error('❌ Offer forwarding error:', error);
      socket.emit('error', { message: 'Failed to forward offer' });
    }
  });

  // WebRTC Signaling: Answer
  socket.on('answer', ({ answer, targetUserId }) => {
    try {
      const room = rooms.get(socket.roomId);
      if (!room) {
        console.log(`❌ Room ${socket.roomId} not found for answer`);
        return;
      }

      const targetParticipant = room.participants.get(targetUserId);
      if (targetParticipant) {
        console.log(`📤 Forwarding answer from ${socket.userId} to ${targetUserId}`);
        io.to(targetParticipant.socketId).emit('answer', { 
          answer, 
          senderId: socket.userId 
        });
        
        // Update room activity
        room.lastActivity = new Date();
      } else {
        console.log(`❌ Target user ${targetUserId} not found in room ${socket.roomId}`);
        socket.emit('error', { message: 'Target user not found' });
      }
    } catch (error) {
      console.error('❌ Answer forwarding error:', error);
      socket.emit('error', { message: 'Failed to forward answer' });
    }
  });

  // WebRTC Signaling: ICE Candidate
  socket.on('ice-candidate', ({ candidate, targetUserId }) => {
    try {
      const room = rooms.get(socket.roomId);
      if (!room) {
        console.log(`❌ Room ${socket.roomId} not found for ICE candidate`);
        return;
      }

      const targetParticipant = room.participants.get(targetUserId);
      if (targetParticipant) {
        console.log(`🧊 Forwarding ICE candidate from ${socket.userId} to ${targetUserId}`);
        io.to(targetParticipant.socketId).emit('ice-candidate', { 
          candidate, 
          senderId: socket.userId 
        });
        
        // Update room activity
        room.lastActivity = new Date();
      } else {
        console.log(`❌ Target user ${targetUserId} not found in room ${socket.roomId} for ICE candidate`);
      }
    } catch (error) {
      console.error('❌ ICE candidate forwarding error:', error);
    }
  });

  // Handle user disconnect
  socket.on('disconnect', (reason) => {
    const { roomId, userId, userRole } = socket;
    
    console.log(`🔴 User disconnected: ${socket.id} (${userId}) - Reason: ${reason}`);

    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      
      // Remove user from room participants
      room.participants.delete(userId);
      room.lastActivity = new Date();

      // Notify others in room about user leaving
      socket.to(roomId).emit('user-disconnected', userId);
      console.log(`📢 Notified room ${roomId} about user ${userId} leaving`);

      console.log(`👥 Room ${roomId} now has ${room.participants.size} participants`);

      // Clean up empty rooms after a delay (in case user reconnects quickly)
      if (room.participants.size === 0) {
        setTimeout(() => {
          const currentRoom = rooms.get(roomId);
          if (currentRoom && currentRoom.participants.size === 0) {
            rooms.delete(roomId);
            console.log(`🗑️ Cleaned up empty room: ${roomId}`);
          }
        }, 30000); // 30 second delay
      }
    }
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });

  // Handle custom ping for connection testing
  socket.on('ping', (callback) => {
    if (typeof callback === 'function') {
      callback('pong');
    }
  });
});

// Periodic cleanup of old inactive rooms (every 10 minutes)
setInterval(() => {
  const now = new Date();
  let cleanedRooms = 0;
  
  for (const [roomId, room] of rooms.entries()) {
    const inactiveTime = now - room.lastActivity;
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    
    // Remove rooms that have been inactive for more than 1 hour
    if (inactiveTime > oneHour) {
      rooms.delete(roomId);
      cleanedRooms++;
      console.log(`🧹 Cleaned up inactive room: ${roomId}`);
    }
  }
  
  if (cleanedRooms > 0) {
    console.log(`🧹 Cleaned up ${cleanedRooms} inactive rooms. Active rooms: ${rooms.size}`);
  }
}, 10 * 60 * 1000); // Every 10 minutes

// Log server statistics every 5 minutes
setInterval(() => {
  const totalParticipants = Array.from(rooms.values()).reduce((total, room) => total + room.participants.size, 0);
  console.log(`📊 Server Stats - Active Rooms: ${rooms.size}, Total Participants: ${totalParticipants}, Uptime: ${Math.floor(process.uptime())}s`);
}, 5 * 60 * 1000); // Every 5 minutes

// Handle server errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 CodeCollab Server running on port ${PORT}`);
  console.log(`📊 Health check available at: http://localhost:${PORT}/health`);
  console.log(`🎯 Ready for WebRTC signaling and chat!`);
});
