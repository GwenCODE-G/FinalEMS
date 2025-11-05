const cron = require('node-cron');
const Attendance = require('../models/Attendance');
const moment = require('moment-timezone');

moment.tz.setDefault('Asia/Manila');

const setupAutoTimeoutJob = () => {
  cron.schedule('5 19 * * *', async () => {
    try {
      console.log('Running automatic time out job at 7:05 PM Philippines Time...');
      const result = await Attendance.processAutomaticTimeOut();
      console.log('Automatic time out job completed:', result);
    } catch (error) {
      console.error('Automatic time out job failed:', error);
    }
  }, {
    timezone: "Asia/Manila"
  });

  cron.schedule('0 20 * * *', async () => {
    try {
      console.log('Running safety check automatic time out job at 8:00 PM Philippines Time...');
      const result = await Attendance.processAutomaticTimeOut();
      console.log('Safety check automatic time out job completed:', result);
    } catch (error) {
      console.error('Safety check automatic time out job failed:', error);
    }
  }, {
    timezone: "Asia/Manila"
  });

  console.log('Automatic time out jobs scheduled (7:05 PM and 8:00 PM Philippines Time)');
};

module.exports = setupAutoTimeoutJob;