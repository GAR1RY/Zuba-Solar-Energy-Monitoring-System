import { WeatherSnapshot } from '../types';

export interface ZambianLocationProfile {
  name: string;
  lat: number;
  lon: number;
  baseTempC: number;
}

export const DEFAULT_PROVINCE = 'Lusaka Province';

export const ZAMBIAN_PROVINCES = [
  'Central Province',
  'Copperbelt Province',
  'Eastern Province',
  'Luapula Province',
  'Lusaka Province',
  'Northern Province',
  'North-Western Province',
  'Southern Province',
  'Western Province',
];

// Alias for backward compatibility if imported elsewhere
export const ZAMBIAN_NINE_PROVINCES = ZAMBIAN_PROVINCES;
export const ZAMBIA_OVERALL_NAME = DEFAULT_PROVINCE;

export const ZAMBIAN_LOCATIONS: Record<string, ZambianLocationProfile> = {
  'Central Province': {
    name: 'Central Province',
    lat: -14.4333,
    lon: 28.4500,
    baseTempC: 26.8,
  },
  'Copperbelt Province': {
    name: 'Copperbelt Province',
    lat: -12.9667,
    lon: 28.6333,
    baseTempC: 26.5,
  },
  'Eastern Province': {
    name: 'Eastern Province',
    lat: -13.6333,
    lon: 32.6500,
    baseTempC: 26.2,
  },
  'Luapula Province': {
    name: 'Luapula Province',
    lat: -11.1833,
    lon: 28.8833,
    baseTempC: 25.8,
  },
  'Lusaka Province': {
    name: 'Lusaka Province',
    lat: -15.4167,
    lon: 28.2833,
    baseTempC: 27.2,
  },
  'Northern Province': {
    name: 'Northern Province',
    lat: -10.2167,
    lon: 31.1833,
    baseTempC: 25.0,
  },
  'North-Western Province': {
    name: 'North-Western Province',
    lat: -12.1833,
    lon: 26.4000,
    baseTempC: 25.5,
  },
  'Southern Province': {
    name: 'Southern Province',
    lat: -17.8500,
    lon: 25.8667,
    baseTempC: 29.8,
  },
  'Western Province': {
    name: 'Western Province',
    lat: -15.2667,
    lon: 23.1333,
    baseTempC: 28.4,
  },
};

export const ZAMBIAN_CITIES = ZAMBIAN_LOCATIONS;

/**
 * Generates realistic Zambian weather simulation based on time of day and province profile
 */
export function generateSimulatedWeather(locationName: string = DEFAULT_PROVINCE): WeatherSnapshot {
  const profile = ZAMBIAN_LOCATIONS[locationName] || ZAMBIAN_LOCATIONS[DEFAULT_PROVINCE];
  const now = new Date();
  // Central Africa Time (CAT) = UTC+2
  const catHour = (now.getUTCHours() + 2 + now.getUTCMinutes() / 60) % 24;

  // Temperature variation through the day
  const diurnalShift = Math.sin(((catHour - 9) / 24) * 2 * Math.PI) * 4.5;
  const temp = Number((profile.baseTempC + diurnalShift + (Math.random() * 0.8 - 0.4)).toFixed(1));

  // Cloud cover variation
  let cloudCover = Math.round(15 + Math.random() * 20);
  if (catHour >= 13 && catHour <= 17) {
    cloudCover = Math.round(25 + Math.random() * 25);
  }

  const humidity = Math.round(Math.max(30, Math.min(85, 65 - diurnalShift * 3 + (Math.random() * 6 - 3))));

  let description = 'Clear and Sunny';
  if (cloudCover > 50) {
    description = 'Cloudy Sky';
  } else if (cloudCover > 25) {
    description = 'Partly Cloudy';
  }

  return {
    id: `sim-${Date.now()}`,
    city: profile.name,
    timestamp: new Date().toISOString(),
    temperatureC: temp,
    humidity,
    cloudCover,
    description,
    source: 'simulated',
  };
}

/**
 * Attempts OpenWeatherMap API fetch if key is provided; otherwise returns realistic simulation.
 */
export async function fetchWeather(locationName: string = DEFAULT_PROVINCE, apiKey?: string): Promise<WeatherSnapshot> {
  const cleanLoc = ZAMBIAN_LOCATIONS[locationName] ? locationName : DEFAULT_PROVINCE;

  if (!apiKey || apiKey.trim() === '') {
    return generateSimulatedWeather(cleanLoc);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const queryCity = cleanLoc.replace(' Province', '');
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(queryCity)},ZM&units=metric&appid=${apiKey.trim()}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        id: `owm-${Date.now()}`,
        city: cleanLoc,
        timestamp: new Date().toISOString(),
        temperatureC: Number(data.main.temp.toFixed(1)),
        humidity: Math.round(data.main.humidity),
        cloudCover: Math.round(data.clouds.all),
        description: data.weather?.[0]?.description
          ? data.weather[0].description.replace(/\b\w/g, (c: string) => c.toUpperCase())
          : 'Clear Sky',
        source: 'live',
      };
    }
  } catch {
    // Graceful fallback to simulation
  }

  return generateSimulatedWeather(cleanLoc);
}
