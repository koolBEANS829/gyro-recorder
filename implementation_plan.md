# Implementation Plan - Gyroscope Data Recorder

## Objective
Create a mobile-friendly web application that accesses the device's gyroscope data, displays it in real-time, and allows the user to record and export the data as a CSV file.

## Technical Stack
- **HTML5**: For structure and semantic markers.
- **Vanilla CSS**: For a premium, dark-themed, glassmorphic UI.
- **Vanilla JavaScript**: To interface with `DeviceMotionEvent` and handle data recording/exporting.

## Features
1. **Permission Handling**: Securely request motion sensor access (required for iOS).
2. **Real-time Display**: Show Alpha, Beta, and Gamma (or rotation rate X, Y, Z) values with smooth animations.
3. **Recording Logic**: 
    - Start/Stop functionality.
    - Timestamped data logging.
    - Status indicator (Recording vs. Idle).
4. **Data Export**: Generate and download a CSV file containing the recorded data.
5. **Visualizations**: Simple line graphs or bars to show movement intensity.

## UI/UX Design
- **Theme**: Dark Mode with neon accents (Cyan/Purple).
- **Layout**: Center-aligned mobile-first design.
- **Feedback**: Haptic feedback (if supported) and visual state changes during recording.

## Steps
1. Create `index.html` with basic structure and permission buttons.
2. Create `style.css` with dark theme and glassmorphism.
3. Create `app.js` to handle:
    - `DeviceMotionEvent` listeners.
    - State management (recording).
    - CSV generation.
4. Add instructions for the user to host it via HTTPS (essential for sensor APIs).
