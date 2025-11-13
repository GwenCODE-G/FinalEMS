const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const moment = require('moment-timezone');
require('dotenv').config();

// Import routes
const employeeRoutes = require('./routes/employees');
const attendanceRoutes = require('./routes/attendanceRoutes');
const rfidRoutes = require('./routes/rfidRoutes');
const departmentRoutes = require('./routes/departments'); // ADD THIS LINE

// Import jobs
const setupAutoTimeoutJob = require('./jobs/autoTimeoutJob');

// Import database connection
const connectDB = require('./config/database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "https://www.brightonsjdm.com", "https://brighton-sjdm-backend.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
  }
});

// Philippine Timezone Configuration
const PH_TIMEZONE = 'Asia/Manila';
const PH_TIMEZONE_DISPLAY = 'Philippine Standard Time (PST)';

// Get current Philippine time
const getCurrentPhilippineTime = () => {
  return moment().tz(PH_TIMEZONE);
};

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "https://www.brightonsjdm.com", "https://brighton-sjdm-backend.vercel.app"],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Make io accessible to routes
app.set('io', io);

// Database connection
connectDB();

// Initialize automatic timeout job
setupAutoTimeoutJob();

// Routes
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/rfid', rfidRoutes);
app.use('/api/departments', departmentRoutes); // ADD THIS LINE

// Health check endpoint
app.get('/api/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    philippineTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'),
    timezone: PH_TIMEZONE,
    timezoneDisplay: PH_TIMEZONE_DISPLAY,
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  };
  
  res.json({
    success: true,
    data: health
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend server is running!',
    timestamp: new Date().toISOString(),
    philippineTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'),
    timezone: PH_TIMEZONE_DISPLAY,
    server: 'Brighton EMS Backend',
    version: '2.0.0'
  });
});

// RFID test endpoint
app.get('/api/rfid/test', (req, res) => {
  res.json({
    success: true,
    message: 'RFID endpoint is ready',
    timestamp: new Date().toISOString(),
    philippineTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'),
    timezone: PH_TIMEZONE_DISPLAY,
    working_hours: {
      rfid_scanning: '6:00 AM - 7:00 PM EVERYDAY',
      time_in: '6:00 AM - 5:00 PM',
      time_out: '6:00 AM - 7:00 PM'
    }
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  console.log('Connection time (PST):', getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'));

  // Send welcome message with Philippine time
  socket.emit('welcome', {
    message: 'Connected to Brighton EMS Server',
    serverTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'),
    timezone: PH_TIMEZONE_DISPLAY,
    socketId: socket.id
  });

  // Handle RFID scan events
  socket.on('rfid-scan', (data) => {
    console.log('RFID Scan received:', {
      ...data,
      receivedAt: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
    });
    
    // Broadcast to all connected clients
    io.emit('rfid-scan-update', {
      ...data,
      serverTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'),
      timezone: PH_TIMEZONE_DISPLAY
    });
  });

  // Handle attendance updates
  socket.on('attendance-update', (data) => {
    console.log('Attendance update received:', {
      ...data,
      receivedAt: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
    });
    
    // Broadcast to all connected clients
    io.emit('attendance-update', {
      ...data,
      serverTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'),
      timezone: PH_TIMEZONE_DISPLAY
    });
  });

  // Handle employee updates
  socket.on('employee-update', (data) => {
    console.log('Employee update received:', {
      ...data,
      receivedAt: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')
    });
    
    io.emit('employee-updated', {
      ...data,
      serverTime: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'),
      timezone: PH_TIMEZONE_DISPLAY
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, reason);
    console.log('Disconnection time (PST):', getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'));
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    timestamp: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'),
    url: req.url,
    method: req.method
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    timestamp: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'),
    timezone: PH_TIMEZONE_DISPLAY
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    timestamp: getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'),
    timezone: PH_TIMEZONE_DISPLAY,
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  console.log('Shutdown time (PST):', getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss'));
  
  server.close(() => {
    console.log('HTTP server closed.');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log('=================================');
  console.log('Brighton EMS Server Started');
  console.log('=================================');
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Philippine Time: ${getCurrentPhilippineTime().format('YYYY-MM-DD HH:mm:ss')}`);
  console.log(`Timezone: ${PH_TIMEZONE_DISPLAY}`);
  console.log(`Database: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
  console.log(`Socket.IO: Enabled`);
  console.log(`Auto Timeout: Enabled (7:05 PM & 8:00 PM PST)`);
  console.log('=================================');
});

module.exports = app;