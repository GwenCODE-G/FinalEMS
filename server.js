const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const moment = require('moment-timezone');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

moment.tz.setDefault('Asia/Manila');

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://www.brightonsjdm.com',
      'https://brighton-sjdm-backend.vercel.app',
      'http://192.168.100.122:5000',
      'http://192.168.100.122:3000',
      'http://localhost:5000'
    ];
    
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  next();
});

const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      const allowedOrigins = [
        'http://localhost:3000',
        'https://www.brightonsjdm.com',
        'https://brighton-sjdm-backend.vercel.app',
        'http://192.168.100.122:5000',
        'http://192.168.100.122:3000',
        'http://localhost:5000'
      ];
      
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

app.set('io', io);

let isDatabaseConnected = false;
let databaseConnectionPromise = null;

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
        console.log(`Database connection attempt ${connectionAttempts}/${maxAttempts}...`);
        
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/BrightonSystem', {
          serverSelectionTimeoutMS: 15000,
          socketTimeoutMS: 45000,
          maxPoolSize: 10,
          retryWrites: true,
          w: 'majority',
          dbName: 'BrightonSystem'
        });
        
        isDatabaseConnected = true;
        console.log('MongoDB Connected to BrightonSystem database');
        console.log('Database: ' + conn.connection.name);
        console.log('Host: ' + conn.connection.host);
        resolve(conn);
        
      } catch (error) {
        console.log(`Database connection attempt ${connectionAttempts} failed:`, error.message);
        
        if (connectionAttempts < maxAttempts) {
          console.log(`Retrying connection in 3 seconds... (${maxAttempts - connectionAttempts} attempts remaining)`);
          setTimeout(attemptConnection, 3000);
        } else {
          console.log('All database connection attempts failed');
          reject(error);
        }
      }
    };

    await attemptConnection();
  });

  return databaseConnectionPromise;
};

