const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Make io accessible to routes
app.set('io', io);

// Database connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected to BrightonSystem database');
        
        // Verify collections exist
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(col => col.name);
        console.log('Available collections:', collectionNames);
        
        if (!collectionNames.includes('EMS_Employee')) {
            console.log('EMS_Employee collection not found');
        }
        if (!collectionNames.includes('EMS_Attendance')) {
            console.log('EMS_Attendance collection not found');
        }
        if (!collectionNames.includes('EMS_UID')) {
            console.log(' EMS_UID collection not found');
        }
        if (!collectionNames.includes('EMS_Department')) {
            console.log('EMS_Department collection not found');
        }
        
    } catch (error) {
        console.error('Database connection error:', error.message);
        process.exit(1);
    }
};

connectDB();

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
    
    // Join room for specific employee updates
    socket.on('join-employee', (employeeId) => {
        socket.join(`employee-${employeeId}`);
        console.log(`Socket ${socket.id} joined employee-${employeeId}`);
    });
    
    // Leave employee room
    socket.on('leave-employee', (employeeId) => {
        socket.leave(`employee-${employeeId}`);
        console.log(`Socket ${socket.id} left employee-${employeeId}`);
    });
});

// Routes
const departmentRoutes = require('./routes/departments');
const employeeRoutes = require('./routes/employees');
const rfidRoutes = require('./routes/rfidRoutes');

app.use('/api/departments', departmentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/rfid', rfidRoutes);

// Test route for frontend connection
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Backend API is working',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
});

// Database status route
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

// Basic route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Brighton School EMS API',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`MongoDB: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
});