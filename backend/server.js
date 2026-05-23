import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Import Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import meetingRoutes from './routes/meetings.js';
import documentRoutes from './routes/documents.js';
import paymentRoutes from './routes/payments.js';
import chatRoutes from './routes/chat.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS settings matching the frontend
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '100mb' })); // Allow higher payloads for video uploads, drawing canvases/e-signatures
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Serve static uploads
const __dirname = path.resolve();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes mapping
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);

// Root route for health check
app.get('/', (req, res) => {
  res.json({ message: 'Nexus Full Stack API is running successfully.' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(err.status || 500).json({ 
    message: err.message || 'An internal server error occurred.' 
  });
});

// Socket.IO WebRTC Signaling handlers
io.on('connection', (socket) => {
  console.log('Socket client connected:', socket.id);

  // Chat Calling Signaling
  socket.on('register-user', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} registered for private socket events`);
  });

  socket.on('call-user', ({ userToCall, from, callerName, callerAvatar, callType, channelName }) => {
    socket.to(userToCall).emit('incoming-call', { 
      from, 
      callerName,
      callerAvatar,
      callType,
      channelName
    });
  });

  socket.on('accept-call', ({ to, channelName }) => {
    socket.to(to).emit('call-accepted', { channelName });
  });

  socket.on('reject-call', ({ to }) => {
    socket.to(to).emit('call-rejected');
  });

  socket.on('end-call', ({ to }) => {
    socket.to(to).emit('call-ended');
  });


  socket.on('join-room', ({ roomId, userId }) => {
    socket.join(roomId);
    console.log(`User ${userId} joined WebRTC room ${roomId}`);
    
    // Notify other peers in the room
    socket.to(roomId).emit('user-connected', { userId, socketId: socket.id });

    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected from WebRTC room ${roomId}`);
      socket.to(roomId).emit('user-disconnected', { userId, socketId: socket.id });
    });
  });

  // Relay offer, answer, and ice-candidates to peers in the room
  socket.on('offer', ({ roomId, offer }) => {
    socket.to(roomId).emit('offer', { offer, senderId: socket.id });
  });

  socket.on('answer', ({ roomId, answer }) => {
    socket.to(roomId).emit('answer', { answer, senderId: socket.id });
  });

  socket.on('ice-candidate', ({ roomId, candidate }) => {
    socket.to(roomId).emit('ice-candidate', { candidate, senderId: socket.id });
  });
});

// Database connection & start server
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('CRITICAL ERROR: MONGO_URI is not defined in .env file.');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('SUCCESS: Connected to MongoDB Atlas Cloud Database.');
    server.listen(PORT, () => {
      console.log(`SUCCESS: Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('CRITICAL ERROR: Failed to connect to MongoDB Atlas:', err);
    process.exit(1);
  });
