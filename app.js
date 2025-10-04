const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// Load environment variables
require('dotenv').config();

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/departments', require('./routes/departments'));

// Basic route
app.get('/', (req, res) => {
    res.json({
        message: 'EMS Department API is running!',
        endpoints: {
            getDepartments: 'GET /api/departments',
            getDepartment: 'GET /api/departments/:id',
            createDepartment: 'POST /api/departments',
            updateDepartment: 'PUT /api/departments/:id',
            deleteDepartment: 'DELETE /api/departments/:id'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: err.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Server configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API URL: http://localhost:${PORT}/api/departments`);
});

module.exports = app;