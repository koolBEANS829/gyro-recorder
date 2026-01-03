# GyroStream - Mobile Gyroscope Recorder

This project allows you to record high-precision gyroscope and accelerometer data directly from your smartphone's browser.

## Features
- **Real-time Visualization**: Watch your device's orientation changes live.
- **Recording**: Capture data at the device's native sensor frequency.
- **Export**: Download your data as a `.csv` file for analysis in Excel, Python, or MATLAB.

## How to use on your phone

### 1. Requirements
- A smartphone with a gyroscope (iOS or Android).
- **HTTPS is mandatory**: Browsers disable sensor access on non-secure connections.

### 2. Local Testing (Easy)
If you want to test this immediately on your local network:
1. Open your terminal in this directory.
2. Run a secure tunnel (e.g., using [ngrok](https://ngrok.com/) or [localtunnel](https://github.com/localtunnel/localtunnel)).
   ```bash
   npx localtunnel --port 8080
   ```
3. Start a simple server:
   ```bash
   npx http-server . -p 8080
   ```
4. Open the `https://...` URL provided by localtunnel on your phone.

### 3. Deployment
The easiest way to use this permanently is to upload these files to **GitHub Pages**, **Vercel**, or **Netlify**. They all provide free HTTPS by default.

## Data Format
The exported CSV contains:
- `Timestamp_ms`: Milliseconds since the start of recording.
- `Gyro_Alpha/Beta/Gamma`: Rotation rate (degrees/sec).
- `Accel_X/Y/Z`: Acceleration including gravity (m/s²).
