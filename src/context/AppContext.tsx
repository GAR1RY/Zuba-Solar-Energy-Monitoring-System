import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Alert, MaintenanceTask, MeterLog, Reading, SolarSystem, User, UserSettings, WeatherSnapshot } from '../types';
import { storage } from '../services/storage';
import { calculateExpectedDailyKwh, tuneCorrectionFactor } from '../services/estimator';
import { fetchWeather, WeatherCoordinates } from '../services/weather';

interface AppContextType {
  currentUser: User | null;
  allUsers: User[];
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  toggleUserStatus: (userId: string) => void;
  deleteUser: (userId: string) => void;

  systems: SolarSystem[];
  currentSystem: SolarSystem | null;
  setCurrentSystemId: (id: string) => void;
  addSystem: (system: Omit<SolarSystem, 'id' | 'createdAt' | 'apiKey'>) => SolarSystem;
  updateSystem: (id: string, updates: Partial<SolarSystem>) => void;
  deleteSystem: (id: string) => void;

  weather: WeatherSnapshot | null;
  refreshWeather: (city?: string, coordinates?: WeatherCoordinates | null) => Promise<void>;

  liveReading: Reading | null;
  triggerLiveTick: () => void;

  meterLogs: MeterLog[];
  recordMeterReading: (
    params:
      | {
          date: string;
          totalGenerationKwh?: number;
          totalDayGenerationKwh?: number;
          consumedKwh?: number;
          eveningRemainingKwh?: number;
          note?: string;
          morningKwh?: number;
          daytimeKwh?: number;
        }
      | string,
    legacyMorning?: number,
    legacyEvening?: number,
    legacyNote?: string
  ) => { delta: number; newFactor: number; totalDayKwh: number; netKwh: number };

  maintenanceTasks: MaintenanceTask[];
  toggleMaintenanceTask: (taskId: string) => void;
  resetMaintenanceTask: (taskId: string) => void;
  addMaintenanceTask: (title: string, cycleDays: number, dueDate: string) => void;

  alerts: Alert[];

  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
  toggleTheme: () => void;

