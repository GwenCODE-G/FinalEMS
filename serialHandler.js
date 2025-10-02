import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import axios from 'axios';

class SerialHandler {
  constructor() {
    this.port = null;
    this.parser = null;
    this.isConnected = false;
    this.retryInterval = null;
    this.disabled = process.env.SERIAL_DISABLED === '1' || process.env.SERIAL_DISABLED === 'true';
    this.currentPath = null;
    this.lastScanTime = 0;
    this.scanCooldown = 3000; // 3 seconds between scans
    this.apiBaseUrls = [
      'https://brighton-sjdm-backend.vercel.app/api',
      'http://localhost:5000/api'
    ];
    this.currentApiIndex = 0;
    this.init();
  }

  getCurrentApiUrl() {
    return this.apiBaseUrls[this.currentApiIndex];
  }

  async switchToNextApi() {
    this.currentApiIndex = (this.currentApiIndex + 1) % this.apiBaseUrls.length;
    console.log('Switched to API endpoint: ' + this.getCurrentApiUrl());
    return this.getCurrentApiUrl();
  }

  async testApiConnection(apiUrl) {
    try {
      const response = await axios.get(apiUrl.replace('/api', '') + '/health', {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async findWorkingApi() {
    console.log('Testing API endpoints...');
    
    for (let i = 0; i < this.apiBaseUrls.length; i++) {
      const apiUrl = this.apiBaseUrls[i];
      console.log('Testing: ' + apiUrl);
      
      const isWorking = await this.testApiConnection(apiUrl);
      if (isWorking) {
        this.currentApiIndex = i;
        console.log('Using API endpoint: ' + this.getCurrentApiUrl());
        return true;
      } else {
        console.log('API endpoint unavailable: ' + apiUrl);
      }
    }
    
    // If no APIs work, start with the first one and let the error handling deal with it
    this.currentApiIndex = 0;
    console.log('No API endpoints available, will use first endpoint with retry');
    return false;
  }

  async init() {
    try {
      console.log('Initializing SerialHandler for RFID...');
      
      // Test API endpoints first
      await this.findWorkingApi();
      
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
      
      // Allow explicit override via env
      const overridePath = process.env.SERIAL_PORT;
      if (overridePath) {
        const exact = ports.find(p => p.path === overridePath);
        if (exact) {
          console.log('Using SERIAL_PORT override: ' + overridePath);
          return this.openPort(exact.path);
        } else {
          console.warn('SERIAL_PORT override not found among available ports: ' + overridePath);
        }
      }
      
      // Try to find Arduino port with multiple patterns
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

      console.log('Found Arduino on port: ' + arduinoPort.path);
      return this.openPort(arduinoPort.path);
    } catch (error) {
      console.error('Arduino connection failed: ' + error.message);
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
        console.log('Received from Arduino: ' + trimmedData);
        await this.handleArduinoMessage(trimmedData);
      });

      this.port.on('open', () => {
        console.log('Serial port opened successfully');
        this.isConnected = true;
        if (this.retryInterval) {
          clearInterval(this.retryInterval);
          this.retryInterval = null;
        }
        
        // Send welcome message to Arduino
        setTimeout(() => {
          this.sendToArduino('SYSTEM:READY:Welcome_to_Brighton');
        }, 1000);
      });

      this.port.on('error', (err) => {
        console.error('Serial port error: ' + err);
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
      console.error('Failed to open port ' + path + ' ' + err);
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
      console.error('Reconnect failed: ' + e.message);
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
    if (message.startsWith('UID:')) {
      const currentTime = Date.now();
      if (currentTime - this.lastScanTime < this.scanCooldown) {
        console.log('Scan cooldown active, ignoring duplicate scan');
        return;
      }
      
      this.lastScanTime = currentTime;
      const uid = message.substring(4).trim();
      console.log('Processing RFID scan: ' + uid);
      await this.processRFIDScan(uid);
    } else if (message.includes('READY') || message.includes('SYSTEM:') || message.includes('Welcome')) {
      console.log('Arduino is ready');
      this.sendToArduino('SYSTEM:CONNECTED:Backend_Ready');
    } else {
      console.log('Arduino message: ' + message);
    }
  }

  async processRFIDScan(uid) {
    const originalApiIndex = this.currentApiIndex;
    let retryCount = 0;
    const maxRetries = this.apiBaseUrls.length;

    while (retryCount < maxRetries) {
      try {
        // Clean and validate UID - remove spaces and convert to uppercase
        const cleanUid = uid.replace(/\s/g, '').toUpperCase();
        
        if (!/^[0-9A-F]{8}$/i.test(cleanUid)) {
          console.log('Invalid UID format: ' + cleanUid);
          this.sendToArduino('ERROR:INVALID_UID:Check_Card');
          return;
        }

        console.log('Processing UID: ' + cleanUid + ' via ' + this.getCurrentApiUrl());
        
        const response = await axios.post(this.getCurrentApiUrl() + '/rfid/scan', { 
          uid: cleanUid
        }, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Server response: ' + JSON.stringify(response.data));
        
        // Use displayMessage if available, otherwise use message
        let responseMessage = response.data.displayMessage || response.data.message;
        
        this.sendToArduino(responseMessage);
        return; // Success, exit the retry loop
        
      } catch (error) {
        retryCount++;
        console.error('RFID processing error (attempt ' + retryCount + '/' + maxRetries + '): ' + error.message);
        
        if (retryCount < maxRetries) {
          // Try next API endpoint
          await this.switchToNextApi();
          console.log('Retrying with next API endpoint: ' + this.getCurrentApiUrl());
          continue;
        } else {
          // All retries failed
          let errorMessage = 'ERROR:PROCESSING:Try_Again';
          if (error.code === 'ECONNREFUSED' || error.response?.status === 0) {
            errorMessage = 'ERROR:SERVER_DOWN:Backend_Offline';
            console.error('All API endpoints are unavailable!');
          } else if (error.response?.status >= 500) {
            errorMessage = 'ERROR:SERVER_ERROR:Try_Again_Later';
          } else if (error.response?.data?.displayMessage) {
            errorMessage = error.response.data.displayMessage;
          } else if (error.response?.data?.message) {
            errorMessage = 'ERROR:' + error.response.data.message.replace(/\s+/g, '_');
          } else if (error.code === 'NETWORK_ERROR' || error.code === 'ENOTFOUND') {
            errorMessage = 'ERROR:NETWORK:Check_Connection';
          }
          
          this.sendToArduino(errorMessage);
          
          // Reset to original API for next attempt
          this.currentApiIndex = originalApiIndex;
        }
      }
    }
  }

  sendToArduino(message) {
    if (this.port && this.isConnected) {
      try {
        // Add carriage return and newline for Arduino to read
        const formattedMessage = message + '\r\n';
        this.port.write(formattedMessage);
        console.log('Sent to Arduino: ' + message);
      } catch (error) {
        console.error('Error sending to Arduino: ' + error);
      }
    } else {
      console.log('Simulation mode - would send: ' + message);
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      status: this.disabled ? 'Disabled' : (this.isConnected ? 'Connected to Arduino' : 'Disconnected - Simulation Mode'),
      port: this.currentPath || null,
      disabled: this.disabled,
      currentApiUrl: this.getCurrentApiUrl(),
      availableApis: this.apiBaseUrls
    };
  }
}

export default SerialHandler;