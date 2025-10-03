import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes and middleware
import connectDB from './src/config/database.js';
import router from './src/routes/index.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { notFound } from './src/middleware/notFound.js';
import { handleCastError } from './src/middleware/validationMiddleware.js';

// ES module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000; 

// CORS CONFIGURATION FOR VERCEL
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      // Production domains
      'https://brightonsjdm.com',
      'https://www.brightonsjdm.com',
      
      // Previous domains (keep for backward compatibility)
      'https://brighton-school-sjdm.vercel.app',
      'https://*.vercel.app',
      
      // Development
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://localhost:5000', // For direct API testing
    ];

    // Check if the origin is allowed
    if (allowedOrigins.includes(origin) || 
        origin.endsWith('.vercel.app') ||
        origin.endsWith('brightonsjdm.com')) {
      return callback(null, true);
    }

    // For Vercel preview deployments and subdomains
    if (origin.includes('vercel.app') || origin.includes('brightonsjdm.com')) {
      return callback(null, true);
    }

    // Block requests from disallowed origins
    console.log('CORS blocked: ' + origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'User-Agent'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400,
};

app.use(cors(corsOptions));

// Handle preflight requests globally
app.options('*', cors(corsOptions));

// Middleware - INCREASE PAYLOAD LIMIT FOR BASE64 IMAGES
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// DATABASE HANDLING
let dbInitialized = false;
let isDatabaseConnected = false;

const initializeDatabase = async () => {
  if (!dbInitialized) {
    try {
      await connectDB();
      dbInitialized = true;
      isDatabaseConnected = true;
      console.log('Database initialization complete');
      
      // Initialize collections if they don't exist
      await initializeCollections();
    } catch (error) {
      console.error('Database initialization failed: ' + error.message);
      dbInitialized = true; // Mark as initialized even if failed to prevent repeated attempts
      isDatabaseConnected = false;
      
      // Continue without database in production, crash in development
      if (process.env.NODE_ENV !== 'production') {
        throw error;
      }
    }
  }
  return isDatabaseConnected;
};

// Initialize required collections and indexes
const initializeCollections = async () => {
  try {
    const db = mongoose.connection.db;
    
    // Ensure EMS_Attendance collection exists with proper indexes
    const attendanceCollection = db.collection('EMS_Attendance');
    await attendanceCollection.createIndex({ employeeId: 1, date: 1 }, { unique: true });
    await attendanceCollection.createIndex({ rfidUid: 1, date: 1 });
    await attendanceCollection.createIndex({ date: 1 });
    await attendanceCollection.createIndex({ employeeId: 1, date: -1 });
    
    console.log('EMS_Attendance collection initialized with indexes');
    
    // Ensure EMS_ActivityLogs collection exists
    const activityLogsCollection = db.collection('EMS_ActivityLogs');
    await activityLogsCollection.createIndex({ employeeId: 1, timestamp: -1 });
    await activityLogsCollection.createIndex({ action: 1, timestamp: -1 });
    await activityLogsCollection.createIndex({ timestamp: -1 });
    
    console.log('EMS_ActivityLogs collection initialized with indexes');
    
    // Ensure EMS_Employee collection exists with proper indexes
    const employeeCollection = db.collection('EMS_Employee');
    await employeeCollection.createIndex({ employeeId: 1 }, { unique: true });
    await employeeCollection.createIndex({ email: 1 }, { unique: true });
    await employeeCollection.createIndex({ rfidUid: 1 }, { sparse: true });
    await employeeCollection.createIndex({ status: 1 });
    
    console.log('EMS_Employee collection initialized with indexes');
    
    // Ensure EMS_Department collection exists
    const departmentCollection = db.collection('EMS_Department');
    await departmentCollection.createIndex({ name: 1 }, { unique: true });
    
    console.log('EMS_Department collection initialized with indexes');
    
  } catch (error) {
    console.error('Error initializing collections:', error.message);
  }
};

