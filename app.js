/**
 * GyroStream - Precision Motion Capture
 * A clean, modern gyroscope and accelerometer recording application
 */

// ============================================
// State Management
// ============================================

const state = {
    isRecording: false,
    startTime: null,
    recordingStartTime: null,
    timerInterval: null,
    orientationData: [],
    accelerationData: [],
    currentAccel: { x: 0, y: 0, z: 0 },
    currentSpeed: 0
};

// ============================================
// DOM Elements
// ============================================

const elements = {
    // Screens
    permissionScreen: document.getElementById('permission-screen'),
    recordingScreen: document.getElementById('recording-screen'),

    // Buttons
    btnEnable: document.getElementById('btn-enable'),
    btnBack: document.getElementById('btn-back'),
    btnRecord: document.getElementById('btn-record'),
    btnStop: document.getElementById('btn-stop'),
    btnDownload: document.getElementById('btn-download'),

    // Display elements
    speedVal: document.getElementById('speed-val'),
    valX: document.getElementById('val-x'),
    valY: document.getElementById('val-y'),
    valZ: document.getElementById('val-z'),
    ringX: document.getElementById('ring-x'),
    ringY: document.getElementById('ring-y'),
    ringZ: document.getElementById('ring-z'),

    // Recording UI
    statusDot: document.getElementById('status-dot'),
    statusText: document.getElementById('status-text'),
    timer: document.getElementById('timer'),
    sampleCount: document.getElementById('sample-count'),

    // Visualizer
    canvas: document.getElementById('visualizer-canvas')
};

// ============================================
// Visualizer (3D Cube + Live Graphs)
// ============================================

class CubeGraphVisualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.animationId = null;

        // Orientation values (smoothed)
        this.alpha = 0;
        this.beta = 0;
        this.gamma = 0;
        this.targetAlpha = 0;
        this.targetBeta = 0;
        this.targetGamma = 0;

        // Data history for graphs
        this.maxPoints = 80;
        this.historyX = [];
        this.historyY = [];
        this.historyZ = [];

        // Colors
        this.colors = {
            x: '#ff6b6b',  // Red - Pitch
            y: '#4ecdc4',  // Cyan - Roll
            z: '#a78bfa'   // Purple - Yaw
        };

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
    }

    update(alpha, beta, gamma, accelMagnitude = 0) {
        this.targetAlpha = alpha;
        this.targetBeta = beta;
        this.targetGamma = gamma;

        // Add to history
        this.historyX.push(beta);
        this.historyY.push(gamma);
        this.historyZ.push(alpha);

        // Trim history
        if (this.historyX.length > this.maxPoints) {
            this.historyX.shift();
            this.historyY.shift();
            this.historyZ.shift();
        }
    }

    draw() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Smooth interpolation (0.4 = responsive but still smooth, 1.0 = instant)
        this.alpha += (this.targetAlpha - this.alpha) * 0.4;
        this.beta += (this.targetBeta - this.beta) * 0.4;
        this.gamma += (this.targetGamma - this.gamma) * 0.4;

        // Clear canvas
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, w, h);

        // Layout: 60% cube, 40% graphs
        const cubeHeight = h * 0.6;
        const graphHeight = h * 0.4;

        // Draw 3D Cube in top section
        this.drawCube(ctx, w / 2, cubeHeight / 2, Math.min(w, cubeHeight) * 0.3);

        // Draw separator line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(10, cubeHeight);
        ctx.lineTo(w - 10, cubeHeight);
        ctx.stroke();

        // Draw graphs in bottom section
        this.drawGraphs(ctx, 0, cubeHeight, w, graphHeight);

        this.animationId = requestAnimationFrame(() => this.draw());
    }

    drawCube(ctx, cx, cy, size) {
        // Convert degrees to radians
        const pitch = this.beta * Math.PI / 180;
        const roll = this.gamma * Math.PI / 180;
        const yaw = this.alpha * Math.PI / 180;

        // Define cube vertices (centered at origin)
        const s = size / 2;
        const vertices = [
            [-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s],  // Back face
            [-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s]       // Front face
        ];

        // Define edges (pairs of vertex indices)
        const edges = [
            [0, 1], [1, 2], [2, 3], [3, 0],  // Back face
            [4, 5], [5, 6], [6, 7], [7, 4],  // Front face
            [0, 4], [1, 5], [2, 6], [3, 7]   // Connecting edges
        ];

        // Rotation matrices
        const rotateX = (v, angle) => [
            v[0],
            v[1] * Math.cos(angle) - v[2] * Math.sin(angle),
            v[1] * Math.sin(angle) + v[2] * Math.cos(angle)
        ];
        const rotateY = (v, angle) => [
            v[0] * Math.cos(angle) + v[2] * Math.sin(angle),
            v[1],
            -v[0] * Math.sin(angle) + v[2] * Math.cos(angle)
        ];
        const rotateZ = (v, angle) => [
            v[0] * Math.cos(angle) - v[1] * Math.sin(angle),
            v[0] * Math.sin(angle) + v[1] * Math.cos(angle),
            v[2]
        ];

        // Apply rotations to all vertices
        const rotatedVertices = vertices.map(v => {
            let rv = rotateX(v, pitch);
            rv = rotateY(rv, roll);
            rv = rotateZ(rv, yaw);
            return rv;
        });

        // Project 3D to 2D with perspective
        const focalLength = 300;
        const project = (v) => {
            const scale = focalLength / (focalLength + v[2]);
            return [
                cx + v[0] * scale,
                cy + v[1] * scale,
                v[2] // Keep z for depth sorting
            ];
        };

        const projectedVertices = rotatedVertices.map(project);

        // Draw glow effect behind cube
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 1.5);
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0.15)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, size * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Sort edges by average depth for proper rendering
        const edgesWithDepth = edges.map(([i, j]) => ({
            edge: [i, j],
            depth: (rotatedVertices[i][2] + rotatedVertices[j][2]) / 2
        }));
        edgesWithDepth.sort((a, b) => a.depth - b.depth);

        // Draw edges
        edgesWithDepth.forEach(({ edge: [i, j], depth }) => {
            const [x1, y1] = projectedVertices[i];
            const [x2, y2] = projectedVertices[j];

            // Color based on depth
            const normalizedDepth = (depth + size) / (size * 2);
            const opacity = 0.3 + normalizedDepth * 0.7;

            ctx.beginPath();
            ctx.strokeStyle = `rgba(0, 212, 255, ${opacity})`;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        });

        // Draw vertices as glowing points
        projectedVertices.forEach(([x, y, z]) => {
            const normalizedDepth = (z + size) / (size * 2);
            const pointSize = 3 + normalizedDepth * 3;

            // Glow
            const glow = ctx.createRadialGradient(x, y, 0, x, y, pointSize * 3);
            glow.addColorStop(0, 'rgba(0, 212, 255, 0.8)');
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(x, y, pointSize * 3, 0, Math.PI * 2);
            ctx.fill();

            // Point
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y, pointSize, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw axis labels
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';

        ctx.fillStyle = this.colors.x;
        ctx.fillText(`X: ${this.beta.toFixed(1)}°`, cx - size - 30, cy - size - 10);

        ctx.fillStyle = this.colors.y;
        ctx.fillText(`Y: ${this.gamma.toFixed(1)}°`, cx - size - 30, cy - size + 8);

        ctx.fillStyle = this.colors.z;
        ctx.fillText(`Z: ${this.alpha.toFixed(1)}°`, cx - size - 30, cy - size + 26);
    }

    drawGraphs(ctx, x, y, w, h) {
        const padding = 15;
        const graphW = w - padding * 2;
        const graphH = (h - padding * 2) / 3;
        const startY = y + padding;

        // Draw each axis graph
        this.drawSingleGraph(ctx, padding, startY, graphW, graphH - 5, this.historyX, this.colors.x, 'Pitch', 180);
        this.drawSingleGraph(ctx, padding, startY + graphH, graphW, graphH - 5, this.historyY, this.colors.y, 'Roll', 90);
        this.drawSingleGraph(ctx, padding, startY + graphH * 2, graphW, graphH - 5, this.historyZ, this.colors.z, 'Yaw', 360);
    }

    drawSingleGraph(ctx, x, y, w, h, data, color, label, maxValue) {
        const centerY = y + h / 2;

        // Background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fillRect(x, y, w, h);

        // Center line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x, centerY);
        ctx.lineTo(x + w, centerY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.fillText(label, x + 5, y + 12);

        // Draw graph line
        if (data.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            for (let i = 0; i < data.length; i++) {
                const px = x + (i / this.maxPoints) * w;
                const normalized = data[i] / maxValue;
                const py = centerY - normalized * (h / 2 - 5);

                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.stroke();

            // Current value dot
            if (data.length > 0) {
                const lastX = x + ((data.length - 1) / this.maxPoints) * w;
                const lastNorm = data[data.length - 1] / maxValue;
                const lastY = centerY - lastNorm * (h / 2 - 5);

                // Glow
                const glow = ctx.createRadialGradient(lastX, lastY, 0, lastX, lastY, 8);
                glow.addColorStop(0, color);
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(lastX, lastY, 8, 0, Math.PI * 2);
                ctx.fill();

                // Dot
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    start() {
        if (!this.animationId) {
            this.draw();
        }
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    clear() {
        this.historyX = [];
        this.historyY = [];
        this.historyZ = [];
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
}

let visualizer = null;

// ============================================
// Sensor Handling
// ============================================

async function requestSensorPermission() {
    // iOS 13+ requires explicit permission request
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceMotionEvent.requestPermission();
            if (permission !== 'granted') {
                showError('Motion sensor access denied. Please enable it in Settings.');
                return false;
            }
        } catch (error) {
            console.error('Permission error:', error);
            showError('Failed to request permission: ' + error.message);
            return false;
        }
    }
    return true;
}

function initSensors() {
    window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    window.addEventListener('devicemotion', handleMotion, { passive: true });
}

function handleOrientation(event) {
    const alpha = event.alpha || 0;  // Z-axis (0-360)
    const beta = event.beta || 0;    // X-axis (-180 to 180)
    const gamma = event.gamma || 0;  // Y-axis (-90 to 90)

    // Update display values
    elements.valX.textContent = beta.toFixed(1) + '°';
    elements.valY.textContent = gamma.toFixed(1) + '°';
    elements.valZ.textContent = alpha.toFixed(1) + '°';

    // Update circular progress rings
    updateRing(elements.ringX, Math.abs(beta), 180);
    updateRing(elements.ringY, Math.abs(gamma), 90);
    updateRing(elements.ringZ, alpha, 360);

    // Update visualizer with orientation and current acceleration
    if (visualizer) {
        const accelMag = Math.max(0, Math.sqrt(
            state.currentAccel.x ** 2 +
            state.currentAccel.y ** 2 +
            state.currentAccel.z ** 2
        ) - 9.8);
        visualizer.update(alpha, beta, gamma, accelMag);
    }

    // Record data if recording
    if (state.isRecording) {
        const elapsed = (performance.now() - state.startTime) / 1000;
        state.orientationData.push({
            timestamp: elapsed,
            alpha,
            beta,
            gamma
        });
    }
}

function handleMotion(event) {
    const accel = event.accelerationIncludingGravity;
    if (!accel) return;

    state.currentAccel.x = accel.x || 0;
    state.currentAccel.y = accel.y || 0;
    state.currentAccel.z = accel.z || 0;

    // Calculate magnitude and approximate speed
    const magnitude = Math.sqrt(
        state.currentAccel.x ** 2 +
        state.currentAccel.y ** 2 +
        state.currentAccel.z ** 2
    );

    // Subtract gravity and convert to ft/s (rough approximation)
    state.currentSpeed = Math.max(0, magnitude - 9.8) * 3.28084;

    // Update display
    elements.speedVal.textContent = state.currentSpeed.toFixed(2);

    // Record data if recording
    if (state.isRecording) {
        if (state.startTime === null) {
            state.startTime = performance.now();
        }

        const elapsed = (performance.now() - state.startTime) / 1000;
        state.accelerationData.push({
            timestamp: elapsed,
            x: state.currentAccel.x,
            y: state.currentAccel.y,
            z: state.currentAccel.z,
            magnitude,
            speed: state.currentSpeed
        });

        elements.sampleCount.textContent = state.accelerationData.length;
    }
}

function updateRing(ring, value, maxValue) {
    const circumference = 2 * Math.PI * 45; // radius = 45 from SVG
    const percentage = Math.min(value / maxValue, 1);
    const offset = circumference * (1 - percentage);
    ring.style.strokeDashoffset = offset;
}

// ============================================
// Recording Controls
// ============================================

function startRecording() {
    state.isRecording = true;
    state.startTime = performance.now();
    state.recordingStartTime = Date.now();
    state.orientationData = [];
    state.accelerationData = [];

    // Update UI
    elements.statusDot.classList.add('recording');
    elements.statusText.textContent = 'Recording';
    elements.btnRecord.classList.add('hidden');
    elements.btnStop.classList.remove('hidden');
    elements.btnDownload.classList.add('hidden');
    elements.sampleCount.textContent = '0';

    // Start timer
    state.timerInterval = setInterval(updateTimer, 100);
}

function stopRecording() {
    state.isRecording = false;

    // Update UI
    elements.statusDot.classList.remove('recording');
    elements.statusText.textContent = 'Stopped';
    elements.btnStop.classList.add('hidden');
    elements.btnRecord.classList.remove('hidden');

    if (state.accelerationData.length > 0) {
        elements.btnDownload.classList.remove('hidden');
    }

    // Stop timer
    clearInterval(state.timerInterval);
}

function updateTimer() {
    if (!state.recordingStartTime) return;

    const elapsed = Date.now() - state.recordingStartTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);

    elements.timer.textContent =
        String(hours).padStart(2, '0') + ':' +
        String(minutes).padStart(2, '0') + ':' +
        String(seconds).padStart(2, '0');
}

// ============================================
// Data Export
// ============================================

function downloadCSV() {
    if (state.accelerationData.length === 0) {
        showError('No data to export');
        return;
    }

    // Build CSV content
    const headers = [
        'Time (s)',
        'Accel X (m/s²)',
        'Accel Y (m/s²)',
        'Accel Z (m/s²)',
        'Accel Magnitude (m/s²)',
        'Speed (ft/s)',
        'Orientation Alpha (°)',
        'Orientation Beta (°)',
        'Orientation Gamma (°)'
    ].join(',');

    const rows = state.accelerationData.map((accel, i) => {
        const orient = state.orientationData[i] || { alpha: 0, beta: 0, gamma: 0 };
        return [
            accel.timestamp.toFixed(3),
            accel.x.toFixed(4),
            accel.y.toFixed(4),
            accel.z.toFixed(4),
            accel.magnitude.toFixed(4),
            accel.speed.toFixed(4),
            orient.alpha.toFixed(2),
            orient.beta.toFixed(2),
            orient.gamma.toFixed(2)
        ].join(',');
    });

    const csv = [headers, ...rows].join('\n');

    // Create and trigger download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');

    link.href = url;
    link.download = `gyrostream_${timestamp}.csv`;
    link.click();

    URL.revokeObjectURL(url);
}

// ============================================
// Screen Navigation
// ============================================

function showRecordingScreen() {
    elements.permissionScreen.classList.add('hidden');
    elements.recordingScreen.classList.remove('hidden');

    // Initialize visualizer
    if (!visualizer) {
        visualizer = new CubeGraphVisualizer(elements.canvas);
    }
    visualizer.start();
}

function showPermissionScreen() {
    elements.recordingScreen.classList.add('hidden');
    elements.permissionScreen.classList.remove('hidden');

    if (visualizer) {
        visualizer.stop();
    }
}

// ============================================
// Utilities
// ============================================

function showError(message) {
    // Simple alert for now - could enhance with toast notifications
    alert(message);
}

// ============================================
// Event Listeners
// ============================================

elements.btnEnable.addEventListener('click', async () => {
    const granted = await requestSensorPermission();
    if (granted) {
        initSensors();
        showRecordingScreen();
    }
});

elements.btnBack.addEventListener('click', showPermissionScreen);
elements.btnRecord.addEventListener('click', startRecording);
elements.btnStop.addEventListener('click', stopRecording);
elements.btnDownload.addEventListener('click', downloadCSV);

// ============================================
// Initialization
// ============================================

// Check if we're on HTTPS (required for sensor access)
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    console.warn('GyroStream requires HTTPS for sensor access');
}
