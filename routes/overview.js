const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');

router.get('/summary', async (req, res) => {
    try {
        const totalEmployees = await Employee.countDocuments();
        const presentToday = await Attendance.countDocuments({ 
            date: new Date().toISOString().split('T')[0],
            status: { $in: ['Present', 'Late', 'Completed'] }
        });
        
        res.json({
            success: true,
            data: {
                totalEmployees,
                presentToday,
                absentToday: totalEmployees - presentToday
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching overview data',
            error: error.message
        });
    }
});

module.exports = router;