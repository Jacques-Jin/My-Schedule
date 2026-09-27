# My Schedule - Quick Start Guide

## One-Click Launch

### Method 1: Batch File (Recommended)
Double-click `launch.bat` to automatically start all services and open the browser.

### Method 2: PowerShell
Right-click `launch.ps1` → Select "Run with PowerShell"

## Manual Start

If the launcher doesn't work, you can start manually:

### Step 1: Start API Server
```bash
deno run --allow-net --allow-env functions/local-dev-index.ts
```

### Step 2: Start Frontend Server (new terminal)
```bash
node node_modules/vite/bin/vite.js --host 127.0.0.1
```

### Step 3: Open Browser
Visit http://127.0.0.1:5173/

## Stop Servers

### Method 1: Stop Script
Double-click `stop.bat`

### Method 2: Manual Stop
- Press `Ctrl+C` in the server terminal windows
- Or close the terminal windows

## Access URLs

- **Frontend App**: http://127.0.0.1:5173/
- **API Server**: http://localhost:8000/

## Requirements

1. **First time setup** - Install dependencies:
   ```bash
   npm install
   ```

2. **Required software**:
   - Node.js (>= 22.12.0)
   - Deno

3. **Data Notes**:
   - Local development uses in-memory database
   - Data resets to seed data on server restart
   - Seed data includes complete 2026 Fall semester schedule

4. **Port Conflicts**:
   - If ports 8000 or 5173 are in use, stop the programs using them first
   - Or use `stop.bat` to clean up old processes

## Development Mode

After startup, hot reload is supported:
- Frontend code changes auto-refresh the browser
- Backend code changes require Deno server restart

## Deployed Version

Online version: https://my-schedule-akzzfsdx3vh.qoder.zone/
(Requires Sites account access)

## File Structure

```
my-schedule/
├── launch.bat          # Windows batch launcher
├── launch.ps1          # PowerShell launcher
├── stop.bat            # Stop servers script
├── functions/
│   ├── local-dev-index.ts    # Local dev server with fake Supabase
│   ├── handler.mjs           # API request handler
│   └── adapter.mjs           # Supabase adapter (for production)
└── src/                      # React frontend source
```