  showWelcomeModal: boolean;
  setShowWelcomeModal: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => storage.getCurrentUser());
  const [allUsers, setAllUsers] = useState<User[]>(() => storage.getUsers());
  const [systems, setSystems] = useState<SolarSystem[]>(() => storage.getSystems());
  const [selectedSystemId, setSelectedSystemId] = useState<string>(() => storage.getSelectedSystemId());
  const [settings, setSettings] = useState<UserSettings>(() => storage.getSettings());
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherCoordinates, setWeatherCoordinates] = useState<WeatherCoordinates | null>(null);
  const [liveReading, setLiveReading] = useState<Reading | null>(null);
  const [meterLogs, setMeterLogs] = useState<MeterLog[]>(() => storage.getMeterLogs());
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>(() => storage.getMaintenanceTasks());
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false);

  // Alerts are derived strictly from maintenance tasks (as requested)
  const alerts = useMemo(() => {
    return storage.getAlerts();
  }, [maintenanceTasks]);

  // Sync theme to DOM
  useEffect(() => {
    const applyTheme = (theme: 'system' | 'light' | 'dark') => {
      const isDark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

      const root = document.documentElement;
      if (isDark) {
        root.classList.add('dark');
        document.body.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        document.body.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
        root.style.colorScheme = 'light';
      }
    };

    applyTheme(settings.theme);

    if (settings.theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme('system');
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [settings.theme]);

  const toggleTheme = useCallback(() => {
    const isCurrentlyDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const nextTheme: 'light' | 'dark' = isCurrentlyDark ? 'light' : 'dark';
    const updated = { ...settings, theme: nextTheme };
    setSettings(updated);
    storage.saveSettings(updated);
  }, [settings]);

  // Active solar system
  const accessibleSystems = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return systems;
    return systems.filter((s) => s.userId === currentUser.id);
  }, [currentUser, systems]);

  const currentSystem = useMemo(() => {
    if (accessibleSystems.length === 0) return null;
    const found = accessibleSystems.find((s) => s.id === selectedSystemId);
    return found || accessibleSystems[0];
  }, [accessibleSystems, selectedSystemId]);

  // Refresh weather
  const refreshWeather = useCallback(async (cityOverride?: string, coordinates?: WeatherCoordinates | null) => {
    const targetCity = cityOverride || (currentSystem ? currentSystem.city : 'Lusaka');
    const targetCoordinates = coordinates === undefined ? weatherCoordinates : coordinates;
    if (coordinates !== undefined) {
      setWeatherCoordinates(coordinates);
    }
    const snap = await fetchWeather(targetCity, settings.openWeatherApiKey, targetCoordinates);
    setWeather(snap);
  }, [currentSystem, settings.openWeatherApiKey, weatherCoordinates]);

  useEffect(() => {
    refreshWeather();
    const interval = setInterval(() => {
      refreshWeather();
    }, 600000);
    return () => clearInterval(interval);
  }, [refreshWeather]);

  // Live telemetry generator tick
  const triggerLiveTick = useCallback(() => {
    if (!currentSystem || !weather) return;
    const reading = storage.computeLiveReading(currentSystem, weather);
    setLiveReading(reading);
  }, [currentSystem, weather]);

  useEffect(() => {
    triggerLiveTick();
    const interval = setInterval(triggerLiveTick, 4000);
    return () => clearInterval(interval);
  }, [triggerLiveTick]);

  // Auth methods
  const hashPassword = async (password: string): Promise<string> => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const digest = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' },
      key,
      256
    );
    const toHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${toHex(salt)}:${toHex(new Uint8Array(digest))}`;
  };

  const login = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();

    try {
      const response = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      if (response.ok) {
        const adminUser = (await response.json()) as User;
        setCurrentUser(adminUser);
        setAllUsers((users) => [adminUser, ...users.filter((user) => user.email !== adminUser.email)]);
        return true;
      }

      if (response.status !== 401) {
        return false;
      }
    } catch {
      // Local operator accounts can still sign in while the admin endpoint is unavailable.
    }

    const found = allUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    const passwordHash = storage.getUserPasswordHash(cleanEmail);
    if (found && found.role === 'user' && found.isActive && passwordHash) {
      const [saltHex, expectedHash] = passwordHash.split(':');
      const salt = new Uint8Array(saltHex.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || []);
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
      const digest = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' },
        key,
        256
      );
      const actualHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
      if (actualHash !== expectedHash) return false;
      setCurrentUser(found);
      return true;
    }
    return false;
  };

  const register = async (name: string, email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const existing = allUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      if (existing.role !== 'user' || storage.getUserPasswordHash(cleanEmail)) return false;
      storage.saveUserPasswordHash(cleanEmail, await hashPassword(password));
      setCurrentUser(existing);
      return true;
    }

    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      role: 'user',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    storage.saveUserPasswordHash(cleanEmail, await hashPassword(password));
    const updatedUsers = [...allUsers, newUser];
    setAllUsers(updatedUsers);
    storage.saveUsers(updatedUsers);

    setCurrentUser(newUser);

    // No auto-seeded dummy system; start completely clean with space to add a system
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const toggleUserStatus = (userId: string) => {
    const updated = allUsers.map((u) => {
      if (u.id === userId && u.role !== 'admin') {
        return { ...u, isActive: !u.isActive };
      }
      return u;
    });
    setAllUsers(updated);
    storage.saveUsers(updated);
  };

  const deleteUser = (userId: string) => {
    const target = allUsers.find((u) => u.id === userId);
    if (!target || target.role === 'admin') return;
    const updatedUsers = allUsers.filter((u) => u.id !== userId);
    const updatedSystems = systems.filter((s) => s.userId !== userId);
    setAllUsers(updatedUsers);
    storage.saveUsers(updatedUsers);
    setSystems(updatedSystems);
    storage.saveSystems(updatedSystems);
  };

  // Systems management
  const addSystem = (newSystemData: Omit<SolarSystem, 'id' | 'createdAt' | 'apiKey'>) => {
    const newSys: SolarSystem = {
      ...newSystemData,
      id: `sys_${Date.now()}`,
      apiKey: `zb_key_${Math.random().toString(36).substring(2, 12)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...systems, newSys];
    setSystems(updated);
    storage.saveSystems(updated);
    setSelectedSystemId(newSys.id);
    storage.setSelectedSystemId(newSys.id);
    return newSys;
  };

  const updateSystem = (id: string, updates: Partial<SolarSystem>) => {
    const updated = systems.map((s) => (s.id === id ? { ...s, ...updates } : s));
    setSystems(updated);
    storage.saveSystems(updated);
  };

  const deleteSystem = (id: string) => {
    const updated = systems.filter((s) => s.id !== id);
    setSystems(updated);
    storage.saveSystems(updated);
    if (selectedSystemId === id) {
      const nextId = updated.length > 0 ? updated[0].id : '';
      setSelectedSystemId(nextId);
      storage.setSelectedSystemId(nextId);
    }
  };

  // Record daily sunset meter reading + Real System calibration
  const recordMeterReading = (
    paramsOrDate:
      | {
          date: string;
          totalGenerationKwh?: number;
          totalDayGenerationKwh?: number;
          consumedKwh?: number;
          eveningRemainingKwh?: number;
          note?: string;
          morningKwh?: number;
          daytimeKwh?: number;
        }
      | string,
    legacyMorning?: number,
    legacyEvening?: number,
    legacyNote?: string
  ) => {
    if (!currentSystem) return { delta: 0, newFactor: 1.0, totalDayKwh: 0, netKwh: 0 };

    let date = '';
    let totalDayKwh = 0;
    let consumedKwh = 0;
    let eveningRemainingKwh = 0;
    let note = '';

    if (typeof paramsOrDate === 'object') {
      date = paramsOrDate.date;
      if (paramsOrDate.totalGenerationKwh !== undefined) {
        totalDayKwh = paramsOrDate.totalGenerationKwh;
      } else if (paramsOrDate.totalDayGenerationKwh !== undefined) {
        totalDayKwh = paramsOrDate.totalDayGenerationKwh;
      } else {
        totalDayKwh = (paramsOrDate.morningKwh || 0) + (paramsOrDate.daytimeKwh || 0);
      }
      consumedKwh = paramsOrDate.consumedKwh ?? 0;
      eveningRemainingKwh = paramsOrDate.eveningRemainingKwh ?? 0;
      note = paramsOrDate.note || '';
    } else {
      date = paramsOrDate;
      const morningKwh = legacyMorning || 0;
      const eveningReading = legacyEvening || morningKwh;
      const diff = Math.max(0, eveningReading - morningKwh);
      totalDayKwh = diff > 0 ? diff : morningKwh;
      consumedKwh = totalDayKwh * 0.5;
      eveningRemainingKwh = currentSystem.batteryCapacityKwh * 0.7;
      note = legacyNote || '';
    }

    totalDayKwh = Number(totalDayKwh.toFixed(2));
    const netKwh = Number((totalDayKwh - consumedKwh).toFixed(2));

    const clouds = weather ? weather.cloudCover : 20;
    const temp = weather ? weather.temperatureC : 26;

    const predicted = calculateExpectedDailyKwh(
      currentSystem.panelCount,
      currentSystem.panelWattage,
      clouds,
      temp,
      currentSystem.correctionFactor
    );

    const delta = Number((totalDayKwh - predicted).toFixed(2));
    const oldFactor = currentSystem.correctionFactor;
    const newFactor = tuneCorrectionFactor(oldFactor, totalDayKwh, predicted);

    updateSystem(currentSystem.id, { correctionFactor: newFactor });

    const newLog: MeterLog = {
      id: `log_${Date.now()}`,
      systemId: currentSystem.id,
      date,
      totalDayGenerationKwh: totalDayKwh,
      energyConsumedKwh: consumedKwh,
      eveningRemainingKwh: eveningRemainingKwh,
      netKwh,
      predictedKwh: predicted,
      deltaKwh: delta,
      auditStatus: 'Calibrated',
      note: note || `Sunset log · Tuned γ to ${newFactor.toFixed(4)}`,
      morningReadingKwh: 0,
      daytimeReadingKwh: totalDayKwh,
      eveningReadingKwh: eveningRemainingKwh,
    };

    const updatedLogs = [newLog, ...meterLogs];
    setMeterLogs(updatedLogs);
    storage.saveMeterLogs(updatedLogs);

    return { delta, newFactor, totalDayKwh, netKwh };
  };

  // Maintenance Checklist Actions & Resetting
  const toggleMaintenanceTask = (taskId: string) => {
    const updated = maintenanceTasks.map((t) => {
      if (t.id === taskId) {
        const nextDone = !t.isDone;
        return {
          ...t,
          isDone: nextDone,
          lastCompletedAt: nextDone ? new Date().toISOString() : undefined,
        };
      }
      return t;
    });
    setMaintenanceTasks(updated);
    storage.saveMaintenanceTasks(updated);
  };

  const resetMaintenanceTask = (taskId: string) => {
    const updated = maintenanceTasks.map((t) => {
      if (t.id === taskId) {
        const nextDue = new Date();
        nextDue.setDate(nextDue.getDate() + (t.cycleDays || 30));
        return {
          ...t,
          isDone: false,
          dueDate: nextDue.toISOString().split('T')[0],
          lastCompletedAt: undefined,
        };
      }
      return t;
    });
    setMaintenanceTasks(updated);
    storage.saveMaintenanceTasks(updated);
  };

  const addMaintenanceTask = (title: string, cycleDays: number, dueDate: string) => {
    const newTask: MaintenanceTask = {
      id: `task_${Date.now()}`,
      systemId: currentSystem?.id || '',
      title,
      cycleDays: cycleDays || 30,
      dueDate,
      isDone: false,
    };
    const updated = [newTask, ...maintenanceTasks];
    setMaintenanceTasks(updated);
    storage.saveMaintenanceTasks(updated);
  };

  // Settings
  const updateSettings = (updates: Partial<UserSettings>) => {
    const permittedUpdates = { ...updates };
    if (currentUser?.role !== 'admin') {
      delete permittedUpdates.tariffZmw;
      delete permittedUpdates.openWeatherApiKey;
    }
    if (Object.keys(permittedUpdates).length === 0) return;

    const updated = { ...settings, ...permittedUpdates };
    setSettings(updated);
    storage.saveSettings(updated);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        allUsers,
        login,
        register,
        logout,
        toggleUserStatus,
        deleteUser,

        systems,
        currentSystem,
        setCurrentSystemId: (id) => {
          setSelectedSystemId(id);
          storage.setSelectedSystemId(id);
        },
        addSystem,
        updateSystem,
        deleteSystem,

        weather,
        refreshWeather,

        liveReading,
        triggerLiveTick,

        meterLogs,
        recordMeterReading,

        maintenanceTasks,
        toggleMaintenanceTask,
        resetMaintenanceTask,
        addMaintenanceTask,

        alerts,

        settings,
        updateSettings,
        toggleTheme,

        showWelcomeModal,
        setShowWelcomeModal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
