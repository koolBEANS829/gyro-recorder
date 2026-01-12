let startTime = null;
let allOrientationData = [];
let allAccelerationData = [];
let isRecording = false;
let accelX = 0, accelY = 0, accelZ = 0;
let currentSpeed = 0;

// Request permission for iOS 13+
async function requestPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceMotionEvent.requestPermission();
            if (permission === 'granted') {
                window.addEventListener('devicemotion', handleMotion);
            }
        } catch (error) {
            console.error('Permission request error:', error);
        }
    } else {
        // Non-iOS 13+ devices
        window.addEventListener('devicemotion', handleMotion);
    }
}

function handleMotion(event) {
    // Get acceleration (with gravity)
    accelX = event.accelerationIncludingGravity.x;
    accelY = event.accelerationIncludingGravity.y;
    accelZ = event.accelerationIncludingGravity.z;
    
    // Calculate magnitude of acceleration
    const accelMag = Math.sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);
    
    // Calculate instantaneous speed (feet per second)
    currentSpeed = accelMag;
    
    if (isRecording) {
        const currentTime = performance.now();
        if (startTime === null) {
            startTime = currentTime;
        }
        
        const elapsed = (currentTime - startTime) / 1000; // Convert to seconds
        
        allAccelerationData.push({
            x: accelX,
            y: accelY,
            z: accelZ,
            magnitude: accelMag,
            speed: currentSpeed,
            timestamp: elapsed
        });
    }
    
    updateDisplay();
}

function startRecording() {
    isRecording = true;
    startTime = null;
    allOrientationData = [];
    allAccelerationData = [];
    document.getElementById('status').textContent = 'Recording...';
    document.getElementById('status').style.color = 'red';
}

function stopRecording() {
    isRecording = false;
    document.getElementById('status').textContent = 'Stopped';
    document.getElementById('status').style.color = 'black';
}

function updateDisplay() {
    document.getElementById('accelX').textContent = accelX.toFixed(2);
    document.getElementById('accelY').textContent = accelY.toFixed(2);
    document.getElementById('accelZ').textContent = accelZ.toFixed(2);
    document.getElementById('speed').textContent = currentSpeed.toFixed(2);
}

function downloadData() {
    if (allAccelerationData.length === 0) {
        alert('No data to download');
        return;
    }
    
    const csv = 'Time (s),Accel X (m/s²),Accel Y (m/s²),Accel Z (m/s²),Accel Magnitude (m/s²),Speed (ft/s)\n' +
        allAccelerationData.map(d => 
            `${d.timestamp.toFixed(3)},${d.x.toFixed(4)},${d.y.toFixed(4)},${d.z.toFixed(4)},${d.magnitude.toFixed(4)},${d.speed.toFixed(4)}`
        ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'acceleration_data.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Request permission on page load
window.addEventListener('load', requestPermission);
