# Deploying SnowVR to GitHub Pages

This guide outlines how to publish **SnowVR** to GitHub Pages so users can try the live WebXR demo directly from their browser or Meta Quest 3 headset.

---

## ⚡ Option 1: Automated Deployment via GitHub Actions (Recommended)

SnowVR includes a pre-configured GitHub Actions workflow in [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

### Step-by-Step Setup:
1. Push your repository code to GitHub:
   ```bash
   git add .
   git commit -m "Configure GitHub Pages deployment"
   git push origin main
   ```
2. On GitHub, navigate to your repository **Settings** -> **Pages**.
3. Under **Build and deployment** -> **Source**, select **GitHub Actions**.
4. Every push to `main` will automatically build the WebXR demo and publish it to:
   `https://<YOUR_GITHUB_USERNAME>.github.io/SnowVR/`

---

## 🛠️ Option 2: Manual CLI Deployment (`npm run deploy`)

If you prefer deploying manually from your terminal:

```bash
# Build & publish dist/ to gh-pages branch
npm run deploy
```

1. Go to repository **Settings** -> **Pages**.
2. Under **Source**, select **Deploy from a branch** and pick `gh-pages` / `/(root)`.
3. Save, and your live demo URL will be active within minutes!

---

## 🥽 Testing the Live GitHub Pages Demo in WebXR

1. Open Meta Quest Browser inside your Meta Quest 3 headset.
2. Navigate to your GitHub Pages URL: `https://<YOUR_GITHUB_USERNAME>.github.io/SnowVR/`
3. Click **🥽 Enter VR** to launch the full 6DOF immersive snow playground!
