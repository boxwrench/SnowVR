# Meta Quest 3 & WebXR Device Testing Guide

This guide outlines how to test **SnowVR** on desktop emulators and physical Meta Quest 3 VR headsets.

---

## 💻 1. Desktop Quest 3 Emulator Testing (IWER)

SnowVR includes built-in support for the **WebXR IWER emulator** profile for Meta Quest 3.

```bash
npm run dev
```

1. Open `http://localhost:5174` in Chrome.
2. In development mode (`import.meta.env.DEV`), the Quest 3 emulator profile installs automatically.
3. Click **🥽 Enter VR**.
4. The on-screen Quest 3 controller overlay allows testing 6DOF controller rays, select inputs, handedness, and spatial tracking without connecting a physical headset.

---

## 🥽 2. Physical Meta Quest 3 Testing (USB / ADB Reverse)

To test directly inside the Meta Quest Browser over USB:

### Step 1: Connect Quest 3 via USB
Enable Developer Mode on your Meta Quest 3 and connect it to your PC with a USB-C cable.

### Step 2: Set Up ADB Reverse Port Forwarding
```bash
adb reverse tcp:5174 tcp:5174
```

### Step 3: Open Meta Quest Browser
Inside the Quest 3 headset, open Meta Quest Browser and navigate to:
`http://localhost:5174`

Click **Enter VR** to enter full immersive 6DOF WebXR!

---

## 🌐 3. Local Network HTTPS Testing

If ADB is unavailable, run Vite with HTTPS enabled for same-network Quest testing:

```bash
npx vite --host --https
```
Then navigate to `https://<YOUR_PC_IP>:5174` inside your Meta Quest Browser.
