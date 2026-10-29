import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, MaintenanceTask, MeterLog, Reading, SolarSystem, User, UserSettings, WeatherSnapshot } from '../types';
import { apiRequest, setCsrfToken } from '../services/api';
import { calculateExpectedDailyKwh } from '../services/estimator';
import { fetchWeather, WeatherCoordinates } from '../services/weather';

interface BootstrapResponse {
  user: User;
  allUsers: User[];
  systems: SolarSystem[];
  selectedSystemId: string;
  settings: UserSettings;
  meterLogs: MeterLog[];
  maintenanceTasks: MaintenanceTask[];
}

interface SessionResponse {
  user: User | null;
  csrfToken: string;
}

interface AppContextType {
  currentUser: User | null;
  allUsers: User[];
  isLoading: boolean;
  apiError: string | null;
  clearApiError: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  toggleUserStatus: (userId: string) => void;
  deleteUser: (userId: string) => void;

  systems: SolarSystem[];
  currentSystem: SolarSystem | null;
  setCurrentSystemId: (id: string) => void;
  addSystem: (system: Omit<SolarSystem, 'id' | 'createdAt' | 'apiKey'>) => Promise<SolarSystem | null>;
  updateSystem: (id: string, updates: Partial<SolarSystem>) => void;
  deleteSystem: (id: string) => void;

  weather: WeatherSnapshot | null;
  refreshWeather: (city?: string, coordinates?: WeatherCoordinates | null, apiKeyOverride?: string) => Promise<void>;

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
  ) => Promise<{ delta: number; newFactor: number; totalDayKwh: number; netKwh: number } | null>;

  maintenanceTasks: MaintenanceTask[];
  toggleMaintenanceTask: (taskId: string) => void;
  resetMaintenanceTask: (taskId: string) => void;
  addMaintenanceTask: (title: string, cycleDays: number, dueDate: string) => void;

  alerts: Alert[];

  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => Promise<boolean>;
  toggleTheme: () => void;

  showWelcomeModal: boolean;
  setShowWelcomeModal: (show: boolean) => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  tariffZmw: 2.5,
  openWeatherApiKey: '',
  hasDismissedWelcomeGuide: true,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : 'The server request failed. Please try again.';
}

