# The Cool Butler

A 3D browser mini-game inspired by Taiwanese temple procession and folk culture. Play as temple steward A-Wen, calm the crowds, and keep the procession peaceful.

## Features
- 3D temple plaza made with Three.js, lanterns, market stalls, stone lions, incense smoke and crowd NPCs
- Animated steward and crowd scenes, skill effects, draggable orbit camera and wheel zoom
- Three difficulty levels: Peaceful, Procession and Lively
- Keyboard and mobile controls: WASD/arrow keys or virtual joystick; Q/W/E/R use the four talisman skills
- Procedural festival-style rhythm, skill sounds and police siren with Web Audio API; sound can be toggled
- Local top-five leaderboard and personal best stored in browser localStorage
- Results screen with a copy-ready Threads share post

## Run locally
Serve the repository over HTTP (rather than opening the file directly):

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`. The page loads Three.js from jsDelivr, so an internet connection is needed for the 3D library.

## Controls
- WASD / arrow keys: move the steward
- Q: 遞結緣水 — cool down the nearest disturbance
- W: 貼平安符 — reduce the most heated disturbance
- E: 吹號鎮喧 — calm nearby disturbances
- R: 劃界結界 — create a temporary calming barrier
- Drag the scene: rotate the camera
- Mouse wheel: zoom
- On touch screens: virtual joystick to move, skill buttons to cast

## Objective
Keep police alert and stigma below 100 until the 35-second procession round ends. Choose a difficulty from the main menu. Results are saved locally in the current browser; they are not shared across devices.
