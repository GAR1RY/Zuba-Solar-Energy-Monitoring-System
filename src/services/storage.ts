import { Alert, MaintenanceTask, MeterLog, Reading, SolarSystem, User, UserSettings, WeatherSnapshot } from '../types';

const STORAGE_KEYS = {
  USERS: 'zuba_users_v2',
  CURRENT_USER: 'zuba_current_user_v2',
  SYSTEMS: 'zuba_systems_v3', // new key so old seeded systems are removed
  SELECTED_SYSTEM_ID: 'zuba_selected_system_id_v2',
  METER_LOGS: 'zuba_meter_logs_v2',
  MAINTENANCE_TASKS: 'zuba_maintenance_tasks_v2',
  SETTINGS: 'zuba_settings_v2',
};

const DEFAULT_USERS: User[] = [
  {
    id: 'usr_operator',
    name: 'Solar Operator',
    email: 'operator@zuba.energy',
    role: 'user',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_admin',
    name: 'Administrator',
    email: 'admin@zuba.energy',
    role: 'admin',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

// No pre-seeded systems — completely clean space to add a new system
const DEFAULT_SYSTEMS: SolarSystem[] = [];

// Helper to calculate future date string YYYY-MM-DD
function getFutureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

const DEFAULT_TASKS: MaintenanceTask[] = [
  {
    id: 'task_clean_panels',
    systemId: '',
    title: 'Clean solar panels surface & remove dust',
    cycleDays: 30,
    dueDate: getFutureDate(12),
    isDone: false,
  },
  {
    id: 'task_battery_terminals',
    systemId: '',
    title: 'Inspect battery terminals & storage health',
    cycleDays: 60,
    dueDate: getFutureDate(35),
    isDone: false,
  },
  {
    id: 'task_inverter_wiring',
    systemId: '',
    title: 'Check inverter wiring & circuit breakers',
    cycleDays: 90,
    dueDate: getFutureDate(72),
    isDone: false,
  },
];

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  tariffZmw: 2.50,
  openWeatherApiKey: '',
  hasDismissedWelcomeGuide: true,
};

export const storage = {
  getUsers(): User[] {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    return JSON.parse(data);
  },

  saveUsers(users: User[]) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  getCurrentUser(): User | null {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!data) {
      const initial = DEFAULT_USERS[0];
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  },

  setCurrentUser(user: User | null) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  getSystems(): SolarSystem[] {
    const data = localStorage.getItem(STORAGE_KEYS.SYSTEMS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.SYSTEMS, JSON.stringify(DEFAULT_SYSTEMS));
      return DEFAULT_SYSTEMS;
    }
    return JSON.parse(data);
  },

  saveSystems(systems: SolarSystem[]) {
    localStorage.setItem(STORAGE_KEYS.SYSTEMS, JSON.stringify(systems));
  },

  getSelectedSystemId(): string {
    const id = localStorage.getItem(STORAGE_KEYS.SELECTED_SYSTEM_ID);
    if (id) return id;
    const systems = this.getSystems();
    return systems[0]?.id || '';
  },

  setSelectedSystemId(id: string) {
    localStorage.setItem(STORAGE_KEYS.SELECTED_SYSTEM_ID, id);
  },

  getMeterLogs(): MeterLog[] {
    const data = localStorage.getItem(STORAGE_KEYS.METER_LOGS);
    if (!data) return [];
    return JSON.parse(data);
  },

  saveMeterLogs(logs: MeterLog[]) {
    localStorage.setItem(STORAGE_KEYS.METER_LOGS, JSON.stringify(logs));
  },

  getMaintenanceTasks(): MaintenanceTask[] {
    const data = localStorage.getItem(STORAGE_KEYS.MAINTENANCE_TASKS);
    let tasks: MaintenanceTask[] = data ? JSON.parse(data) : DEFAULT_TASKS;

    // Check if any tasks completed have passed their cycle days and need to be reset
    const today = new Date().toISOString().split('T')[0];
    let updated = false;

    tasks = tasks.map((task) => {
      // If task was marked done and the dueDate has passed, reset it for the next cycle
      if (task.isDone && task.lastCompletedAt) {
        const completedDate = new Date(task.lastCompletedAt);
        const daysElapsed = Math.floor((Date.now() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysElapsed >= task.cycleDays) {
          updated = true;
          return {
            ...task,
            isDone: false,
            dueDate: getFutureDate(task.cycleDays),
            lastCompletedAt: undefined,
          };
        }
      }
      return task;
    });

    if (updated || !data) {
      localStorage.setItem(STORAGE_KEYS.MAINTENANCE_TASKS, JSON.stringify(tasks));
    }
    return tasks;
  },

  saveMaintenanceTasks(tasks: MaintenanceTask[]) {
    localStorage.setItem(STORAGE_KEYS.MAINTENANCE_TASKS, JSON.stringify(tasks));
  },

  // Alert system: ONLY alerts when maintenance tasks have not been completed
  getAlerts(): Alert[] {
    const tasks = this.getMaintenanceTasks();
    const today = new Date().toISOString().split('T')[0];
    const todayMs = new Date(today).getTime();
    const alerts: Alert[] = [];

    tasks.forEach((task) => {
      if (!task.isDone) {
        const dueMs = new Date(task.dueDate).getTime();
        const diffDays = Math.ceil((dueMs - todayMs) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          alerts.push({
            id: `alt_overdue_${task.id}`,
            userId: 'usr_operator',
            taskId: task.id,
            type: 'maintenance_overdue',
            message: `Overdue Maintenance: "${task.title}" has not been performed (${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} past due).`,
            createdAt: new Date().toISOString(),
            isRead: false,
          });
        } else if (diffDays <= 7) {
          alerts.push({
            id: `alt_due_${task.id}`,
            userId: 'usr_operator',
            taskId: task.id,
            type: 'maintenance_due',
            message: `Pending Maintenance: "${task.title}" is due ${diffDays === 0 ? 'today' : `in ${diffDays} day${diffDays === 1 ? '' : 's'}`}.`,
            createdAt: new Date().toISOString(),
            isRead: false,
          });
        }
      }
    });

    return alerts;
  },

  getSettings(): UserSettings {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  },

  saveSettings(settings: UserSettings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  computeLiveReading(system: SolarSystem, weather: WeatherSnapshot): Reading {
    const now = new Date();
    const catHour = (now.getUTCHours() + 2 + now.getUTCMinutes() / 60) % 24;
    const ratedKw = (system.panelCount * (system.panelWattage || 450)) / 1000.0;

    let generationKw = 0.0;
    let expectedKw = 0.0;

    if (catHour >= 6.0 && catHour <= 18.0) {
      const altitude = Math.sin(((catHour - 6.0) / 12.0) * Math.PI);
      const cloudFactor = Math.max(0.20, 1.0 - (weather.cloudCover / 100.0) * 0.75);
      const safeFactor = system.correctionFactor > 0 ? system.correctionFactor : 1.0;
      generationKw = Number((ratedKw * altitude * cloudFactor * safeFactor).toFixed(2));
      expectedKw = Number((ratedKw * altitude).toFixed(2));
    }

    const baseLoad = ratedKw * 0.28;
    const loadFluctuation = 0.9 + Math.random() * 0.2;
    const consumptionKw = Number(Math.max(0.25, baseLoad * loadFluctuation).toFixed(2));

    const netPower = generationKw - consumptionKw;
    let batteryPercent = 78.0;
    if (netPower >= 0) {
      batteryPercent = Math.min(100.0, 70.0 + (netPower / (ratedKw || 1)) * 25.0);
    } else {
      batteryPercent = Math.max(22.0, 75.0 - (Math.abs(netPower) / (ratedKw || 1)) * 20.0);
    }

    const gridKw = Number((netPower > 0 ? netPower * 0.4 : netPower * 0.6).toFixed(2));

    return {
      id: `read_${Date.now()}`,
      systemId: system.id,
      timestamp: now.toISOString(),
      generationKw,
      consumptionKw,
      batteryPercent: Number(batteryPercent.toFixed(1)),
      gridKw,
      expectedKw,
    };
  },
};
