import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import apiRouter from './api/v1/router';

// Declare global namespace for Socket.io
declare global {
  namespace NodeJS {
    interface Global {
      io: any;
    }
  }
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For development flexibility
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Expose io globally
(global as any).io = io;

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/CatchUp';

// Express Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local static file uploads
const uploadsDir = process.env.LOCAL_STORAGE_DIR || './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(path.resolve(uploadsDir)));

// Wire up API
app.use('/api/v1', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
    timestamp: new Date(),
  });
});

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log(`[Socket] User connected: ${socket.id}`);

  // Room join for targeted user notifications
  socket.on('join', (userId: string) => {
    socket.join(userId);
    console.log(`[Socket] User ${userId} joined their notification channel: ${socket.id}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] User disconnected: ${socket.id}`);
  });
});

// Initialize background job processors
import './jobs/aiProcessing.job';
import './jobs/deadlineMonitoring.job';
import './jobs/reminderScheduler.job';
import './jobs/notificationDispatch.job';

// Connect to MongoDB Atlas
console.log(`[Database] Connecting to MongoDB Atlas...`);
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('[Database] Connected to MongoDB Atlas successfully.');
    
    // Drop stale unique username index if exists to prevent duplicate key errors
    if (mongoose.connection.db) {
      mongoose.connection.db.collection('users').dropIndex('username_1')
        .then(() => console.log('[Database] Dropped stale unique username_1 index successfully.'))
        .catch((err) => {
          // It throws error if index doesn't exist, which is expected/normal
          console.log('[Database] Checked username_1 index:', err.message);
        });

      // Drop stale unique livekitRoomName_1 index from meetings collection if exists to prevent duplicate key errors
      mongoose.connection.db.collection('meetings').dropIndex('livekitRoomName_1')
        .then(() => console.log('[Database] Dropped stale unique livekitRoomName_1 index successfully.'))
        .catch((err) => {
          console.log('[Database] Checked livekitRoomName_1 index:', err.message);
        });
    }

    // Start Express listener
    server.listen(PORT, () => {
      console.log(`[Server] Core API listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[Database] Failed to connect to MongoDB Atlas:', err);
    process.exit(1);
  });
