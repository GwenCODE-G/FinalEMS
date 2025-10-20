const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Arduino, etc.)
    if (!origin) return callback(null, true);
    
    // Allow all origins for development
    callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});

// Socket.io configuration
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Make io accessible to routes
app.set('io', io);

// Database connection state
let isDatabaseConnected = false;
let databaseConnectionPromise = null;

// Enhanced MongoDB connection with guaranteed connection
const connectDB = async () => {
  if (databaseConnectionPromise) {
    return databaseConnectionPromise;
  }

  databaseConnectionPromise = new Promise(async (resolve, reject) => {
    let connectionAttempts = 0;
    const maxAttempts = 5;

    const attemptConnection = async () => {
      try {
        connectionAttempts++;
        console.log(`🔄 Database connection attempt ${connectionAttempts}/${maxAttempts}...`);
        
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/BrightonSystem', {
          serverSelectionTimeoutMS: 15000,
          socketTimeoutMS: 45000,
          maxPoolSize: 10,
          retryWrites: true,
          w: 'majority'
        });
        
        isDatabaseConnected = true;
        console.log('✅ MongoDB Connected to BrightonSystem database');
        console.log('📊 Database: ' + conn.connection.name);
        console.log('🌐 Host: ' + conn.connection.host);
        resolve(conn);
        
      } catch (error) {
        console.error(`❌ Database connection attempt ${connectionAttempts} failed:`, error.message);
        
        if (connectionAttempts < maxAttempts) {
          console.log(`🔄 Retrying connection in 3 seconds... (${maxAttempts - connectionAttempts} attempts remaining)`);
          setTimeout(attemptConnection, 3000);
        } else {
          console.error('❌ All database connection attempts failed');
          reject(error);
        }
      }
    };

    await attemptConnection();
  });

  return databaseConnectionPromise;
};

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  isDatabaseConnected = true;
  console.log('✅ MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  isDatabaseConnected = false;
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  isDatabaseConnected = false;
  console.log('⚠️ MongoDB connection disconnected');
});

// Middleware to check database connection
app.use((req, res, next) => {
  if (!isDatabaseConnected) {
    return res.status(503).json({
      success: false,
      message: 'Database is not connected. Please try again in a few moments.',
      timestamp: new Date().toISOString()
    });
  }
  next();
});

// Import routes
const departmentRoutes = require('./routes/departments');
const employeeRoutes = require('./routes/employees');
const rfidRoutes = require('./routes/rfidRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

// Use routes
app.use('/api/departments', departmentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/rfid', rfidRoutes);
app.use('/api/attendance', attendanceRoutes);

// Helper function to get PH time
const getPHTime = () => {
  const now = new Date();
  return new Date(now.getTime() + (8 * 60 * 60 * 1000));
};

const formatPHTime = () => {
  const phTime = getPHTime();
  return phTime.toLocaleString('en-PH', { 
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

// API test endpoint
app.get('/api/test', (req, res) => {
  const serverUTC = new Date();
  const phTime = getPHTime();
  
  res.json({
    success: true,
    message: 'Brighton EMS Backend API is working correctly',
    timestamp: serverUTC.toISOString(),
    timezone: {
      server_utc: serverUTC.toISOString(),
      philippines_time: phTime.toISOString(),
      formatted_ph_time: formatPHTime()
    },
    database: isDatabaseConnected ? 'Connected' : 'Disconnected',
    version: '2.8',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Database status endpoint
app.get('/api/database-status', async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    
    const status = {
      database: {
        state: isDatabaseConnected ? 'Connected' : 'Disconnected',
        name: mongoose.connection.name,
        host: mongoose.connection.host
      },
      collections: collectionNames,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      ph_time: formatPHTime()
    };
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Database status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking database status',
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Brighton School EMS API - Attendance Management System',
    version: '2.8',
    timestamp: new Date().toISOString(),
    ph_time: formatPHTime(),
    environment: process.env.NODE_ENV || 'development',
    database: isDatabaseConnected ? 'Connected' : 'Disconnected',
    endpoints: {
      employees: '/api/employees',
      departments: '/api/departments',
      rfid: '/api/rfid',
      attendance: '/api/attendance',
      test: '/api/test',
      databaseStatus: '/api/database-status'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: isDatabaseConnected ? 'OK' : 'SERVICE_UNAVAILABLE',
    database: isDatabaseConnected ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
    ph_time: formatPHTime(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };
  
  if (!isDatabaseConnected) {
    return res.status(503).json({
      ...health,
      message: 'Database connection lost'
    });
  }
  
  res.json(health);
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);
  
  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS Error: Origin not allowed'
    });
  }
  
  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: errors
    });
  }
  
  // MongoDB duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value: ' + field,
      value: err.keyValue[field]
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start server with database connection guarantee
const startServer = async () => {
  try {
    console.log('🚀 Starting Brighton EMS Server...');
    console.log('🔄 Establishing database connection...');
    
    // Wait for database connection before starting server
    await connectDB();
    
    const PORT = process.env.PORT || 5000;
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log('====================================');
      console.log('✅ Brighton EMS Server Started Successfully');
      console.log('====================================');
      console.log('📍 Port: ' + PORT);
      console.log('🌍 Environment: ' + (process.env.NODE_ENV || 'development'));
      console.log('🗄️ Database: Connected');
      console.log('📡 Socket.IO: Enabled');
      console.log('⏰ Timezone: Philippine Time (GMT+8)');
      console.log('====================================');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT. Shutting down gracefully...');
  
  try {
    io.disconnectSockets(true);
    console.log('✅ Socket.io connections closed');
    
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});