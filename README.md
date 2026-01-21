# GyroStream

**Precision Motion Capture for Mobile Devices**

A sleek, modern web application that records high-precision gyroscope and accelerometer data directly from your smartphone's browser.

![GyroStream Preview](https://img.shields.io/badge/Made%20with-❤️-red) ![License](https://img.shields.io/badge/License-MIT-blue)

---

## ✨ Features

- **Real-time Visualization** — Watch your device's motion as animated waveforms
- **Circular Gauges** — Beautiful ring displays for pitch, roll, and yaw
- **Speed Estimation** — Approximate movement speed from accelerometer data
- **High-Frequency Recording** — Capture at your device's native sensor rate
- **CSV Export** — Download data for analysis in Excel, Python, or MATLAB

---

## 📱 Quick Start

### Option 1: Use Online
Visit a hosted version (deploy to GitHub Pages, Vercel, or Netlify for free HTTPS).

### Option 2: Local Development

```bash
# Clone the repository
git clone https://github.com/koolBEANS829/gyro-recorder.git
cd gyro-recorder

# Start a local server
npx http-server . -p 8080

# Create an HTTPS tunnel (required for sensor access)
npx localtunnel --port 8080
```

Open the `https://` URL on your phone.

---

## 📊 Data Format

Exported CSV includes:

| Column | Description |
|--------|-------------|
| `Time (s)` | Elapsed time since recording started |
| `Accel X/Y/Z` | Acceleration including gravity (m/s²) |
| `Accel Magnitude` | Total acceleration magnitude |
| `Speed (ft/s)` | Estimated linear speed |
| `Orientation Alpha` | Rotation around Z-axis (0-360°) |
| `Orientation Beta` | Rotation around X-axis (-180 to 180°) |
| `Orientation Gamma` | Rotation around Y-axis (-90 to 90°) |

---

## 🔧 Requirements

- **Modern smartphone** with gyroscope (iPhone or Android)
- **HTTPS connection** — Browsers require secure contexts for sensor access
- **Compatible browser** — Chrome (Android) or Safari (iOS)

---

## 🚀 Deployment

Deploy for free with:

- **[GitHub Pages](https://pages.github.com/)** — Enable in repo settings
- **[Vercel](https://vercel.com/)** — Connect your repo for auto-deploy
- **[Netlify](https://netlify.com/)** — Drag and drop the folder

All provide free HTTPS automatically.

---

## 📁 Project Structure

```
gyro-recorder/
├── index.html      # Main HTML structure
├── style.css       # Modern CSS with design tokens
├── app.js          # Core application logic
└── README.md       # This file
```

---

## 🎨 Design

Built with modern web standards:
- CSS Custom Properties for theming
- Glassmorphism effects with backdrop-filter
- Responsive design with safe area support
- Smooth animations and micro-interactions

---

## 📝 License

MIT License — feel free to use and modify.

---

<p align="center">
  <sub>Built for precision motion analysis</sub>
</p>