// Health check endpoint for Vercel
app.get('/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.status(200).json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      platform: process.env.VERCEL ? 'Vercel Serverless' : 'Traditional Server',
      database: {
        status: dbStatus,
        connected: dbStatus === 'connected',
        name: mongoose.connection.name || 'BrightonSystem'
      },
      databaseInitialized: dbInitialized,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server health check failed',
      error: error.message
    });
  }
});

// Simple test route at root level to verify server is working
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Brighton EMS API Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    database: isDatabaseConnected ? 'Connected' : 'Disconnected',
    databaseInitialized: dbInitialized,
    deployment: process.env.VERCEL ? 'Vercel' : 'Local',
    features: [
      'RFID Attendance Tracking',
      'Employee Management',
      'Department Management',
      'Activity Logging',
      'Real-time Updates'
    ]
  });
});

// ADD THESE TEST ROUTES BEFORE THE MAIN ROUTER
// Test RFID endpoint directly (without /api prefix to avoid redirect issues)
app.post('/rfid-test', (req, res) => {
  console.log('RFID Test Endpoint Hit:', {
    body: req.body,
    headers: req.headers,
    method: req.method,
    url: req.originalUrl
  });
  
  res.json({
    success: true,
    message: 'RFID test endpoint is working!',
    received: req.body,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint for ESP8266 to verify connectivity
app.get('/rfid-status', (req, res) => {
  res.json({
    status: 'operational',
    message: 'RFID system is ready',
    timestamp: new Date().toISOString(),
    database: isDatabaseConnected ? 'connected' : 'disconnected',
    version: '2.0.0'
  });
});

// RFID Health Check Endpoint
app.get('/rfid-health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1;
    
    // Check if required collections exist
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    
    const requiredCollections = ['EMS_Attendance', 'EMS_Employee', 'EMS_ActivityLogs', 'EMS_Department'];
    const missingCollections = requiredCollections.filter(col => !collectionNames.includes(col));
    
    res.json({
      status: 'healthy',
      database: {
        connected: dbStatus,
        collections: {
          required: requiredCollections,
          existing: collectionNames.filter(col => requiredCollections.includes(col)),
          missing: missingCollections
        }
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.use(handleCastError);

// Debug middleware - log ALL requests with origin info (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(new Date().toISOString() + ' - ' + req.method + ' ' + req.originalUrl + ' - Origin: ' + (req.headers.origin || 'No Origin'));
    next();
  });
} else {
  // In production, log only RFID requests
  app.use((req, res, next) => {
    if (req.originalUrl.includes('/rfid') || req.originalUrl.includes('/api/rfid')) {
      console.log(new Date().toISOString() + ' - ' + req.method + ' ' + req.originalUrl);
    }
    next();
  });
}

// Database connection middleware for Vercel serverless
app.use(async (req, res, next) => {
  // Only attempt to initialize if not already done
  if (!dbInitialized) {
    try {
      await initializeDatabase();
    } catch (error) {
      console.error('Database connection failed in middleware: ' + error.message);
      // In production, continue without database connection
      if (process.env.NODE_ENV === 'production') {
        console.log('Continuing without database connection in production');
      }
    }
  }
  next();
});

// Use the main router
app.use('/api', router);

// Test route to verify auth routes are working
app.get('/api/test-auth', (req, res) => {
  res.json({ 
    message: 'Auth test route is working!',
    cors: 'CORS is properly configured',
    origin: req.headers.origin || 'No Origin Header',
    database: isDatabaseConnected ? 'Connected' : 'Disconnected',
    databaseInitialized: dbInitialized,
    environment: process.env.NODE_ENV || 'development'
  });
});

// ADD DIRECT RFID ENDPOINT TO AVOID REDIRECT ISSUES
app.post('/api/rfid/scan', async (req, res) => {
  try {
    console.log('DIRECT RFID SCAN ENDPOINT HIT');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    const { uid } = req.body;
    
    if (!uid) {
      console.log('ERROR: No UID provided');
      return res.status(400).json({ 
        message: 'ERROR:NO_UID',
        displayMessage: 'ERROR:NO_UID:Scan_Again'
      });
    }

    // Import the actual RFID handler models
    const Employee = await import('./models/Employee.js').then(m => m.default);
    const Attendance = await import('./models/Attendance.js').then(m => m.default);
    const ActivityLog = await import('./models/ActivityLog.js').then(m => m.default);
    
    // RFID UID formatting and validation
    const formatRfidUid = (uid) => {
      if (!uid) return null;
      let cleanUid = uid.replace(/\s/g, '').toUpperCase();
      if (cleanUid.length !== 8) {
        throw new Error('Invalid UID length. Must be 8 characters (4 bytes)');
      }
      return cleanUid.match(/.{1,2}/g).join(' ');
    };

    const validateRfidUid = (uid) => {
      const cleanUid = uid.replace(/\s/g, '');
      return /^[0-9A-F]{8}$/i.test(cleanUid);
    };

    const cleanUid = uid.replace(/\s/g, '').toUpperCase();
    console.log('Cleaned UID:', cleanUid);

    if (!validateRfidUid(cleanUid)) {
      console.log('ERROR: Invalid UID format');
      return res.status(400).json({ 
        message: 'ERROR:INVALID_UID',
        displayMessage: 'ERROR:INVALID_UID:Check_Card'
      });
    }

    const formattedUid = formatRfidUid(cleanUid);
    console.log('Formatted UID for lookup:', formattedUid);
    
    // Find employee with this RFID UID
    const employee = await Employee.findOne({ 
      rfidUid: formattedUid,
      status: 'Active'
    });

    if (!employee) {
      console.log('ERROR: No employee found with UID:', formattedUid);
      
      // Check if this UID exists but assigned to archived/inactive employee
      const inactiveEmployee = await Employee.findOne({ 
        rfidUid: formattedUid,
        status: 'Archived'
      });
      
      if (inactiveEmployee) {
        return res.json({ 
          message: 'ERROR:EMPLOYEE_INACTIVE',
          displayMessage: 'ERROR:EMPLOYEE_INACTIVE:Card_Archived'
        });
      }
      
      return res.json({ 
        message: 'ERROR:NO_ASSIGNED_UID',
        displayMessage: 'ERROR:NO_ASSIGNED_UID:See_Admin',
        uid: formattedUid
      });
    }

    console.log('Employee found:', {
      name: `${employee.firstName} ${employee.lastName}`,
      employeeId: employee.employeeId,
      department: employee.department
    });

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    // Get work schedule for today
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[today.getDay()];
    const isWorkDay = employee.workDays && employee.workDays[dayName];
    
    // Find existing attendance record for today
    let attendance = await Attendance.findOne({
      employeeId: employee.employeeId,
      date: today
    });

    let actionType = 'IN';
    let responseMessage = '';

    if (!attendance) {
      console.log('Recording Time In for employee:', employee.employeeId);
      
      let lateMinutes = 0;
      if (isWorkDay && employee.workSchedule && employee.workSchedule[dayName]) {
        try {
          const schedule = employee.workSchedule[dayName];
          const [scheduledHour, scheduledMinute] = schedule.start.split(':').map(Number);
          const scheduledTime = new Date(today);
          scheduledTime.setHours(scheduledHour, scheduledMinute, 0, 0);
          
          if (now > scheduledTime) {
            lateMinutes = Math.round((now - scheduledTime) / (1000 * 60));
          }
        } catch (error) {
          console.error('Error calculating late minutes:', error);
        }
      }

      const status = isWorkDay ? (lateMinutes > 30 ? 'Late' : 'Present') : 'No Work';
      
      attendance = new Attendance({
        employeeId: employee.employeeId,
        date: today,
        timeIn: now,
        rfidUid: formattedUid,
        status: status,
        isWorkDay: isWorkDay,
        lateMinutes: lateMinutes,
        notes: !isWorkDay ? `Scanned on non-work day (${dayName})` : ''
      });

      await attendance.save();
      
      // Log attendance activity
      await ActivityLog.create({
        action: 'ATTENDANCE_RECORDED',
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        details: {
          type: 'TIME_IN',
          time: now,
          status: status,
          lateMinutes: lateMinutes,
          rfidUid: formattedUid
        },
        timestamp: new Date()
      });
      
      console.log('Time In recorded successfully. Status:', attendance.status);
      responseMessage = 'SUCCESS:CHECKIN';
      actionType = 'IN';

    } else if (attendance.timeIn && !attendance.timeOut) {
      console.log('Recording Time Out for employee:', employee.employeeId);
      
      attendance.timeOut = now;
      actionType = 'OUT';
      
      // Calculate hours worked
      const hoursWorked = parseFloat(((now - attendance.timeIn) / (1000 * 60 * 60)).toFixed(2));
      attendance.hoursWorked = hoursWorked;
      attendance.status = hoursWorked >= 4 ? 'Completed' : 'Half-day';

      await attendance.save();
      
      // Log attendance completion
      await ActivityLog.create({
        action: 'ATTENDANCE_RECORDED',
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        details: {
          type: 'TIME_OUT',
          time: now,
          status: attendance.status,
          hoursWorked: attendance.hoursWorked,
          rfidUid: formattedUid
        },
        timestamp: new Date()
      });
      
      console.log('Time Out recorded successfully:', {
        hoursWorked: attendance.hoursWorked,
        status: attendance.status
      });

      responseMessage = 'SUCCESS:CHECKOUT';

    } else {
      console.log('Attendance already completed for today');
      return res.json({
        message: 'INFO:ALREADY_DONE',
        displayMessage: 'INFO:ALREADY_DONE:Attendance_Complete',
        name: `${employee.firstName} ${employee.lastName}`,
        rfid: formattedUid,
        status: attendance.status,
        timeIn: attendance.timeIn ? new Date(attendance.timeIn).toLocaleTimeString() : null,
        timeOut: attendance.timeOut ? new Date(attendance.timeOut).toLocaleTimeString() : null,
        action: 'INFO'
      });
    }

    const employeeName = `${employee.firstName} ${employee.lastName}`.replace(/\s+/g, '_');
    const displayMessage = `${responseMessage}:${employeeName}:${actionType}`;
    
    console.log('Sending success response:', {
      message: responseMessage,
      displayMessage: displayMessage,
      name: employeeName.replace(/_/g, ' '),
      action: actionType
    });
    
    return res.json({
      message: responseMessage,
      displayMessage: displayMessage,
      name: employeeName.replace(/_/g, ' '),
      rfid: formattedUid,
      type: actionType,
      time: now.toLocaleTimeString(),
      status: attendance.status,
      isWorkDay: isWorkDay,
      hoursWorked: attendance.hoursWorked,
      lateMinutes: attendance.lateMinutes,
      overtimeMinutes: attendance.overtimeMinutes || 0,
      employeeId: employee.employeeId
    });

  } catch (error) {
    console.error('RFID Scan Error:', error);
    
    // Log system error
    try {
      const ActivityLog = await import('./models/ActivityLog.js').then(m => m.default);
      await ActivityLog.create({
        action: 'SYSTEM_ERROR',
        employeeId: 'SYSTEM',
        employeeName: 'System',
        details: {
          error: error.message,
          endpoint: 'rfid/scan',
          timestamp: new Date()
        },
        timestamp: new Date()
      });
    } catch (logError) {
      console.error('Failed to log system error:', logError);
    }
    
    return res.status(500).json({ 
      message: 'ERROR:PROCESSING',
      displayMessage: 'ERROR:PROCESSING:Try_Again',
      error: error.message
    });
  }
});

// Real-time updates endpoint for SSE
app.get('/api/rfid/realtime', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial connection message
  res.write('data: ' + JSON.stringify({
    type: 'connected',
    message: 'Real-time updates connected',
    timestamp: new Date().toISOString()
  }) + '\n\n');

  // Send periodic heartbeats
  const heartbeat = setInterval(() => {
    res.write('data: ' + JSON.stringify({
      type: 'heartbeat',
      timestamp: new Date().toISOString()
    }) + '\n\n');
  }, 30000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    console.log('Client disconnected from real-time updates');
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'File too large. Please upload a smaller image (max 50MB).'
    });
  }
  
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy: Request not allowed from this origin',
      allowedOrigins: [
        'https://brightonsjdm.com',
        'https://www.brightonsjdm.com',
        'https://brighton-school-sjdm.vercel.app',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
      ],
      yourOrigin: req.headers.origin || 'Not provided'
    });
  }
  
  // Handle MongoDB connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    return res.status(503).json({
      success: false,
      message: 'Database service temporarily unavailable',
      error: process.env.NODE_ENV === 'production' ? 'Service unavailable' : err.message
    });
  }
  
  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
      field: field,
      error: 'DUPLICATE_ENTRY'
    });
  }
  
  // Handle MongoDB validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors
    });
  }
  
  next(err);
});

