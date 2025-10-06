const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 5001;

// Enable CORS for all origins (since RFID doesn't have a specific origin)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// RFID endpoint that forwards to your Vercel backend
app.post('/api/rfid/scan', async (req, res) => {
  try {
    console.log('📱 RFID Scan Received via Proxy:', req.body);
    
    const response = await axios.post(
      'https://brighton-sjdm-backend.vercel.app/api/rfid/scan',
      req.body,
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RFID-Proxy-Server'
        }
      }
    );
    
    console.log('Forwarded successfully:', response.data);
    res.json(response.data);
    
  } catch (error) {
    console.error('Error forwarding RFID scan:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      res.status(408).json({
        success: false,
        message: 'Request timeout - server took too long to respond',
        displayMessage: 'SERVER_TIMEOUT'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error forwarding to main server: ' + error.message,
        displayMessage: 'SERVER_ERROR'
      });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'RFID Proxy Server Running',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'RFID Proxy Server',
    endpoints: {
      health: '/health',
      rfidScan: '/api/rfid/scan'
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`RFID Proxy Server running on http://0.0.0.0:${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`Network: http://192.168.100.49:${PORT}`);
  console.log(`RFID Endpoint: http://192.168.100.49:${PORT}/api/rfid/scan`);
});