let startTime = null;
let allOrientationData = [];
let allAccelerationData = [];
let isRecording = false;
let accelX = 0, accelY = 0, accelZ = 0;
let currentSpeed = 0;
let timerInterval = null;
let recordingStartTime = null;

// DOM Elements
const permissionSection = document.getElementById('permission-section');
const displaySection = document.getElementById('display-section');
const requestPermissionBtn = document.getElementById('request-permission');
const backToStartBtn = document.getElementById('back-to-start');
const startRecBtn = document.getElementById('start-rec');
const stopRecBtn = document.getElementById('stop-rec');
const downloadCsvBtn = document.getElementById('download-csv');
const recordingDot = document.getElementById('recording-dot');
const statusText = document.getElementById('status-text');
const timerDisplay = document.getElementById('timer');
const sampleCount = document.getElementById('sample-count');

// Request permission for iOS 13+
async function requestPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceMotionEvent.requestPermission();
            if (permission === 'granted') {
                initSensors();
                showDisplaySection();
            } else {
                alert('Permission denied. Please allow motion sensor access.');
            }
        } catch (error) {
            console.error('Permission request error:', error);
            alert('Error requesting permission: ' + error.message);
        }
    } else {
        // Non-iOS 13+ devices - check if sensors are available
        initSensors();
        showDisplaySection();
    }
}

function initSensors() {
    window.addEventListener('devicemotion', handleMotion);
    window.addEventListener('deviceorientation', handleOrientation);
}

function handleOrientation(event) {
    // Get rotation values
    const alpha = event.alpha || 0; // Z-axis rotation (0-360)
    const beta = event.beta || 0;   // X-axis rotation (-180 to 180)
    const gamma = event.gamma || 0; // Y-axis rotation (-90 to 90)
    
    // Update display with orientation data
    document.getElementById('val-x').textContent = beta.toFixed(2);
    document.getElementById('val-y').textContent = gamma.toFixed(2);
    document.getElementById('val-z').textContent = alpha.toFixed(2);
    
    // Update bars (normalize to percentage)
    updateBar('bar-x', Math.abs(beta), 180);
    updateBar('bar-y', Math.abs(gamma), 90);
    updateBar('bar-z', alpha, 360);
    
    if (isRecording) {
        const currentTime = performance.now();
        const elapsed = (currentTime - startTime) / 1000;
        
        allOrientationData.push({
            alpha: alpha,
            beta: beta,
            gamma: gamma,
            timestamp: elapsed
        });
    }
}

function handleMotion(event) {
    // Get acceleration (with gravity)
    const accelWithGravity = event.accelerationIncludingGravity;
    if (accelWithGravity) {
        accelX = accelWithGravity.x || 0;
        accelY = accelWithGravity.y || 0;
        accelZ = accelWithGravity.z || 0;
    }
    
    // Calculate magnitude of acceleration
    const accelMag = Math.sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);
    
    // Subtract gravity (~9.8) to get motion-based speed approximation
    currentSpeed = Math.max(0, accelMag - 9.8) * 3.28084; // Convert m/s² to ft/s (approximation)
    
    // Update speed display
    document.getElementById('speed-val').textContent = currentSpeed.toFixed(2);
    
    if (isRecording) {
        const currentTime = performance.now();
        if (startTime === null) {
            startTime = currentTime;
        }
        
        const elapsed = (currentTime - startTime) / 1000;
        
        allAccelerationData.push({
            x: accelX,
            y: accelY,
            z: accelZ,
            magnitude: accelMag,
            speed: currentSpeed,
            timestamp: elapsed
        });
        
        // Update sample count
        sampleCount.textContent = allAccelerationData.length;
    }
}

function updateBar(barId, value, maxValue) {
    const percentage = Math.min((value / maxValue) * 100, 100);
    document.getElementById(barId).style.width = percentage + '%';
}

function showDisplaySection() {
    permissionSection.classList.add('hidden');
    displaySection.classList.remove('hidden');
}

function showPermissionSection() {
    displaySection.classList.add('hidden');
    permissionSection.classList.remove('hidden');
}

function startRecording() {
    isRecording = true;
    startTime = performance.now();
    recordingStartTime = Date.now();
    allOrientationData = [];
    allAccelerationData = [];
    
    // Update UI
    statusText.textContent = 'Recording';
    recordingDot.classList.add('recording');
    startRecBtn.classList.add('hidden');
    stopRecBtn.classList.remove('hidden');
    downloadCsvBtn.classList.add('hidden');
    sampleCount.textContent = '0';
    
    // Start timer
    timerInterval = setInterval(updateTimer, 100);
}

function stopRecording() {
    isRecording = false;
    
    // Update UI
    statusText.textContent = 'Stopped';
    recordingDot.classList.remove('recording');
    stopRecBtn.classList.add('hidden');
    startRecBtn.classList.remove('hidden');
    
    if (allAccelerationData.length > 0) {
        downloadCsvBtn.classList.remove('hidden');
    }
    
    // Stop timer
    clearInterval(timerInterval);
}

function updateTimer() {
    if (!recordingStartTime) return;
    
    const elapsed = Date.now() - recordingStartTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    timerDisplay.textContent = 
        String(hours).padStart(2, '0') + ':' +
        String(minutes).padStart(2, '0') + ':' +
        String(seconds).padStart(2, '0');
}

function downloadData() {
    if (allAccelerationData.length === 0) {
        alert('No data to download');
        return;
    }
    
    const csv = 'Time (s),Accel X (m/s²),Accel Y (m/s²),Accel Z (m/s²),Accel Magnitude (m/s²),Speed (ft/s),Orientation Alpha,Orientation Beta,Orientation Gamma\n' +
        allAccelerationData.map((d, i) => {
            const o = allOrientationData[i] || { alpha: 0, beta: 0, gamma: 0 };
            return `${d.timestamp.toFixed(3)},${d.x.toFixed(4)},${d.y.toFixed(4)},${d.z.toFixed(4)},${d.magnitude.toFixed(4)},${d.speed.toFixed(4)},${o.alpha.toFixed(2)},${o.beta.toFixed(2)},${o.gamma.toFixed(2)}`;
        }).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    a.download = `gyro_data_${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Event Listeners
requestPermissionBtn.addEventListener('click', requestPermission);
backToStartBtn.addEventListener('click', showPermissionSection);
startRecBtn.addEventListener('click', startRecording);
stopRecBtn.addEventListener('click', stopRecording);
downloadCsvBtn.addEventListener('click', downloadData);
