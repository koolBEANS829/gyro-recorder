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

let isRecording = false;
let recordedData = [];
let startTime = null;
let timerInterval = null;

// Navigation
backBtn.addEventListener('click', () => {
    if (isRecording) {
        stopBtn.click();
    }
    displaySection.classList.add('hidden');
    permissionSection.classList.remove('hidden');
    window.removeEventListener('deviceorientation', handleOrientation);
    window.removeEventListener('devicemotion', handleMotion);
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

function startApp() {
    permissionSection.classList.add('hidden');
    displaySection.classList.remove('hidden');

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);
}

function handleOrientation(event) {
    const { alpha, beta, gamma } = event;

    // Update live display
    valX.textContent = beta ? beta.toFixed(2) : '0.00';
    valY.textContent = gamma ? gamma.toFixed(2) : '0.00';
    valZ.textContent = alpha ? alpha.toFixed(2) : '0.00';

    // Update bars (Normalize values for visual representation)
    // Beta: -180 to 180, Gamma: -90 to 90, Alpha: 0 to 360
    updateBar(barX, (beta + 180) / 3.6);
    updateBar(barY, (gamma + 90) / 1.8);
    updateBar(barZ, alpha / 3.6);
}

function handleMotion(event) {
    if (!isRecording) return;

    const timestamp = Date.now() - startTime;
    const { alpha, beta, gamma } = event.rotationRate || {};
    const { x, y, z } = event.accelerationIncludingGravity || {};

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

    startBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    downloadBtn.classList.add('hidden');
    recordingDot.classList.add('recording');
    statusText.textContent = 'Recording...';

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
