### CONTEXT ###
I am converting an existing open-source Next.js web application into a native desktop application using Electron.
- **Source Repository:** `https://github.com/isfix/POS-Webapp`
- **Frontend:** The project is a **Next.js** application.
- **Backend Services:** The app uses Firebase for authentication and Supabase for its database. These are remote services and will NOT be bundled with the app. The Electron app will communicate with them over the internet via their respective SDKs.

### GOAL ###
Generate a complete, step-by-step guide with all necessary code and configuration to turn the `POS-Webapp` into a production-ready Electron application. The final output should include a development workflow with hot-reloading and a production build process.

### ARCHITECTURAL REQUIREMENTS ###
1.  The Electron main process (`main.js`) must be secure. Use `nodeIntegration: false` and `contextIsolation: true`.
2.  A `preload.js` script must be used as the bridge between the renderer process (Next.js app) and the main process.
3.  The existing Firebase and Supabase integration code in the Next.js app should be reused as-is. The connection is client-to-backend over HTTPS.
4.  Environment variables for Firebase and Supabase keys must be managed correctly for both development and production.
5.  The final application must be packageable for distribution using `electron-builder`.

### DETAILED STEP-BY-STEP BLUEPRINT ###
Follow this blueprint precisely. For each step, provide the necessary explanation and generate the required code or configuration.

**Step 1: Add Electron to Your Project**
- Navigate to your existing project directory.
- Add `electron` as a `devDependency`.
- The exact shell commands to do this are:
  ```bash
  cd your-pos-webapp-directory
  npm install --save-dev electron
  ```

**Step 2: Create Secure Main and Preload Scripts**
- In the root of your project, create a `main.js` file. This will be the entry point for Electron.
- Generate the code for `main.js`. This file should:
    - Create a browser window.
    - Reference a `preload.js` script.
    - Include comments indicating where to put the development URL and where to put the production file path.
    - Implement basic window lifecycle management.
- In the root of your project, create a `preload.js` file. For now, it can be minimal, just showing the basic structure with `contextBridge`.

**Step 3: Configure Environment Variables**
- Your Next.js app already uses a `.env.local` file for environment variables. Electron will be able to access these during development.
- Ensure your variable names use the `NEXT_PUBLIC_` prefix to be exposed to the browser.
- Generate the contents of `.env.local` with placeholder values:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL_HERE
  NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE
  NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY_HERE
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN_HERE
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID_HERE
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET_HERE
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_SENDER_ID_HERE
  NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID_HERE
  ```

**Step 4: Configure the Development Workflow**
- To enable a live-reloading development experience, we will run the Next.js dev server and Electron concurrently.
- Add the necessary dev dependencies: `concurrently` and `wait-on`.
  ```bash
  npm install --save-dev concurrently wait-on
  ```
- Add the following scripts to your `package.json`. Note that your existing `dev` script (`next dev`) will be used.
  ```json
  "scripts": {
    "dev": "next dev",
    "electron-start": "electron .",
    "start": "concurrently -k \"npm run dev\" \"wait-on http://localhost:3000 && npm run electron-start\""
  },
  ```
- In `main.js`, make sure you use the development URL: `win.loadURL('http://localhost:3000');`.

**Step 5: Configure the Production Build with Electron Builder**

**5a. Configure Next.js for Static Export**
- For Electron to package your app, it needs a static set of HTML, CSS, and JS files. You must configure Next.js to produce a static export.
- Open your `next.config.ts` (or `.js`) file and add the `output: 'export'` option.
  ```typescript
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    output: 'export',
    // If you have issues with images, you may also need this:
    // images: { unoptimized: true }
  };

  export default nextConfig;
  ```

**5b. Configure Build Scripts and Electron Builder**
- This is for packaging the final application.
- Add `electron-builder` as a `devDependency`.
  ```bash
  npm install --save-dev electron-builder
  ```
- Generate the final `scripts` section for `package.json` that includes build commands. It should contain:
    - `build:next`: To run `next build && next export`. This creates the static files in an `out` directory.
    - `build:electron`: The main build script that first builds the Next.js app, then runs `electron-builder`.
  ```json
  "scripts": {
    "dev": "next dev",
    "electron-start": "electron .",
    "start": "concurrently -k \"npm run dev\" \"wait-on http://localhost:3000 && npm run electron-start\"",
    "build:next": "next build && next export",
    "build:electron": "npm run build:next && electron-builder"
  },
  ```
- Generate the complete `build` configuration block for `electron-builder` and add it to `package.json`. This block must:
    - Specify an `appId`.
    - Correctly list the files and folders to be included. Note that we now point to the `out` directory.
  ```json
  "build": {
    "appId": "com.yourcompany.pos-webapp",
    "productName": "POS WebApp",
    "files": [
      "out/**/*",
      "main.js",
      "preload.js"
    ],
    "directories": {
      "output": "dist"
    }
  },
  ```
- For the production build, make sure the line in `main.js` points to the `index.html` file inside the `out` folder.
  ```javascript
  // Example for production load
  const path = require('path');
  win.loadFile(path.join(__dirname, 'out/index.html'));
