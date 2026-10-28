# Zuba — Solar Energy & Storage Monitoring System

Zuba is an open-source, web-based photovoltaic and energy storage monitoring platform designed with a calm, restrained interface. It provides solar owners and commercial facility operators with clear visibility into electrical generation, battery storage, and scheduled maintenance.

---

## Cloning & Running in VS Code via Git

To clone this repository and run it locally in **VS Code**:

### 1. Prerequisites
- **Node.js** (version 18, 20, or newer) - [Download Node.js](https://nodejs.org/)
- **Git** - [Download Git](https://git-scm.com/)
- **Visual Studio Code** - [Download VS Code](https://code.visualstudio.com/)

### 2. Clone the Repository & Open in VS Code
Open your terminal (or VS Code integrated terminal) and run:

```bash
# Clone the repository
git clone <your-repository-url>
cd <repository-folder>

# Open the project in VS Code
code .
```

### 3. Recommended VS Code Extensions
When you open the project in VS Code, you will be prompted to install recommended extensions (Prettier, ESLint, Tailwind CSS IntelliSense). Click **Install All** for the best development experience.

### 4. Install Dependencies & Run Development Server
In the VS Code integrated terminal (`Ctrl+` ` or `Cmd+``):

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Set up environment variables
cp .env.example .env
# Fill in your GEMINI_API_KEY in .env if you want AI predictions enabled locally.

# 3. Start the local dev server
npm run dev
```

### 5. Open in Browser
Visit **`http://localhost:3000`** in your browser.

- **Instant Sign-In**: Use the "Operator Account" or "Admin Console" quick-buttons on the sign-in screen, or create your own custom account.
- **Local Persistence**: Data (solar systems, real meter logs, maintenance cycles, and theme preference) is automatically stored in your browser's `localStorage`.
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
