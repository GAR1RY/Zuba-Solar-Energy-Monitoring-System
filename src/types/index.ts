export type SystemClass = 'Residential' | 'Commercial' | 'Industrial';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
}

export interface SolarSystem {
  id: string;
  userId: string;
  name: string;
  systemClass: SystemClass;
  panelCount: number; // Number of Solars (used for classification and sizing)
  panelWattage: number; // Default 450W per panel
  capacityKwp: number;
  batteryCapacityKwh: number;
  city: string;
  latitude: number;
  longitude: number;
  tilt: number;
  azimuth: number;
  correctionFactor: number;
  isSimulated: boolean;
  apiKey: string;
  createdAt: string;
}

export interface WeatherSnapshot {
  id: string;
  systemId?: string;
  city: string;
  timestamp: string;
  temperatureC: number;
  humidity: number;
  cloudCover: number;
  uvIndex: number | null;
  latitude?: number;
  longitude?: number;
  description: string;
  source: 'live' | 'simulated';
  provider?: 'Open-Meteo' | 'OpenWeather';
}

export interface Reading {
  id: string;
  systemId: string;
  timestamp: string;
  generationKw: number;
  consumptionKw: number;
  batteryPercent: number;
  gridKw: number;
  expectedKw: number;
}

export interface MeterLog {
  id: string;
  systemId: string;
  date: string; // YYYY-MM-DD
  totalDayGenerationKwh: number; // Total solar energy generated from sunrise to sunset (kWh)
  energyConsumedKwh: number; // Total building energy consumed during the day (kWh)
  eveningRemainingKwh: number; // Battery storage reserve left right before sunset (kWh)
  netKwh: number; // Net daily energy balance (Total Generated - Consumed)
  predictedKwh: number; // Model prediction baseline for the day
  deltaKwh: number; // Actual vs predicted variance
  auditStatus: 'Verified' | 'Calibrated' | 'Pending';
  note?: string;
  // Backward compatibility fields
  morningReadingKwh?: number;
  daytimeReadingKwh?: number;
  eveningReadingKwh?: number;
}

export interface MaintenanceTask {
  id: string;
  userId?: string;
  systemId: string;
  title: string;
  cycleDays: number; // Days after which task resets
  dueDate: string; // YYYY-MM-DD
  isDone: boolean;
  lastCompletedAt?: string;
}

export interface Alert {
  id: string;
  userId: string;
  systemId?: string;
  taskId?: string;
  type: 'maintenance_overdue' | 'maintenance_due';
  message: string;
  createdAt: string;
  isRead: boolean;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  tariffZmw: number;
  openWeatherApiKey: string;
  hasDismissedWelcomeGuide: boolean;
}
