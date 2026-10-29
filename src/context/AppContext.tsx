import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Alert, MaintenanceTask, MeterLog, Reading, SolarSystem, User, UserSettings, WeatherSnapshot } from '../types';
import { storage } from '../services/storage';
import { ApiError, apiRequest } from '../services/api';
import { calculateExpectedDailyKwh, tuneCorrectionFactor } from '../services/estimator';
import { fetchWeather, WeatherCoordinates } from '../services/weather';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  tariffZmw: 2.5,
  openWeatherApiKey: '',
  hasDismissedWelcomeGuide: true,
};

interface AppContextType {
  currentUser: User | null;
  authLoading: boolean;
  syncError: string | null;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [systems, setSystems] = useState<SolarSystem[]>([]);
  const [selectedSystemId, setSelectedSystemId] = useState('');
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherCoordinates, setWeatherCoordinates] = useState<WeatherCoordinates | null>(null);
  const [liveReading, setLiveReading] = useState<Reading | null>(null);
  const [meterLogs, setMeterLogs] = useState<MeterLog[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false);

  const refreshData = useCallback(async () => {
    try {
      const data = await apiRequest<{
        systems: SolarSystem[];
        meterLogs: MeterLog[];
        maintenanceTasks: MaintenanceTask[];
        settings: UserSettings;
        users?: User[];
      }>('/api/data');
      setSystems(data.systems);
      setMeterLogs(data.meterLogs);
      setMaintenanceTasks(data.maintenanceTasks);
      setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      if (data.users) setAllUsers(data.users);
      setSelectedSystemId((current) =>
        data.systems.some((system) => system.id === current) ? current : data.systems[0]?.id || ''
      );
      setSyncError(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setCurrentUser(null);
        setAllUsers([]);
        setSystems([]);
        setMeterLogs([]);
        setMaintenanceTasks([]);
        setSettings(DEFAULT_SETTINGS);
        setSelectedSystemId('');
        setSyncError('Your session expired or was disabled. Please sign in again.');
      }
      throw error;
    }
  }, []);

  const persist = useCallback((request: Promise<unknown>) => {
    void request.catch((error: unknown) => {
      setSyncError(error instanceof Error ? error.message : 'The change could not be saved to the database.');
    });
  }, []);

  useEffect(() => {
    let active = true;
    void apiRequest<{ user: User | null }>('/api/auth/session')
      .then(async ({ user }) => {
        if (!active) return;
        if (user) {
          setCurrentUser(user);
          await refreshData();
        }
      })
      .catch((error: unknown) => {
        if (active) setSyncError(error instanceof Error ? error.message : 'Could not connect to the server.');
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshData]);

  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      void refreshData().catch((error: unknown) => {
        setSyncError(error instanceof Error ? error.message : 'Could not refresh shared database data.');
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [currentUser, refreshData]);

  // Alerts are derived strictly from maintenance tasks (as requested)
  const alerts = useMemo(() => {
    return storage.getAlerts(maintenanceTasks, currentUser?.id || '');
  }, [maintenanceTasks, currentUser?.id]);

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
    if (currentUser) {
      persist(apiRequest('/api/settings', { method: 'PUT', body: JSON.stringify({ theme: nextTheme }) }));
    }
  }, [settings, persist, currentUser]);

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

  const login = async (email: string, password: string) => {
    try {
      const { user } = await apiRequest<{ user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setCurrentUser(user);
      await refreshData();
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return false;
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const { user } = await apiRequest<{ user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      setCurrentUser(user);
      await refreshData();
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) return false;
      throw error;
    }
  };

  const logout = () => {
    persist(apiRequest('/api/auth/logout', { method: 'POST' }));
    setCurrentUser(null);
    setAllUsers([]);
    setSystems([]);
    setMeterLogs([]);
    setMaintenanceTasks([]);
    setSettings(DEFAULT_SETTINGS);
    setSelectedSystemId('');
  };

  const toggleUserStatus = (userId: string) => {
    const user = allUsers.find((item) => item.id === userId);
    if (!user || user.role === 'admin') return;
    const isActive = !user.isActive;
    const updated = allUsers.map((item) => item.id === userId ? { ...item, isActive } : item);
    setAllUsers(updated);
    persist(apiRequest(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }));
  };

  const deleteUser = (userId: string) => {
    const target = allUsers.find((u) => u.id === userId);
    if (!target || target.role === 'admin') return;
    const updatedUsers = allUsers.filter((u) => u.id !== userId);
    const updatedSystems = systems.filter((s) => s.userId !== userId);
    setAllUsers(updatedUsers);
    setSystems(updatedSystems);
    setMeterLogs((logs) => logs.filter((log) => updatedSystems.some((system) => system.id === log.systemId)));
    setMaintenanceTasks((tasks) => tasks.filter((task) => !task.systemId || updatedSystems.some((system) => system.id === task.systemId)));
    persist(apiRequest(`/api/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' }));
  };

  // Systems management
  const addSystem = (newSystemData: Omit<SolarSystem, 'id' | 'createdAt' | 'apiKey'>) => {
    const newSys: SolarSystem = {
      ...newSystemData,
      userId: currentUser?.id || '',
      id: `sys_${crypto.randomUUID()}`,
      apiKey: `zb_key_${Math.random().toString(36).substring(2, 12)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...systems, newSys];
    setSystems(updated);
    setSelectedSystemId(newSys.id);
    persist(apiRequest('/api/systems', { method: 'POST', body: JSON.stringify(newSys) }));
    return newSys;
  };

  const updateSystem = (id: string, updates: Partial<SolarSystem>) => {
    const updated = systems.map((s) => (s.id === id ? { ...s, ...updates } : s));
    setSystems(updated);
    persist(apiRequest(`/api/systems/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }));
  };

  const deleteSystem = (id: string) => {
    const updated = systems.filter((s) => s.id !== id);
    setSystems(updated);
    setMeterLogs((logs) => logs.filter((log) => log.systemId !== id));
    setMaintenanceTasks((tasks) => tasks.filter((task) => task.systemId !== id));
    persist(apiRequest(`/api/systems/${encodeURIComponent(id)}`, { method: 'DELETE' }));
    if (selectedSystemId === id) {
      const nextId = updated.length > 0 ? updated[0].id : '';
      setSelectedSystemId(nextId);
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
    persist(apiRequest('/api/meter-logs', { method: 'POST', body: JSON.stringify(newLog) }));

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
    const task = updated.find((item) => item.id === taskId);
    if (task) persist(apiRequest(`/api/maintenance-tasks/${encodeURIComponent(taskId)}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    }));
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
    const task = updated.find((item) => item.id === taskId);
    if (task) persist(apiRequest(`/api/maintenance-tasks/${encodeURIComponent(taskId)}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    }));
  };

  const addMaintenanceTask = (title: string, cycleDays: number, dueDate: string) => {
    const newTask: MaintenanceTask = {
      id: `task_${crypto.randomUUID()}`,
      systemId: currentSystem?.id || '',
      title,
      cycleDays: cycleDays || 30,
      dueDate,
      isDone: false,
    };
    const updated = [newTask, ...maintenanceTasks];
    setMaintenanceTasks(updated);
    persist(apiRequest('/api/maintenance-tasks', { method: 'POST', body: JSON.stringify(newTask) }));
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
    persist(apiRequest('/api/settings', { method: 'PUT', body: JSON.stringify(permittedUpdates) }));
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        authLoading,
        syncError,
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