mongoose.connection.on('connected', () => {
  isDatabaseConnected = true;
  console.log('MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  isDatabaseConnected = false;
  console.log('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  isDatabaseConnected = false;
  console.log('MongoDB connection disconnected');
});

app.use((req, res, next) => {
  if (!isDatabaseConnected) {
    console.log('Database not connected for request:', req.method, req.url);
    return res.status(503).json({
      success: false,
      message: 'Database is not connected. Please try again in a few moments.',
      timestamp: new Date().toISOString(),
      ph_time: getPHTimeString()
    });
  }
  next();
});

const departmentRoutes = require('./routes/departments');
const employeeRoutes = require('./routes/employees');
const rfidRoutes = require('./routes/rfidRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

app.use('/api/departments', departmentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/rfid', rfidRoutes);
app.use('/api/attendance', attendanceRoutes);

const setupAutoTimeoutJob = require('./jobs/autoTimeoutJob');

// Philippine Time Helper Functions - 12-hour AM/PM format with PST
const getPHTime = () => {
  return moment().tz('Asia/Manila').toDate();
};

const getPHTimeString = () => {
  return moment().tz('Asia/Manila').format('YYYY-MM-DD hh:mm:ss A') + ' PST';
};

const getPHDateString = () => {
  return moment().tz('Asia/Manila').format('YYYY-MM-DD');
};

const formatPHTime = (date) => {
  return moment(date).tz('Asia/Manila').format('YYYY-MM-DD hh:mm:ss A') + ' PST';
};

const parsePHTime = (dateString, timeString) => {
  return moment.tz(`${dateString} ${timeString}`, 'YYYY-MM-DD HH:mm:ss', 'Asia/Manila').toDate();
};

// ==================== WORKING HOURS VALIDATION ====================

const WORKING_HOURS = {
  START_HOUR: 6,   // 6:00 AM
  START_MINUTE: 0,
  END_HOUR: 19,    // 7:00 PM
  END_MINUTE: 0,
  TIMEIN_CUTOFF_HOUR: 17, // 5:00 PM
  TIMEIN_CUTOFF_MINUTE: 0
};

const isWithinWorkingHours = (dateTime) => {
  const phTime = moment(dateTime).tz('Asia/Manila');
  const hour = phTime.hour();
  const minute = phTime.minute();
  
  // Create time objects for comparison
  const currentTime = moment().set({ hour, minute, second: 0 });
  const startTime = moment().set({ hour: WORKING_HOURS.START_HOUR, minute: WORKING_HOURS.START_MINUTE, second: 0 });
  const endTime = moment().set({ hour: WORKING_HOURS.END_HOUR, minute: WORKING_HOURS.END_MINUTE, second: 0 });
  
  return currentTime.isSameOrAfter(startTime) && currentTime.isBefore(endTime);
};

const isTimeInAllowed = (dateTime) => {
  const phTime = moment(dateTime).tz('Asia/Manila');
  const hour = phTime.hour();
  const minute = phTime.minute();
  
  // Create time objects for comparison
  const currentTime = moment().set({ hour, minute, second: 0 });
  const startTime = moment().set({ hour: WORKING_HOURS.START_HOUR, minute: WORKING_HOURS.START_MINUTE, second: 0 });
  const cutoffTime = moment().set({ hour: WORKING_HOURS.TIMEIN_CUTOFF_HOUR, minute: WORKING_HOURS.TIMEIN_CUTOFF_MINUTE, second: 0 });
  
  return currentTime.isSameOrAfter(startTime) && currentTime.isBefore(cutoffTime);
};

const isTimeOutAllowed = (dateTime) => {
  const phTime = moment(dateTime).tz('Asia/Manila');
  const hour = phTime.hour();
  const minute = phTime.minute();
  
  // Create time objects for comparison
  const currentTime = moment().set({ hour, minute, second: 0 });
  const startTime = moment().set({ hour: WORKING_HOURS.START_HOUR, minute: WORKING_HOURS.START_MINUTE, second: 0 });
  const endTime = moment().set({ hour: WORKING_HOURS.END_HOUR, minute: WORKING_HOURS.END_MINUTE, second: 0 });
  
  return currentTime.isSameOrAfter(startTime) && currentTime.isBefore(endTime);
};

app.get('/api/test', (req, res) => {
  const serverTime = moment();
  const phTime = moment().tz('Asia/Manila');
  
  res.json({
    success: true,
    message: 'Brighton EMS Backend API is working correctly',
    timestamp: serverTime.toISOString(),
    timezone: {
      server_utc: serverTime.format('YYYY-MM-DD HH:mm:ss'),
      philippines_time_24h: phTime.format('YYYY-MM-DD HH:mm:ss'),
      philippines_time_12h: phTime.format('YYYY-MM-DD hh:mm:ss A') + ' PST',
      timezone: 'Asia/Manila (GMT+8)',
      timezone_display: 'Philippine Standard Time (PST)'
    },
    database: isDatabaseConnected ? 'Connected' : 'Disconnected',
    version: '3.2',
    environment: process.env.NODE_ENV || 'development',
    client_ip: req.ip || req.connection.remoteAddress,
    working_hours: {
      rfid_scanning: '6:00 AM - 7:00 PM EVERYDAY',
      time_in: '6:00 AM - 5:00 PM',
      time_out: '6:00 AM - 7:00 PM'
    }
  });
});

app.get('/api/rfid/scan', (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  console.log(`RFID Scan endpoint hit from IP: ${clientIP}`);
  
  res.status(200).json({
    success: true,
    message: 'RFID endpoint is ready',
    timestamp: new Date().toISOString(),
    ph_time: getPHTimeString(),
    database: isDatabaseConnected ? 'Connected' : 'Disconnected',
    server: 'Online',
    working_hours: {
      rfid_scanning: '6:00 AM - 7:00 PM EVERYDAY',
      time_in: '6:00 AM - 5:00 PM',
      time_out: '6:00 AM - 7:00 PM'
    }
  });
});

app.get('/api/database-status', async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    
    const status = {
      database: {
        state: isDatabaseConnected ? 'Connected' : 'Disconnected',
        name: mongoose.connection.name,
        host: mongoose.connection.host,
        readyState: mongoose.connection.readyState
      },
      collections: collectionNames,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      ph_time: getPHTimeString(),
      timezone: 'Asia/Manila (GMT+8)',
      timezone_display: 'Philippine Standard Time (PST)',
      working_hours: {
        rfid_scanning: '6:00 AM - 7:00 PM EVERYDAY',
        time_in: '6:00 AM - 5:00 PM',
        time_out: '6:00 AM - 7:00 PM'
      }
    };
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.log('Database status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking database status',
      error: error.message
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Brighton School EMS API - Attendance Management System',
    version: '3.2',
    timestamp: new Date().toISOString(),
    ph_time: getPHTimeString(),
    timezone: 'Asia/Manila (GMT+8)',
    timezone_display: 'Philippine Standard Time (PST)',
    environment: process.env.NODE_ENV || 'development',
    database: isDatabaseConnected ? 'Connected' : 'Disconnected',
    working_hours: {
      rfid_scanning: '6:00 AM - 7:00 PM EVERYDAY',
      time_in: '6:00 AM - 5:00 PM',
      time_out: '6:00 AM - 7:00 PM'
    },
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

app.get('/health', (req, res) => {
  const health = {
    status: isDatabaseConnected ? 'OK' : 'SERVICE_UNAVAILABLE',
    database: isDatabaseConnected ? 'Connected' : 'Disconnected',
    database_readyState: mongoose.connection.readyState,
    timestamp: new Date().toISOString(),
    ph_time: getPHTimeString(),
    timezone: 'Asia/Manila (GMT+8)',
    timezone_display: 'Philippine Standard Time (PST)',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage(),
    client_ip: req.ip || req.connection.remoteAddress,
    working_hours: {
      rfid_scanning: '6:00 AM - 7:00 PM EVERYDAY',
      time_in: '6:00 AM - 5:00 PM',
      time_out: '6:00 AM - 7:00 PM'
    }
  };
  
  if (!isDatabaseConnected) {
    return res.status(503).json({
      ...health,
      message: 'Database connection lost'
    });
  }
  
  res.json(health);
});

app.use('/api/*', (req, res) => {
  console.log('API endpoint not found:', req.originalUrl);
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    available_endpoints: [
      '/api/employees',
      '/api/departments',
      '/api/rfid',
      '/api/attendance',
      '/api/test',
      '/api/health'
    ]
  });
});

app.use((err, req, res, next) => {
  console.log('Global Error Handler:', err);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS Error: Origin not allowed',
      requested_origin: req.headers.origin,
      allowed_origins: [
        'http://localhost:3000',
        'https://www.brightonsjdm.com',
        'https://brighton-sjdm-backend.vercel.app'
      ]
    });
  }
  
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
  
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value: ' + field,
      value: err.keyValue[field]
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id, 'from:', socket.handshake.address);
  
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
  });
  
  socket.on('error', (error) => {
    console.log('Socket error:', error);
  });
  
  socket.emit('welcome', {
    message: 'Connected to Brighton EMS Server',
    serverTime: new Date().toISOString(),
    phTime: getPHTimeString(),
    timezone: 'Asia/Manila (GMT+8)',
    timezone_display: 'Philippine Standard Time (PST)',
    working_hours: {
      rfid_scanning: '6:00 AM - 7:00 PM EVERYDAY',
      time_in: '6:00 AM - 5:00 PM',
      time_out: '6:00 AM - 7:00 PM'
    }
  });
});

