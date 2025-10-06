const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'https://www.brightonsjdm.com'];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "User-Agent"],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.set('io', io);

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/BrightonSystem', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected to BrightonSystem database');
        
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(col => col.name);
        console.log('Available collections:', collectionNames);
        
        const requiredCollections = ['EMS_Employee', 'EMS_Attendance', 'EMS_UID', 'EMS_Department'];
        for (const collection of requiredCollections) {
            if (!collectionNames.includes(collection)) {
                console.log(`Creating ${collection} collection...`);
                await mongoose.connection.db.createCollection(collection);
            }
        }
        
    } catch (error) {
        console.error('Database connection error:', error.message);
        process.exit(1);
    }
};

connectDB();

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
    
    socket.on('join-employee', (employeeId) => {
        socket.join(`employee-${employeeId}`);
        console.log(`Socket ${socket.id} joined employee-${employeeId}`);
    });
    
    socket.on('leave-employee', (employeeId) => {
        socket.leave(`employee-${employeeId}`);
        console.log(`Socket ${socket.id} left employee-${employeeId}`);
    });

    socket.on('rfid-data', (data) => {
        console.log('RFID Data received:', data);
        io.emit('new-rfid-data', data);
    });

    socket.on('attendance-update', (data) => {
        console.log('Attendance update:', data);
        io.emit('attendance-changed', data);
    });
});

const departmentRoutes = require('./routes/departments');
const employeeRoutes = require('./routes/employees');
const rfidRoutes = require('./routes/rfidRoutes');

app.use('/api/departments', departmentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/rfid', rfidRoutes);

app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Backend API is working',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/api/database-status', async (req, res) => {
    try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(col => col.name);
        
        const status = {
            database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
            collections: {
                EMS_Employee: collectionNames.includes('EMS_Employee'),
                EMS_Attendance: collectionNames.includes('EMS_Attendance'),
                EMS_UID: collectionNames.includes('EMS_UID'),
                EMS_Department: collectionNames.includes('EMS_Department')
            },
            counts: {
                employees: await mongoose.connection.db.collection('EMS_Employee').countDocuments(),
                attendance: await mongoose.connection.db.collection('EMS_Attendance').countDocuments(),
                uid: await mongoose.connection.db.collection('EMS_UID').countDocuments(),
                departments: await mongoose.connection.db.collection('EMS_Department').countDocuments()
            }
        };
        
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
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
        message: 'Brighton School EMS API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
            employees: '/api/employees',
            departments: '/api/departments',
            rfid: '/api/rfid',
            test: '/api/test',
            health: '/health'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl
    });
});

app.use((err, req, res, next) => {
    console.error('Error Stack:', err.stack);
    console.error('Error Details:', err);
    
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: 'CORS Error: Origin not allowed',
            allowedOrigins: allowedOrigins
        });
    }
    
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(error => error.message);
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
            message: `Duplicate field value: ${field}`,
            error: `This ${field} already exists`
        });
    }
    
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'Invalid ID format',
            error: 'Please provide a valid ID'
        });
    }
    
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    console.log(`Local API URL: http://localhost:${PORT}`);
    console.log(`Backend URL: ${process.env.BACKEND_URL || `http://localhost:${PORT}`}`);
    console.log(`Allowed Origins: ${allowedOrigins.join(', ')}`);
});