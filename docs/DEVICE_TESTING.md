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

Use the URL without query parameters for normal play testing. Add `?dev=1` only
while profiling: it enables a head-following XR diagnostics panel that can
intentionally occupy part of the field of view. The panel reports measurements
from the actual XR render loop, including average and p95 frame time, session
refresh rate, foveation, and projection-layer dimensions.

The reverse tunnel belongs to the active ADB server and may disappear if that
server restarts. If the page stops loading, verify both ends before changing the
application:

```bash
curl http://localhost:5174/SnowVR/
adb reverse --list
adb reverse tcp:5174 tcp:5174
```

`adb reverse --list` should include `tcp:5174 tcp:5174`.

## Controller gate

Verify these interactions with both controllers awake:

- Left thumbstick steers and drives forward/backward.
- Left trigger, left grip, or Space boosts.
- Right trigger casts and releases cleanly.
- A or B advances to the next spell.
- The right-controller reticle follows uneven terrain when aimed downward and
  falls back to a stable forward ground target when the controller is level.
- Casting produces throttled right-controller haptics.
- Disconnecting or ending the XR session clears casting state.

## Native Quest verification

Last physically verified on Meta Quest 3 on July 29, 2026:

- immersive stereo rendering enters without a black frame;
- board movement produces persistent snow carving and raised berms;
- the right controller aims the ground reticle and casts elemental effects;
- A and B change the active spell;
- the normal play URL does not show the FPS diagnostics panel.

These behaviors specifically exercise the offscreen snow-deformation and
particle-compute passes while WebXR is presenting, so they should be repeated
after Three.js, React Three Fiber, or WebXR integration upgrades.

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