function createLiveReading(system: SolarSystem, weather: WeatherSnapshot): Reading {
  const now = new Date();
  const catHour = (now.getUTCHours() + 2 + now.getUTCMinutes() / 60) % 24;
  const ratedKw = (system.panelCount * (system.panelWattage || 450)) / 1000;
  let generationKw = 0;
  let expectedKw = 0;

  if (catHour >= 6 && catHour <= 18) {
    const altitude = Math.sin(((catHour - 6) / 12) * Math.PI);
    const cloudFactor = Math.max(0.2, 1 - (weather.cloudCover / 100) * 0.75);
    const safeFactor = system.correctionFactor > 0 ? system.correctionFactor : 1;
    generationKw = Number((ratedKw * altitude * cloudFactor * safeFactor).toFixed(2));
    expectedKw = Number((ratedKw * altitude).toFixed(2));
  }

  const baseLoad = ratedKw * 0.28;
  const consumptionKw = Number(Math.max(0.25, baseLoad * (0.9 + Math.random() * 0.2)).toFixed(2));
  const netPower = generationKw - consumptionKw;
  const batteryPercent = netPower >= 0
    ? Math.min(100, 70 + (netPower / (ratedKw || 1)) * 25)
    : Math.max(22, 75 - (Math.abs(netPower) / (ratedKw || 1)) * 20);
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
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [systems, setSystems] = useState<SolarSystem[]>([]);
  const [selectedSystemId, setSelectedSystemId] = useState('');
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherCoordinates, setWeatherCoordinates] = useState<WeatherCoordinates | null>(null);
  const [liveReading, setLiveReading] = useState<Reading | null>(null);
  const [meterLogs, setMeterLogs] = useState<MeterLog[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const syncFromServer = useCallback(async () => {
    const session = await apiRequest<SessionResponse>('/api/session');
    setCsrfToken(session.csrfToken);
    if (!session.user) {
      setCurrentUser(null);
      setAllUsers([]);
      setSystems([]);
      setSelectedSystemId('');
      setSettings(DEFAULT_SETTINGS);
      setMeterLogs([]);
      setMaintenanceTasks([]);
      setWeather(null);
      setLiveReading(null);
      return;
    }

    const data = await apiRequest<BootstrapResponse>('/api/bootstrap');
    setCurrentUser(data.user);
    setAllUsers(data.allUsers);
    setSystems(data.systems);
    setSelectedSystemId(data.selectedSystemId);
    setSettings(data.settings);
    setMeterLogs(data.meterLogs);
    setMaintenanceTasks(data.maintenanceTasks);
  }, []);

  useEffect(() => {
    syncFromServer()
      .catch((error: unknown) => setApiError(messageFromError(error)))
      .finally(() => setIsLoading(false));
  }, [syncFromServer]);

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

  const accessibleSystems = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return systems;
    return systems.filter((system) => system.userId === currentUser.id);
  }, [currentUser, systems]);

  const currentSystem = useMemo(() => {
    if (accessibleSystems.length === 0) return null;
    return accessibleSystems.find((system) => system.id === selectedSystemId) || accessibleSystems[0];
  }, [accessibleSystems, selectedSystemId]);

  const runMutation = useCallback(async <T,>(
    path: string,
    options: RequestInit
  ): Promise<T | null> => {
    try {
      const result = await apiRequest<T>(path, options);
      await syncFromServer();
      setApiError(null);
      return result;
    } catch (error) {
      setApiError(messageFromError(error));
      return null;
    }
  }, [syncFromServer]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await apiRequest<SessionResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setCsrfToken(response.csrfToken);
      await syncFromServer();
      setApiError(null);
      return true;
    } catch (error) {
      setApiError(messageFromError(error));
      return false;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const response = await apiRequest<SessionResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      setCsrfToken(response.csrfToken);
      await syncFromServer();
      setApiError(null);
      return true;
    } catch (error) {
      setApiError(messageFromError(error));
      return false;
    }
  };

  const logout = async () => {
    const result = await runMutation<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
    if (result) {
      setApiError(null);
      setWeatherCoordinates(null);
    }
  };

  const toggleUserStatus = (userId: string) => {
    const user = allUsers.find((item) => item.id === userId);
    if (!user) return;
    void runMutation(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !user.isActive }),
    });
  };

  const deleteUser = (userId: string) => {
    void runMutation(`/api/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
  };

  const setCurrentSystem = (id: string) => {
    void runMutation('/api/systems/select', {
      method: 'POST',
      body: JSON.stringify({ systemId: id }),
    });
  };

  const addSystem = async (
    newSystemData: Omit<SolarSystem, 'id' | 'createdAt' | 'apiKey'>
  ): Promise<SolarSystem | null> => {
    const result = await runMutation<{ system: SolarSystem }>('/api/systems', {
      method: 'POST',
      body: JSON.stringify(newSystemData),
    });
    return result?.system ?? null;
  };

  const updateSystem = (id: string, updates: Partial<SolarSystem>) => {
    void runMutation(`/api/systems/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  };

  const deleteSystem = (id: string) => {
    void runMutation(`/api/systems/${encodeURIComponent(id)}`, { method: 'DELETE' });
  };

  const refreshWeather = useCallback(async (
    cityOverride?: string,
    coordinates?: WeatherCoordinates | null,
    apiKeyOverride?: string
  ) => {
    const targetCity = cityOverride || currentSystem?.city || 'Lusaka Province';
    const targetCoordinates = coordinates === undefined ? weatherCoordinates : coordinates;
    if (coordinates !== undefined) setWeatherCoordinates(coordinates);
    const snapshot = await fetchWeather(
      targetCity,
      apiKeyOverride ?? settings.openWeatherApiKey,
      targetCoordinates
    );
    setWeather(snapshot);
  }, [currentSystem, settings.openWeatherApiKey, weatherCoordinates]);

  useEffect(() => {
    if (!currentUser) return;
    void refreshWeather();
    const interval = window.setInterval(() => void refreshWeather(), 600000);
    return () => window.clearInterval(interval);
  }, [currentUser, refreshWeather]);

  const triggerLiveTick = useCallback(() => {
    if (!currentSystem || !weather) return;
    setLiveReading(createLiveReading(currentSystem, weather));
  }, [currentSystem, weather]);

  useEffect(() => {
    triggerLiveTick();
    const interval = window.setInterval(triggerLiveTick, 4000);
    return () => window.clearInterval(interval);
  }, [triggerLiveTick]);

  const recordMeterReading = async (
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
    if (!currentSystem) {
      return { delta: 0, newFactor: 1, totalDayKwh: 0, netKwh: 0 };
    }

    let payload: Record<string, unknown>;
    if (typeof paramsOrDate === 'object') {
      const totalGenerationKwh =
        paramsOrDate.totalGenerationKwh ??
        paramsOrDate.totalDayGenerationKwh ??
        (paramsOrDate.morningKwh || 0) + (paramsOrDate.daytimeKwh || 0);
      payload = {
        date: paramsOrDate.date,
        totalGenerationKwh,
        consumedKwh: paramsOrDate.consumedKwh ?? 0,
        eveningRemainingKwh: paramsOrDate.eveningRemainingKwh ?? 0,
        note: paramsOrDate.note,
      };
    } else {
      const morningKwh = legacyMorning || 0;
      const eveningReading = legacyEvening || morningKwh;
      const difference = Math.max(0, eveningReading - morningKwh);
      payload = {
        date: paramsOrDate,
        totalGenerationKwh: difference > 0 ? difference : morningKwh,
        consumedKwh: (difference > 0 ? difference : morningKwh) * 0.5,
        eveningRemainingKwh: currentSystem.batteryCapacityKwh * 0.7,
        note: legacyNote,
      };
    }

    const result = await runMutation<{
      result: { delta: number; newFactor: number; totalDayKwh: number; netKwh: number };
    }>('/api/meter-logs', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        systemId: currentSystem.id,
        cloudCover: weather?.cloudCover ?? 20,
        temperatureC: weather?.temperatureC ?? 26,
      }),
    });
    return result?.result ?? null;
  };

  const toggleMaintenanceTask = (taskId: string) => {
    const task = maintenanceTasks.find((item) => item.id === taskId);
    if (!task) return;
    void runMutation(`/api/maintenance/${encodeURIComponent(taskId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'toggle', isDone: !task.isDone }),
    });
  };

  const resetMaintenanceTask = (taskId: string) => {
    void runMutation(`/api/maintenance/${encodeURIComponent(taskId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'reset' }),
    });
  };

  const addMaintenanceTask = (title: string, cycleDays: number, dueDate: string) => {
    void runMutation('/api/maintenance', {
      method: 'POST',
      body: JSON.stringify({
        title,
        cycleDays: cycleDays || 30,
        dueDate,
        systemId: currentSystem?.id || null,
      }),
    });
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    const permittedUpdates = { ...updates };
    if (currentUser?.role !== 'admin') {
      delete permittedUpdates.tariffZmw;
    }
    if (Object.keys(permittedUpdates).length === 0) return false;
    const result = await runMutation<{ ok: boolean }>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(permittedUpdates),
    });
    return result?.ok ?? false;
  };

  const toggleTheme = () => {
    const isDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    updateSettings({ theme: isDark ? 'light' : 'dark' });
  };

  const alerts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return maintenanceTasks.flatMap((task): Alert[] => {
      if (task.isDone) return [];
      const due = new Date(`${task.dueDate}T00:00:00`);
      const daysRemaining = Math.ceil((due.getTime() - today.getTime()) / 86400000);
      if (daysRemaining > 7) return [];
      const overdue = daysRemaining < 0;
      const count = Math.abs(daysRemaining);
      return [{
        id: `${overdue ? 'alt_overdue' : 'alt_due'}_${task.id}`,
        userId: currentUser?.id || task.userId || '',
        systemId: task.systemId,
        taskId: task.id,
        type: overdue ? 'maintenance_overdue' : 'maintenance_due',
        message: overdue
          ? `Overdue Maintenance: "${task.title}" has not been performed (${count} day${count === 1 ? '' : 's'} past due).`
          : `Pending Maintenance: "${task.title}" is due ${count === 0 ? 'today' : `in ${count} day${count === 1 ? '' : 's'}`}.`,
        createdAt: new Date().toISOString(),
        isRead: false,
      }];
    });
  }, [currentUser, maintenanceTasks]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        allUsers,
        isLoading,
        apiError,
        clearApiError: () => setApiError(null),
        login,
        register,
        logout,
        toggleUserStatus,
        deleteUser,
        systems,
        currentSystem,
        setCurrentSystemId: setCurrentSystem,
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
