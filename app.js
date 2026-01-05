const permissionSection = document.getElementById('permission-section');
const displaySection = document.getElementById('display-section');
const requestBtn = document.getElementById('request-permission');
const startBtn = document.getElementById('start-rec');
const stopBtn = document.getElementById('stop-rec');
const downloadBtn = document.getElementById('download-csv');
const backBtn = document.getElementById('back-to-start');
const timerDisplay = document.getElementById('timer');
const sampleCountDisplay = document.getElementById('sample-count');
const recordingDot = document.getElementById('recording-dot');
const statusText = document.getElementById('status-text');

const valX = document.getElementById('val-x');
const valY = document.getElementById('val-y');
const valZ = document.getElementById('val-z');
const barX = document.getElementById('bar-x');
const barY = document.getElementById('bar-y');
const barZ = document.getElementById('bar-z');

// Speed Tracker Element
const speedVal = document.getElementById('speed-val');

let isRecording = false;
let recordedData = [];
let startTime = null;
let timerInterval = null;

// Speed calculation variables
let currentSpeed = 0; // m/s
let lastMotionTime = 0;

// Graph Variables
let chart;
const visualizerContainer = document.getElementById('visualizer-container');
const pipButton = document.getElementById('pip-button');
let pipWindow = null;

// Wake Lock
let wakeLock = null;

// Navigation
backBtn.addEventListener('click', () => {
    if (isRecording) {
        stopBtn.click();
    }

    displaySection.classList.add('hidden');
    permissionSection.classList.remove('hidden');
    window.removeEventListener('deviceorientation', handleOrientation);
    window.removeEventListener('devicemotion', handleMotion);

    // Reset Speed
    currentSpeed = 0;
    if (speedVal) speedVal.textContent = '0.00';

    releaseWakeLock();
});

// Permission Handling
requestBtn.addEventListener('click', async () => {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+ requirement
        try {
            const permissionState = await DeviceOrientationEvent.requestPermission();
            if (permissionState === 'granted') {
                startApp();
            } else {
                alert('Permission denied. Please enable motion sensors in settings.');
            }
        } catch (error) {
            console.error(error);
            alert('Error requesting permission.');
        }
    } else {
        // Non-iOS or older versions
        startApp();
    }
});

// Wake Lock Functionality
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock is active');
            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock released');
            });
        }
    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
    }
}

function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release()
            .then(() => {
                wakeLock = null;
            });
    }
}

// Re-acquire wake lock on visibility change
document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});


// Picture-in-Picture Mode
pipButton.addEventListener('click', async () => {
    // Check if Document PiP is supported
    if (!('documentPictureInPicture' in window)) {
        alert('Picture-in-Picture is not supported in this browser. Try Chrome on desktop.');
        return;
    }

    try {
        // Open PiP window
        pipWindow = await documentPictureInPicture.requestWindow({
            width: 300,
            height: 300
        });

        // Copy styles to PiP window
        const style = pipWindow.document.createElement('style');
        style.textContent = `
            body { 
                margin: 0; 
                background: #050510; 
                display: flex; 
                align-items: center; 
                justify-content: center;
                overflow: hidden;
            }
            canvas { width: 100% !important; height: 100% !important; }
        `;
        pipWindow.document.head.appendChild(style);

        // Move the canvas to PiP window
        const canvas = visualizerContainer.querySelector('canvas');
        if (canvas) {
            pipWindow.document.body.appendChild(canvas);
        }

        // Handle PiP window close
        pipWindow.addEventListener('pagehide', () => {
            // Move canvas back
            const canvas = pipWindow.document.querySelector('canvas');
            if (canvas) {
                visualizerContainer.appendChild(canvas);
            }
            pipWindow = null;
            pipButton.textContent = '⧉ Pop Out';
        });

        pipButton.textContent = '⧉ Pop In';

    } catch (error) {
        console.error('PiP Error:', error);
        alert('Could not open Picture-in-Picture: ' + error.message);
    }
});

function startApp() {
    permissionSection.classList.add('hidden');
    displaySection.classList.remove('hidden');

    initGraph();
    requestWakeLock();

    // Reset Motion Time
    lastMotionTime = Date.now();
    currentSpeed = 0;

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);
}

function initGraph() {
    if (chart) {
        chart.destroy();
    }
    visualizerContainer.innerHTML = '<canvas id="sensorChart"></canvas>';
    const ctx = document.getElementById('sensorChart').getContext('2d');

    const initialData = {
        labels: Array(50).fill(''),
        datasets: [
            {
                label: 'Accel X',
                borderColor: 'rgb(255, 99, 132)',
                data: Array(50).fill(0),
                fill: false,
                pointRadius: 0
            },
            {
                label: 'Accel Y',
                borderColor: 'rgb(54, 162, 235)',
                data: Array(50).fill(0),
                fill: false,
                pointRadius: 0
            },
            {
                label: 'Accel Z',
                borderColor: 'rgb(75, 192, 192)',
                data: Array(50).fill(0),
                fill: false,
                pointRadius: 0
            }
        ]
    };

    chart = new Chart(ctx, {
        type: 'line',
        data: initialData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    labels: {
                        color: 'white'
                    }
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.6)'
                    },
                    suggestedMin: -10,
                    suggestedMax: 10
                }
            }
        }
    });
}


