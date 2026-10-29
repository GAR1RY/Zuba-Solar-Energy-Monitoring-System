# Zuba Solar Energy Monitoring System

Zuba is a local web application for monitoring solar installations, energy readings, weather, meter logs, and maintenance tasks. The React interface communicates with a Python API, which stores account and application data in a SQLite database on this PC.

## Project structure

| Area | Location | Purpose |
|---|---|---|
| Frontend | `src/` | React and TypeScript pages, components, and browser-side application logic |
| Web/API launcher | `server.ts` | Starts the Python API and serves the frontend; proxies `/api` requests |
| Backend | `backend/app.py` | Flask API, sign-in, and database operations |
| Database schema | `backend/schema.sql` | Tables and relationships created for the SQLite database |
| Backend tests | `backend/test_app.py` | Automated tests for the API and data persistence |
| Windows startup | `scripts/` | Installs or removes the current user's automatic-start shortcut |

## Frontend

- **React and TypeScript** provide the user interface.
- **Vite** runs the development server and builds the production frontend.
- The frontend sends application requests to the Python API; it does not use browser storage as the main database.
- The solar assistant uses local rules and the selected system's readings. It does not require a Gemini API key.

## Backend and database

- **Python 3.10+ and Flask** provide the local API.
- **SQLite** stores accounts, settings, solar systems, meter logs, and maintenance tasks in `backend/instance/zuba.db`.
- Python includes SQLite support, so no separate SQL server or database application needs to be installed. The app creates the database and tables automatically.
- By default, the services listen on this PC only. The app is not configured for access from other devices or for public hosting.
- Earlier data kept only in the browser is not imported automatically.

## Requirements

- Windows
- Python 3.10 or later
- Node.js 20 or later, including npm

## Install and run

Open PowerShell in the project folder.

1. Install the Python API dependencies:

   ```powershell
   python -m pip install -r backend\requirements.txt
   ```

2. Create a local environment file if you do not already have one:

   ```powershell
   Copy-Item .env.example .env
   ```

   Set a strong `ZUBA_ADMIN_PASSWORD` in `.env`. The admin name and email can be set with `ZUBA_ADMIN_NAME` and `ZUBA_ADMIN_EMAIL`. Do not share or commit `.env`.

3. Install frontend and launcher dependencies:

   ```powershell
   npm.cmd install
   ```

4. Start the development app:

   ```powershell
   npm.cmd run dev
   ```

5. Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

The launcher starts the Python API along with the frontend. Sign in with the configured admin account or create an operator account.

## Start automatically when signing in

After installing the requirements above, run this once from the project folder:

```powershell
.\scripts\install-startup.ps1
```

The installer adds a shortcut to the current Windows user's Startup folder. At sign-in, it starts the production app in the background and opens it in your browser when ready. The app only runs while the PC is on and you are signed in. Startup logs are saved under `%LOCALAPPDATA%\ZubaSolar\logs`.

To remove automatic startup without removing app files or data:

```powershell
.\scripts\install-startup.ps1 -Remove
```

## Build and run the production frontend

```powershell
npm.cmd run build
$env:NODE_ENV = 'production'
npm.cmd start
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The startup installer also builds the frontend if the production build is missing.

## Data backup

Stop the app before copying `backend/instance/zuba.db` to a safe location. Keep the `.session_secret` file in the same folder when restoring the database; it preserves existing sign-in sessions. The database and secret are local data and must not be committed to Git.

## Tests and checks

Run these commands from the project folder:

```powershell
npm.cmd run lint
npm.cmd run build
python -m unittest backend.test_app
```

## Weather

Weather data is retrieved through the application's weather service. An optional OpenWeather API key can be configured in Weather Telemetry; no weather key is required for the built-in weather source.