app.use(errorHandler);

// 404 handler
app.use('*', notFound);

// VERCEL SERVERLESS COMPATIBILITY - Export the app directly for Vercel
export default app;

// Traditional server startup for local development
const startServer = async () => {
  try {
    // Initialize database before starting server
    await initializeDatabase();
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('Server running on http://localhost:' + PORT);
      console.log('Environment: ' + (process.env.NODE_ENV || 'development'));
      console.log('Database: ' + (isDatabaseConnected ? 'Connected' : 'Disconnected'));
      console.log('Payload limit: 50MB');
      console.log('Available Endpoints:');
      console.log('   GET  /              - Server status');
      console.log('   GET  /health        - Health check');
      console.log('   GET  /rfid-status   - RFID status check');
      console.log('   GET  /rfid-health   - RFID system health');
      console.log('   POST /rfid-test     - RFID test endpoint');
      console.log('   POST /api/rfid/scan - RFID scan endpoint');
      console.log('   GET  /api/test-auth - Auth test');
      console.log('   GET  /api/employees - Get employees');
      console.log('   POST /api/employees - Create employee');
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Development URLs:');
        console.log('   Frontend: http://localhost:3000');
        console.log('   Backend:  http://localhost:' + PORT);
        console.log('   MongoDB:  ' + (process.env.MONGODB_URL ? 'Connected' : 'Not configured'));
      }
    });

    // Handle server errors
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error('Port ' + PORT + ' is already in use. Please use a different port.');
        console.log('Try: npx kill-port ' + PORT + ' or change PORT environment variable');
      } else {
        console.error('Server error: ' + err);
      }
      process.exit(1);
    });

    // Graceful shutdown
    const gracefulShutdown = () => {
      console.log('Shutting down server gracefully...');
      server.close(() => {
        console.log('HTTP server closed');
        if (mongoose.connection.readyState === 1) {
          mongoose.connection.close(false, () => {
            console.log('Database connection closed');
            process.exit(0);
          });
        } else {
          process.exit(0);
        }
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown();
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown();
    });
    
  } catch (error) {
    console.error('Failed to start server: ' + error);
    
    // In production, start server even if database fails
    if (process.env.NODE_ENV === 'production') {
      console.log('Starting server without database connection...');
      const server = app.listen(PORT, () => {
        console.log('Server running on port ' + PORT + ' (without database)');
      });
    } else {
      process.exit(1);
    }
  }
};

// Only start traditional server if not in Vercel environment
if (!process.env.VERCEL) {
  startServer().catch(error => {
    console.error('Server startup failed: ' + error);
    process.exit(1);
  });
}