function handleOrientation(event) {
    const { alpha, beta, gamma } = event;

    // Update live display
    valX.textContent = beta ? beta.toFixed(2) : '0.00';
    valY.textContent = gamma ? gamma.toFixed(2) : '0.00';
    valZ.textContent = alpha ? alpha.toFixed(2) : '0.00';

    // Update bars
    updateBar(barX, (beta + 180) / 3.6);
    updateBar(barY, (gamma + 90) / 1.8);
    updateBar(barZ, alpha / 3.6);
}

function handleMotion(event) {
    const now = Date.now();
    // Use acceleration including gravity for graph/data (raw sensor data)
    const { x, y, z } = event.accelerationIncludingGravity || {};

    // Use acceleration without gravity for speed calculation (if available)
    // Fallback to removing gravity from Z if not available is tricky due to orientation.
    // Best effort: rely on event.acceleration
    const linearAccel = event.acceleration || { x: 0, y: 0, z: 0 };
    const ax = linearAccel.x || 0;
    const ay = linearAccel.y || 0;
    const az = linearAccel.z || 0;

    // Calculate dt in seconds
    const dt = (now - lastMotionTime) / 1000;
    lastMotionTime = now;

    // Calculate magnitude of linear acceleration
    const accelMag = Math.sqrt(ax * ax + ay * ay + az * az);

    // Simple Integration for Speed (v = v0 + a*t)
    // Apply a threshold to ignore noise (e.g., < 0.2 m/s^2)
    if (accelMag > 0.2) {
        currentSpeed += accelMag * dt;
    } else {
        // Optional: Decay speed when not moving to correct drift?
        // currentSpeed *= 0.95;
        // For now, let's keep it pure integration but maybe cap it or reset if desired.
        // User asked for a tracker, usually implying accumulation.
    }

    // Convert m/s to ft/s
    const speedFps = currentSpeed * 3.28084;

    // Update Speed Display
    if (speedVal) {
        speedVal.textContent = speedFps.toFixed(2);
    }


    // Update Graph
    if (chart) {
        chart.data.datasets[0].data.push(x || 0);
        chart.data.datasets[0].data.shift();

        chart.data.datasets[1].data.push(y || 0);
        chart.data.datasets[1].data.shift();

        chart.data.datasets[2].data.push(z || 0);
        chart.data.datasets[2].data.shift();

        chart.update();
    }

    if (!isRecording) return;

    const timestamp = Date.now() - startTime;
    const { alpha, beta, gamma } = event.rotationRate || {};

    recordedData.push({
        timestamp,
        gyroAlpha: alpha || 0,
        gyroBeta: beta || 0,
        gyroGamma: gamma || 0,
        accelX: x || 0,
        accelY: y || 0,
        accelZ: z || 0
    });

    sampleCountDisplay.textContent = recordedData.length;
}

function updateBar(element, percent) {
    element.style.width = Math.min(100, Math.max(0, percent)) + '%';
}

// Recording Logic
startBtn.addEventListener('click', () => {
    isRecording = true;
    recordedData = [];
    startTime = Date.now();
    // Reset Speed on recording start? Usually you want to track from start of recording.
    // Or track continuously? The prompt implies "Speed tracker" which is often continuous.
    // But recording usually implies a session.
    // I'll reset speed on start recording as well to ensure data alignment.
    currentSpeed = 0;

    startBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    downloadBtn.classList.add('hidden');
    recordingDot.classList.add('recording');
    statusText.textContent = 'Recording...';

    // Ensure wake lock is active
    if (!wakeLock) {
        requestWakeLock();
    }

    timerInterval = setInterval(updateTimer, 10);
});

stopBtn.addEventListener('click', () => {
    isRecording = false;
    clearInterval(timerInterval);

    stopBtn.classList.add('hidden');
    startBtn.classList.remove('hidden');
    downloadBtn.classList.remove('hidden');
    recordingDot.classList.remove('recording');
    statusText.textContent = 'Recording Stopped';
});

function updateTimer() {
    const now = Date.now();
    const diff = now - startTime;
    const ms = Math.floor((diff % 1000) / 10);
    const s = Math.floor((diff / 1000) % 60);
    const m = Math.floor((diff / 60000) % 60);

    timerDisplay.textContent =
        `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
}

// Data Export
downloadBtn.addEventListener('click', () => {
    if (recordedData.length === 0) return;

    const headers = ['Timestamp_ms', 'Gyro_Alpha', 'Gyro_Beta', 'Gyro_Gamma', 'Accel_X', 'Accel_Y', 'Accel_Z'];
    const csvRows = [
        headers.join(','),
        ...recordedData.map(row => [
            row.timestamp,
            row.gyroAlpha.toFixed(4),
            row.gyroBeta.toFixed(4),
            row.gyroGamma.toFixed(4),
            row.accelX.toFixed(4),
            row.accelY.toFixed(4),
            row.accelZ.toFixed(4)
        ].join(','))
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `gyro_data_${Date.now()}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});
