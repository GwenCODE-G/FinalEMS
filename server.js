require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const app = express();

const SerialHandler = require('./serialHandler');
const serialHandler = new SerialHandler();

const { auth, optionalAuth } = require('./middleware/auth');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

// Improved static file serving with no caching
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    // Disable caching for images to prevent glitching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Set proper content type
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    }
  }
}));

// Handle missing files gracefully
app.use('/uploads', (req, res, next) => {
  const filePath = path.join(uploadsDir, req.path);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ 
      error: 'File not found',
      message: 'Profile picture does not exist' 
    });
  }
  next();
});

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/BrightonSystem', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  w: 'majority'
});

const db = mongoose.connection;
db.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});
db.once('open', () => {
  console.log('Connected to MongoDB successfully');
  console.log('Database:', db.db.databaseName);
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin123') {
    const token = jwt.sign({ userId: 'admin', username: 'admin' }, process.env.JWT_KEY, { expiresIn: '24h' });
    res.json({ 
      message: 'Login successful', 
      token,
      user: { username: 'admin', role: 'admin' }
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.get('/api/auth/verify', auth, (req, res) => {
  res.json({ valid: true, user: req.user });
});

app.use('/api/employees', auth, require('./routes/employees'));
app.use('/api/departments', auth, require('./routes/departments'));
app.use('/api/rfid', optionalAuth, require('./routes/rfid'));

app.get('/default-avatar', (req, res) => {
  const defaultAvatarPath = path.join(__dirname, 'public', 'default-avatar.png');
  if (fs.existsSync(defaultAvatarPath)) {
    res.sendFile(defaultAvatarPath);
  } else {
    const svgAvatar = `
      <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#f3f4f6"/>
        <circle cx="50" cy="40" r="20" fill="#9ca3af"/>
        <circle cx="50" cy="100" r="40" fill="#9ca3af"/>
      </svg>
    `;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svgAvatar);
  }
});

app.get('/api/rfid/test-serial', (req, res) => {
  try {
    const status = serialHandler.getStatus();
    res.json({
      message: 'Serial handler status',
      status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/rfid/send-test', (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }
    serialHandler.sendToArduino(message);
    res.json({ message: 'Message sent to Arduino', data: message });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/rfid/realtime', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent({ type: 'connected', message: 'Real-time updates connected', timestamp: new Date().toISOString() });

  const heartbeat = setInterval(() => {
    sendEvent({ type: 'heartbeat', timestamp: new Date().toISOString() });
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    console.log('Client disconnected from real-time feed');
  });
});

app.get('/api/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      status: db.readyState === 1 ? 'Connected' : 'Disconnected',
      readyState: db.readyState
    },
    rfid: serialHandler.getStatus(),
    uploads: {
      directory: uploadsDir,
      exists: fs.existsSync(uploadsDir),
      files: fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir).length : 0
    }
  };
  res.json(healthCheck);
});

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend server is working!', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    serialConnected: serialHandler.isConnected
  });
});

app.get('/api/rfid/status', (req, res) => {
  res.json(serialHandler.getStatus());
});

app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Endpoint not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

app.use((error, req, res, next) => {
  console.error('Server error:', error);
  
  if (error.code === 'ENOENT') {
    return res.status(404).json({ 
      error: 'File not found',
      message: 'The requested resource does not exist'
    });
  }
  
  if (error.name === 'MongoError') {
    return res.status(500).json({ 
      error: 'Database error',
      message: 'A database error occurred'
    });
  }
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ 
      error: 'File too large',
      message: 'File size must be less than 5MB'
    });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`API endpoints: http://localhost:${PORT}/api`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`RFID Status: ${serialHandler.isConnected ? '✅ Connected to Arduino' : '💻 Simulation Mode'}`);
});

process.on('SIGINT', () => {
  console.log('\nServer shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
    if (db.readyState === 1) {
      mongoose.connection.close(false, () => {
        console.log('MongoDB connection closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;