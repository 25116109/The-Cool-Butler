# The Cool Butler

A 3D browser mini-game inspired by Taiwanese temple procession and folk-culture crowd control.

## Features
- 3D festival scene built with Three.js
- Four control skills: Q/W/E/R
- Score system: Sheng-Wang, festival energy, police alert, stigma pressure
- Procedural sound effects via Web Audio API
- Takeaway share text for Threads
- Orbit camera with drag to rotate and wheel to zoom

## Run locally
1. Open the repository root in a local web server.
2. Example:

```bash
cd The-Cool-Butler
python -m http.server 8000
```

3. Open `http://localhost:8000` in your browser.

## Controls
- Q: 遞結緣水
- W: 貼平安符
- E: 吹號鎮喧
- R: 劃界結界
- Drag: rotate camera
- Mouse wheel: zoom in/out

## Game objective
Keep the temple procession calm and orderly. If police alert or stigma reaches 100, the event is interrupted.
