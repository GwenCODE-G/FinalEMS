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
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'https://www.brightonsjdm.com'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow vercel preview deployments and main domain
    if (allowedOrigins.indexOf(origin) !== -1 || 
        origin.includes('vercel.app') || 
        origin.includes('localhost')) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "X-Requested-With", 
    "User-Agent",
    "Accept",
    "Origin"
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Enhanced body parser with better limits
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb',
  parameterLimit: 100000
}));

// Security headers middleware
app.use((req, res, next) => {
  // Security headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // CORS headers
  res.header('Access-Control-Allow-Credentials', 'true');
  
  next();
});

// Socket.io configuration with enhanced options
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.includes('vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Make io accessible to routes
app.set('io', io);

// Enhanced MongoDB connection with better error handling and retry logic
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/BrightonSystem', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('MongoDB Connected to BrightonSystem database');
    console.log('Database: ' + conn.connection.name);
    console.log('Host: ' + conn.connection.host);
    
    // Initialize collections with better error handling
    await initializeCollections();
    
  } catch (error) {
    console.error('Database connection error:', error.message);
    
    // Retry connection after 5 seconds
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

// Enhanced collection initialization
const initializeCollections = async () => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    
    console.log('Available collections:', collectionNames);
    
    const requiredCollections = [
      'EMS_Employee', 
      'EMS_Attendance', 
      'EMS_UID', 
      'EMS_Department'
    ];
    
    for (const collection of requiredCollections) {
      if (!collectionNames.includes(collection)) {
        console.log('Creating ' + collection + ' collection...');
        await mongoose.connection.db.createCollection(collection);
        console.log('Created ' + collection + ' collection');
      }
    }
    
    console.log('All required collections are available');
    
  } catch (error) {
    console.error('Error initializing collections:', error.message);
  }
};

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  console.log('MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB connection disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB connection reestablished');
});

// Connect to database
connectDB();

// Enhanced Socket.io event handling
io.on('connection', (socket) => {
  console.log('Client connected: ' + socket.id);
  
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected: ' + socket.id + ' Reason: ' + reason);
  });
  
  socket.on('join-employee', (employeeId) => {
    if (employeeId) {
      socket.join('employee-' + employeeId);
      console.log('Socket ' + socket.id + ' joined employee-' + employeeId);
    }
  });
  
  socket.on('leave-employee', (employeeId) => {
    if (employeeId) {
      socket.leave('employee-' + employeeId);
      console.log('Socket ' + socket.id + ' left employee-' + employeeId);
    }
  });

  socket.on('rfid-data', (data) => {
    console.log('RFID Data received:', data);
    // Broadcast to all connected clients except sender
    socket.broadcast.emit('new-rfid-data', data);
  });

  socket.on('attendance-update', (data) => {
    console.log('Attendance update:', data);
    // Broadcast to all connected clients
    io.emit('attendance-changed', data);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
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
  const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return phTime;
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

// Enhanced API test endpoint with timezone info
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
      formatted_ph_time: formatPHTime(),
      offset: '+08:00 (GMT+8)'
    },
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    version: '2.7',
    environment: process.env.NODE_ENV || 'development',
    features: [
      'RFID Attendance Tracking with ph_time support',
      'Manual Attendance Management',
      'Real-time Socket.io Updates',
      'Employee Management',
      'Department Management',
      'Philippine Timezone Support (GMT+8)',
      'Direct Arduino ph_time parsing',
      'Enhanced Employee Information System'
    ]
  });
});

