# Local Install

You can run RSVP Reader on your own computer. After the initial dependency install, the app runs locally in your browser and keeps sessions on that machine. This is useful if you want a personal copy, want to experiment with the code, or want to keep reading without depending on a hosted version.

## 1. Install Node.js

Download the LTS version from [nodejs.org](https://nodejs.org/) and run the installer for your operating system. npm is included.

If you are not technical, choose the normal installer for macOS, Windows, or Linux, keep the default options, and finish the install wizard. Then open Terminal, PowerShell, or your system shell.

Check the install:

```bash
node -v
npm -v
```

## 2. Download the App

Use the repository ZIP download or clone with Git:

```bash
git clone https://github.com/daclapo/RSVP-Reader.git
cd RSVP-Reader
```

## 3. Install and Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

After dependencies are installed, the app runs locally. Reading sessions are stored in your browser on that computer.

## More Help

The repository README explains the app workflow and project structure. Contributions are welcome: better reading modes, more public-domain sources, accessibility improvements, docs, and tests all help.