const startServer = async () => {
  try {
    console.log('Starting Brighton EMS Server...');
    console.log('Establishing database connection...');
    
    await connectDB();
    
    setupAutoTimeoutJob();
    
    const PORT = process.env.PORT || 5000;
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log('====================================');
      console.log('Brighton EMS Server Started Successfully');
      console.log('====================================');
      console.log('Port: ' + PORT);
      console.log('Environment: ' + (process.env.NODE_ENV || 'development'));
      console.log('Database: ' + (isDatabaseConnected ? 'Connected' : 'Disconnected'));
      console.log('Socket.IO: Enabled');
      console.log('Auto Timeout: Enabled (7:05 PM & 8:00 PM Philippines Time)');
      console.log('Timezone: Asia/Manila (GMT+8) - Philippine Standard Time (PST)');
      console.log('Time Format: 12-hour AM/PM with PST');
      console.log('Current PH Time: ' + getPHTimeString());
      console.log('Working Hours:');
      console.log('  - RFID Scanning: 6:00 AM - 7:00 PM EVERYDAY');
      console.log('  - Time In: 6:00 AM - 5:00 PM');
      console.log('  - Time Out: 6:00 AM - 7:00 PM');
      console.log('Server URL: http://localhost:' + PORT);
      console.log('Network URL: http://' + getLocalIP() + ':' + PORT);
      console.log('====================================');
    });
    
  } catch (error) {
    console.log('Failed to start server:', error);
    process.exit(1);
  }
};

const getLocalIP = () => {
  const interfaces = require('os').networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost';
};

startServer();

process.on('SIGINT', async () => {
  console.log('Received SIGINT. Shutting down gracefully...');
  
  try {
    io.disconnectSockets(true);
    console.log('Socket.io connections closed');
    
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
    server.close(() => {
      console.log('HTTP server closed');
      console.log('Server shutdown complete');
      process.exit(0);
    });
    
    setTimeout(() => {
      console.log('Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
    
  } catch (error) {
    console.log('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Shutting down gracefully...');
  
  try {
    io.disconnectSockets(true);
    console.log('Socket.io connections closed');
    
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
    server.close(() => {
      console.log('HTTP server closed');
      console.log('Server shutdown complete');
      process.exit(0);
    });
    
    setTimeout(() => {
      console.log('Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
    
  } catch (error) {
    console.log('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.log('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = {
  getPHTime,
  getPHTimeString,
  getPHDateString,
  formatPHTime,
  parsePHTime,
  isWithinWorkingHours,
  isTimeInAllowed,
  isTimeOutAllowed,
  WORKING_HOURS
};