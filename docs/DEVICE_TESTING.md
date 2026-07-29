# Meta Quest 3 and WebXR Device Testing

## Desktop browser

```bash
npm run dev
```

Open `http://localhost:5174/SnowVR/`.

- Normal development uses the desktop camera and controls.
- Add `?emulate=1` to opt into the IWER Quest 3 emulator when native immersive VR is unavailable.
- Add `?dev=1` to show the tuning UI and render-loop diagnostics.
- Both flags can be combined: `?emulate=1&dev=1`.

The emulator is disabled by default and is never force-installed over a browser that already provides immersive WebXR.

## Physical Quest over USB

1. Enable Developer Mode for the headset in the Meta Horizon mobile app.
2. Connect the Quest by USB, put on the headset, and accept the USB debugging prompt. Select the persistent authorization option if appropriate for the development computer.
3. Confirm that `adb devices -l` reports the headset as `device`, not `unauthorized`.
4. Start the development server and reverse the port:

   ```bash
   npm run dev
   adb reverse tcp:5174 tcp:5174
   ```

5. In Meta Quest Browser, open `http://localhost:5174/SnowVR/` and select **Enter VR**.

Use `http://localhost:5174/SnowVR/?dev=1` for the head-following XR diagnostics panel. It reports measurements from the actual XR render loop, including average and p95 frame time, session refresh rate, foveation, and projection-layer dimensions.

## Controller gate

Verify these interactions with both controllers awake:

- Left thumbstick steers and drives forward/backward.
- Left trigger, left grip, or Space boosts.
- Right trigger casts and releases cleanly.
- A or B cycles spells once per press.
- Casting produces throttled right-controller haptics.
- Disconnecting or ending the XR session clears casting state.

## Endless-run gate

Run at least two terrain loops at normal speed and two while boosted. Each loop should:

- fade fully into the snow veil before the coordinate rebase;
- preserve rider velocity and heading;
- avoid a camera snap in desktop and XR;
- return smoothly without exposing the terrain edge.

## Performance soak

For a release candidate, run a ten-minute native Quest session with representative steering, boost, and spell casting. At 72 Hz, watch the in-headset `?dev=1` panel for sustained frame pacing and inspect browser/ADB logs for WebGL, WebXR, or out-of-memory errors.

## Same-network testing

WebXR requires a secure context except for localhost. For testing without ADB reverse, serve the app over HTTPS with a trusted certificate and open the computer's HTTPS address from the headset. A raw LAN HTTP address is not sufficient for immersive WebXR.
