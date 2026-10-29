# Zuba — Solar Energy & Storage Monitoring System

Zuba is an open-source, web-based photovoltaic and energy storage monitoring platform designed with a calm, restrained interface. It provides solar owners and commercial facility operators with clear visibility into electrical generation, battery storage, and scheduled maintenance.

## Project Folders

- `src/` contains the React application, pages, components, and shared client code.
- `server/` contains the Express server and SQLite data access code.
- `data/` contains the local SQLite database, created automatically when the server starts.
- `.vscode/` contains editor recommendations for working with the project; it is not where the database is stored.

---

## Running Locally on Localhost (Zip Download)

The app uses a shared SQLite database on the server. Operators who connect to the same running server share their accounts and operational data; each operator's systems and settings are kept separate. The database is created automatically at `data/zuba.sqlite`.

### 1. Prerequisites
- **Node.js** (version 20 or newer)
- **npm** (included with Node.js)

### 2. Configure Admin Sign-In

Admin access is verified by the local server. Copy `.env.example` to `.env`, then set a unique, strong `ZUBA_ADMIN_PASSWORD`. The default admin email is `garrymapulanga@gmail.com`; `ZUBA_ADMIN_NAME` and `ZUBA_ADMIN_EMAIL` can be customized in `.env`. Do not commit `.env` or share the password.

The app starts signed out whenever the page is opened. Admin sign-in uses the configured admin email and password; no admin/demo button is shown. Operator accounts are created with an email and password and stored in SQLite. Passwords are hashed on the server.

### 3. Quick Start
After downloading and extracting the `.zip` archive:

Open a terminal in the extracted project folder. In **Windows PowerShell**, use `npm.cmd` so the command does not depend on PowerShell script execution policy:

```powershell
npm.cmd install
npm.cmd run dev
```

In **Command Prompt, macOS, or Linux**, use:

```bash
npm install
npm run dev
```

### 4. Open in Browser
Visit **`http://localhost:3000`** in your browser.

- **Sign-In**: Sign in with an existing operator account or create one. Admin credentials are configured separately in the server `.env` file.
- **Shared SQL storage**: Solar systems, meter logs, maintenance tasks, accounts, and settings are stored in the server's SQLite database. Existing browser-only accounts and data are not imported automatically; operators should create accounts again and re-enter any data they need.
- **View the database in VS Code**: Install the recommended **SQLite** extension when VS Code prompts you. Open `data/zuba.sqlite` in the Explorer, then use the extension's **Open Database** command to browse tables and run SQL queries.
- **Backups**: Stop the server before copying `data/zuba.sqlite`; also copy any `zuba.sqlite-wal` and `zuba.sqlite-shm` files if present. Keep database backups private because they contain operational data and account details.
- **Hosting**: All users must connect to the same running server and its persistent database file. For deployment, use a persistent server disk and HTTPS; do not run multiple server instances against a local SQLite file.
- **Zero Config Required**: Weather simulation across the Provinces of Zambia runs locally without requiring an OpenWeather API key. If you have an OpenWeather key, you can optionally connect it in Weather Telemetry.
- **Solar AI Intelligence**: System-grounded predictions for battery 100% full charge time, morning vs daytime generation, and night energy storage balance. Runs locally with zero setup and connects to Gemini when an API key is available.

---

## Production Build & Preview

To verify a production build on localhost:

```bash
# Build the project
npm run build

# Preview the production build locally
npm run preview
```

---

## System Architecture & Features

1. **Light & Dark Mode**:
   - Native light and dark mode toggling from the Header, Sidebar, or Settings.
   - Automatically respects system appearance preference.

2. **Solar Systems by Solar Panel Count**:
   - Clean space to add and configure solar installations.
   - Categorized by the physical count of solar modules:
     - **Residential Space**: 1 to 8 solars
     - **Commercial Space**: 9 to 24 solars
     - **Industrial Space**: 25+ solars

3. **Weather Telemetry & Nine Provinces**:
   - **Zambia Overall** as the national baseline station.
   - All 9 provinces of Zambia: Central, Copperbelt, Eastern, Luapula, Lusaka, Northern, North-Western, Southern, and Western.
   - Weather Duration guide in the "About" section explaining how duration directly drives stored kilowatt-hours ($E = P \times t$).

4. **Scheduled Maintenance Checklist**:
   - Clean, cyclical maintenance tracking (30, 60, 90 day intervals).
   - Reset tasks for the next cycle upon completion.

5. **Dedicated Maintenance Alerts**:
   - Alerts trigger exclusively when maintenance tasks are pending or overdue.
   - Directly resolve and cycle tasks from the alerts tab.

6. **Live Telemetry & Street Meter Reconciliation**:
   - Continuous power flow between panels, battery bank, facility load, and utility grid.
   - Daily inverter/counter meter audit trail with stochastic gradient descent calibration.

---

## License

MIT License. Open source for clean energy monitoring.