// Enhanced database status endpoint
app.get('/api/database-status', async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    
    // Get counts for each collection
    const counts = {};
    for (const collectionName of ['EMS_Employee', 'EMS_Attendance', 'EMS_UID', 'EMS_Department']) {
      try {
        counts[collectionName] = await mongoose.connection.db.collection(collectionName).countDocuments();
      } catch (error) {
        counts[collectionName] = 0;
      }
    }
    
    const status = {
      database: {
        state: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        name: mongoose.connection.name,
        host: mongoose.connection.host,
        readyState: mongoose.connection.readyState
      },
      collections: {
        EMS_Employee: collectionNames.includes('EMS_Employee'),
        EMS_Attendance: collectionNames.includes('EMS_Attendance'),
        EMS_UID: collectionNames.includes('EMS_UID'),
        EMS_Department: collectionNames.includes('EMS_Department')
      },
      counts: counts,
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

// NEW: Timezone debug endpoint with ph_time support info
app.get('/api/timezone-debug', (req, res) => {
  const serverUTC = new Date();
  const phTime = getPHTime();
  
  // Sample attendance time to test
  const sampleTime = new Date('2025-10-08T08:39:00.000Z');
  const samplePHTime = new Date(sampleTime.getTime() + (8 * 60 * 60 * 1000));
  
  res.json({
    success: true,
    message: 'Timezone Debug Information',
    current_time: {
      server_utc: serverUTC.toISOString(),
      server_utc_string: serverUTC.toString(),
      philippines_time: phTime.toISOString(),
      philippines_formatted: formatPHTime(),
      offset_hours: 8
    },
    sample_conversion: {
      input_utc: sampleTime.toISOString(),
      converted_ph: samplePHTime.toISOString(),
      display_time: samplePHTime.toLocaleTimeString('en-PH', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      })
    },
    system_info: {
      node_version: process.version,
      platform: process.platform,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    ph_time_support: {
      arduino_sends: 'ph_time field with Philippine time string',
      format: '2025-10-09 11:17:43 AM',
      backend_parses: 'Direct parsing to Date object',
      database_stores: 'Philippine time as-is',
      no_conversion: 'No timezone conversion needed',
      status: 'Active'
    }
  });
});

// Enhanced root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Brighton School EMS API - Attendance Management System',
    version: '2.7',
    timestamp: new Date().toISOString(),
    ph_time: formatPHTime(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      employees: '/api/employees',
      departments: '/api/departments',
      rfid: '/api/rfid',
      attendance: '/api/attendance',
      test: '/api/test',
      health: '/health',
      databaseStatus: '/api/database-status',
      timezoneDebug: '/api/timezone-debug'
    },
    realTime: {
      socketIo: true,
      events: ['attendance-update', 'rfid-data', 'new-rfid-data', 'attendance-changed']
    },
    timezone: {
      system: 'Philippine Time (GMT+8)',
      all_times_stored_as: 'Philippine Time',
      arduino_sends: 'ph_time field with Philippine time string',
      backend_parses: 'Direct parsing without conversion',
      database_stores: 'Philippine Time',
      api_returns: 'Philippine Time',
      status: 'Active - Using Arduino ph_time field'
    }
  });
});

// Enhanced health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
    ph_time: formatPHTime(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage(),
    nodeVersion: process.version,
    platform: process.platform,
    timezone: 'GMT+8 (Philippine Time)',
    ph_time_support: 'Active - Using Arduino ph_time field'
  };
  
  // If database is disconnected, return 503
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      ...health,
      status: 'SERVICE_UNAVAILABLE',
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
    path: req.originalUrl,
    availableEndpoints: [
      '/api/employees',
      '/api/departments',
      '/api/rfid',
      '/api/attendance',
      '/api/test',
      '/api/database-status',
      '/api/timezone-debug'
    ]
  });
});

// Enhanced global error handler
app.use((err, req, res, next) => {
  console.error('Global Error Handler:');
  console.error('Error Stack:', err.stack);
  console.error('Error Details:', err);
  
  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS Error: Origin not allowed',
      allowedOrigins: allowedOrigins,
      yourOrigin: req.get('origin')
    });
  }
  
  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message,
      value: error.value
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
      error: 'This ' + field + ' already exists in the system',
      value: err.keyValue[field]
    });
  }
  
  // MongoDB CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      error: 'Please provide a valid MongoDB ID for ' + err.path,
      value: err.value
    });
  }
  
  // Default error response
  const errorResponse = {
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err 
    })
  };
  
  res.status(err.status || 500).json(errorResponse);
});

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('====================================');
  console.log('Brighton EMS Server Started Successfully');
  console.log('====================================');
  console.log('Version: 2.7');
  console.log('Port: ' + PORT);
  console.log('Environment: ' + (process.env.NODE_ENV || 'development'));
  console.log('Backend URL: ' + (process.env.BACKEND_URL || 'http://localhost:' + PORT));
  console.log('Frontend URL: ' + (process.env.FRONTEND_URL || 'http://localhost:3000'));
  console.log('Database: ' + (mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'));
  console.log('Socket.IO: Enabled');
  console.log('Timezone: Philippine Time (GMT+8)');
  console.log('ph_time Support: Active - Using Arduino ph_time field');
  console.log('Server UTC Time: ' + new Date().toISOString());
  console.log('Server PH Time: ' + formatPHTime());
  console.log('Started at: ' + new Date().toLocaleString());
  console.log('====================================');
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Shutting down gracefully...');
  
  try {
    // Close all socket connections
    io.disconnectSockets(true);
    console.log('Socket.io connections closed');
    
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
    // Close HTTP server
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
    
    // Force close after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      console.log('Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
    
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});