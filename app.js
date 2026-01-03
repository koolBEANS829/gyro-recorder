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

// Three.js 3D Visualizer Variables
let scene, camera, renderer, phoneMesh;
let animationId = null;
const visualizerContainer = document.getElementById('visualizer-container');

// Navigation
backBtn.addEventListener('click', () => {
    if (isRecording) {
        stopBtn.click();
    }

    // Stop 3D animation
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
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

    init3D();
    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);
}

function init3D() {
    if (typeof THREE === 'undefined') {
        console.error('Three.js not loaded');
        visualizerContainer.innerHTML = '<p style="padding:1rem">Error: 3D Library not loaded</p>';
        return;
    }

    // Ensure container has dimensions
    if (visualizerContainer.clientWidth === 0 || visualizerContainer.clientHeight === 0) {
        requestAnimationFrame(init3D);
        return;
    }

    // Cleanup previous if exists
    if (renderer) {
        visualizerContainer.innerHTML = ''; // Clear old canvas
    }
    if (animationId) cancelAnimationFrame(animationId);

    // Scene setup
    scene = new THREE.Scene();
    const aspect = visualizerContainer.clientWidth / visualizerContainer.clientHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(visualizerContainer.clientWidth, visualizerContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    visualizerContainer.appendChild(renderer.domElement);

    // Handle Window Resize
    window.addEventListener('resize', onWindowResize, false);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x00f2ff, 1.5);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);
    const pointLight2 = new THREE.PointLight(0x7000ff, 1);
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);

    // Cube Mesh
    const geometry = new THREE.BoxGeometry(2.5, 2.5, 2.5);
    const material = new THREE.MeshPhongMaterial({
        color: 0x00f2ff,
        emissive: 0x003344,
        emissiveIntensity: 0.5,
        shininess: 100,
        transparent: true,
        opacity: 0.9
    });
    phoneMesh = new THREE.Mesh(geometry, material);

    // Add edges for a cleaner cube look
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    phoneMesh.add(wireframe);

    scene.add(phoneMesh);

    animate();
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = visualizerContainer.clientWidth / visualizerContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(visualizerContainer.clientWidth, visualizerContainer.clientHeight);
}

function animate() {
    animationId = requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function handleOrientation(event) {
    const { alpha, beta, gamma } = event;

    // Update live display
    valX.textContent = beta ? beta.toFixed(2) : '0.00';
    valY.textContent = gamma ? gamma.toFixed(2) : '0.00';
    valZ.textContent = alpha ? alpha.toFixed(2) : '0.00';

    // Update 3D Phone Rotation
    if (phoneMesh) {
        // Convert degrees to radians
        // When phone is upright, beta is ~90 degrees. We subtract 90 so 
        // the 3D model is also upright when you hold the phone normally.
        const adjustedBeta = (beta || 0) - 90;

        phoneMesh.rotation.x = THREE.MathUtils.degToRad(adjustedBeta);
        phoneMesh.rotation.y = THREE.MathUtils.degToRad(gamma || 0);
        phoneMesh.rotation.z = THREE.MathUtils.degToRad(-(alpha || 0)); // Negate for natural feel
    }

    // Update bars
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
