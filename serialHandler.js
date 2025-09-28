const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const axios = require('axios');

class SerialHandler {
  constructor() {
    this.port = null;
    this.parser = null;
    this.isConnected = false;
    this.retryInterval = null;
    this.disabled = process.env.SERIAL_DISABLED === '1' || process.env.SERIAL_DISABLED === 'true';
    this.currentPath = null;
    this.lastScanTime = 0;
    this.scanCooldown = 3000; // 3 seconds cooldown between scans
    this.init();
  }

  async init() {
    try {
      console.log('Initializing SerialHandler for RFID...');
      if (this.disabled) {
        console.log('SerialHandler is disabled via env SERIAL_DISABLED. Running in simulation mode.');
        this.isConnected = false;
        return;
      }
      await this.connectToArduino();
    } catch (error) {
      console.error('Serial handler initialization error:', error);
      this.startRetryMechanism();
    }
  }

  async connectToArduino() {
    try {
      const ports = await SerialPort.list();
      console.log('Available ports:', ports.map(p => ({ path: p.path, manufacturer: p.manufacturer })));
      
      const overridePath = process.env.SERIAL_PORT;
      if (overridePath) {
        const exact = ports.find(p => p.path === overridePath);
        if (exact) {
          console.log('Using SERIAL_PORT override:', overridePath);
          return this.openPort(exact.path);
        } else {
          console.warn('SERIAL_PORT override not found among available ports:', overridePath);
        }
      }
      
      const arduinoPort = ports.find(port => 
        port.manufacturer?.includes('Arduino') ||
        port.manufacturer?.includes('FTDI') ||
        port.manufacturer?.includes('CH340') ||
        port.productId === '0043' ||
        port.vendorId === '2341' ||
        port.vendorId === '6790' ||
        port.vendorId === '4292' ||
        port.path.includes('COM3') || port.path.includes('COM4') ||
        port.path.includes('COM5') || port.path.includes('COM6') ||
        port.path.includes('ttyUSB') || port.path.includes('ttyACM') ||
        port.path.includes('cu.usbmodem') || port.path.includes('cu.usbserial')
      );

      if (!arduinoPort) {
        throw new Error('Arduino port not found. Using simulation mode.');
      }

      console.log('Found Arduino on port:', arduinoPort.path);
      return this.openPort(arduinoPort.path);
    } catch (error) {
      console.error('Arduino connection failed:', error.message);
      this.isConnected = false;
      throw error;
    }
  }

  openPort(path) {
    try {
      this.port = new SerialPort({ 
        path, 
        baudRate: parseInt(process.env.SERIAL_BAUD || '9600', 10),
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      });
      this.currentPath = path;

      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

      this.parser.on('data', async (data) => {
        const trimmedData = data.trim();
        console.log('Received from Arduino:', trimmedData);
        await this.handleArduinoMessage(trimmedData);
      });

      this.port.on('open', () => {
        console.log('Serial port opened successfully');
        this.isConnected = true;
        if (this.retryInterval) {
          clearInterval(this.retryInterval);
          this.retryInterval = null;
        }
        
        setTimeout(() => {
          this.sendToArduino('SYSTEM:READY:Welcome_to_Brighton');
        }, 1000);
      });

      this.port.on('error', (err) => {
        console.error('Serial port error:', err);
        this.isConnected = false;
        this.startRetryMechanism();
      });

      this.port.on('close', () => {
        console.log('Serial port closed');
        this.isConnected = false;
        this.startRetryMechanism();
      });

      return true;
    } catch (err) {
      console.error('Failed to open port', path, err);
      this.isConnected = false;
      throw err;
    }
  }

  async disconnect() {
    this.disabled = true;
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
    if (this.parser) {
      try { this.parser.removeAllListeners(); } catch (_) {}
      this.parser = null;
    }
    if (this.port) {
      const p = this.port;
      this.port = null;
      await new Promise((resolve) => {
        try {
          p.close(() => resolve());
        } catch (_) { resolve(); }
      });
    }
    this.isConnected = false;
    console.log('SerialHandler disconnected (disabled=true)');
  }

  async reconnect() {
    this.disabled = false;
    if (this.isConnected) return true;
    try {
      await this.connectToArduino();
      return true;
    } catch (e) {
      console.error('Reconnect failed:', e.message);
      return false;
    }
  }

  startRetryMechanism() {
    if (this.retryInterval) return;
    
    console.log('Starting retry mechanism for Arduino connection...');
    this.retryInterval = setInterval(async () => {
      console.log('Attempting to reconnect to Arduino...');
      try {
        await this.connectToArduino();
      } catch (error) {
        console.log('Reconnection failed, will retry in 10 seconds...');
      }
    }, 10000);
  }

  async handleArduinoMessage(message) {
    // Prevent rapid scanning
    const currentTime = Date.now();
    if (currentTime - this.lastScanTime < this.scanCooldown) {
      console.log('Scan cooldown active, ignoring scan');
      return;
    }
    this.lastScanTime = currentTime;

    if (message.startsWith("Card detected! UID:")) {
      const uid = message.split("UID:")[1]?.trim();
      if (uid) {
        await this.processRFIDScan(uid);
      }
    } else if (message.startsWith("UID:")) {
      const uid = message.substring(4).trim();
      await this.processRFIDScan(uid);
    } else if (message.includes('READY') || message.includes('SYSTEM:') || message.includes('Welcome')) {
      console.log('Arduino is ready');
      this.sendToArduino('SYSTEM:CONNECTED:Backend_Ready');
    } else {
      console.log('Arduino message:', message);
    }
  }

  async processRFIDScan(uid) {
    try {
      const cleanUid = uid.replace(/\s/g, '').toUpperCase();
      console.log('Processing RFID scan:', cleanUid);
      
      if (!/^[0-9A-F]{8}$/i.test(cleanUid)) {
        console.log('Invalid UID format:', cleanUid);
        this.sendToArduino('ERROR:INVALID_UID:Check_Card');
        return;
      }

      const response = await axios.post('http://localhost:5000/api/rfid/scan', { 
        uid: cleanUid
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Server response:', response.data);
      
      let responseMessage = response.data.displayMessage || response.data.message;
      this.sendToArduino(responseMessage);
      
    } catch (error) {
      console.error('RFID processing error:', error.message);
      
      let errorMessage = 'ERROR:PROCESSING:Try_Again';
      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'ERROR:SERVER_DOWN:Start_Backend';
        console.error('Backend server is not running!');
      } else if (error.response?.data?.displayMessage) {
        errorMessage = error.response.data.displayMessage;
      } else if (error.response?.data?.message) {
        errorMessage = 'ERROR:' + error.response.data.message.replace(/\s+/g, '_');
      }
      
      this.sendToArduino(errorMessage);
    }
  }

  sendToArduino(message) {
    if (this.port && this.isConnected) {
      try {
        const formattedMessage = message + '\r\n';
        this.port.write(formattedMessage);
        console.log('Sent to Arduino:', message);
      } catch (error) {
        console.error('Error sending to Arduino:', error);
      }
    } else {
      console.log('Simulation mode - would send:', message);
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      status: this.disabled ? 'Disabled' : (this.isConnected ? 'Connected to Arduino' : 'Disconnected - Simulation Mode'),
      port: this.currentPath || null,
      disabled: this.disabled
    };
  }
}

module.exports = SerialHandler;