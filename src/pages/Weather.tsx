import React, { useState } from 'react';
import { CloudSun, Thermometer, Droplets, RefreshCw, CheckCircle2, AlertCircle, Key, MapPin, Crosshair, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEFAULT_PROVINCE, ZAMBIAN_PROVINCES } from '../services/weather';

export const Weather: React.FC = () => {
  const { currentUser, weather, refreshWeather, settings, updateSettings, currentSystem, updateSystem } = useApp();

  const [inputKey, setInputKey] = useState(settings.openWeatherApiKey || '');
  const [isTesting, setIsTesting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const activeLocation = weather?.city || currentSystem?.city || DEFAULT_PROVINCE;

  const handleLocationChange = async (location: string) => {
    setLocationError(null);
    if (currentSystem) {
      updateSystem(currentSystem.id, { city: location });
    }
    await refreshWeather(location, null);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('This browser does not support location access. Choose a province instead.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          await refreshWeather(activeLocation, {
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
        } catch {
          setLocationError('Could not load live weather for your location. Please try again.');
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Allow location access in your browser or choose a province.'
            : 'Could not determine your location. Check your browser location settings and try again.'
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleSaveAndTestKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    const trimmed = inputKey.trim();
    updateSettings({ openWeatherApiKey: trimmed });

    try {
      await refreshWeather(activeLocation);
      setTestResult({
        success: true,
        message: trimmed
          ? 'Weather service connected with your API key.'
          : 'Connected to the free Open-Meteo weather API for live Zambian conditions.',
      });
    } catch {
      setTestResult({
        success: false,
        message: 'Could not connect to the live API. Using the built-in Zambia weather simulation instead.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Live Weather & Climate
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Weather and sunlight conditions across provinces of Zambia
          </p>
        </div>

        <button
          onClick={() => refreshWeather(activeLocation)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Weather</span>
        </button>
      </div>

      {/* Weather Metric Cards - Plain minimal English */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Temperature */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium">
            <span>Temperature</span>
            <Thermometer className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums mt-2">
            {weather ? weather.temperatureC : 26.5}{' '}
            <span className="text-base font-normal text-neutral-500 dark:text-neutral-400">°C</span>
          </div>
          <div className="text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums mt-1">
            Air temperature at 2 m above ground
          </div>
        </div>

        {/* UV Index */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium">
            <span>UV Index</span>
            <Sun className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums mt-2">
            {weather?.uvIndex ?? '—'}
          </div>
          <div className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
            {weather?.uvIndex == null
              ? weather?.source === 'simulated'
                ? 'Not available for simulated data'
                : 'Not available from this weather source'
              : 'Current estimate'}
          </div>
        </div>

        {/* Cloud Coverage */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium">
            <span>Cloud Coverage</span>
            <CloudSun className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums mt-2">
            {weather ? weather.cloudCover : 20}{' '}
            <span className="text-base font-normal text-neutral-500 dark:text-neutral-400">%</span>
          </div>
          <div className="text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums mt-1 truncate">
            {weather ? weather.description : 'Partly Cloudy'}
          </div>
        </div>

        {/* Relative Humidity */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium">
            <span>Relative Humidity</span>
            <Droplets className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums mt-2">
            {weather ? weather.humidity : 55}{' '}
            <span className="text-base font-normal text-neutral-500 dark:text-neutral-400">%</span>
          </div>
          <div className="text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums mt-1">
            Location:{' '}
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">
              {weather ? weather.city : DEFAULT_PROVINCE}
            </span>
          </div>
        </div>
      </div>

      {/* Provinces of Zambia Selector */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 p-6 sm:p-7 shadow-xs">
        <div className="mb-4">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Provinces of Zambia
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Select your province to load local sunlight and weather conditions
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {ZAMBIAN_PROVINCES.map((province) => {
            const isSelected = activeLocation === province;
            return (
              <button
                key={province}
                type="button"
                onClick={() => handleLocationChange(province)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between text-xs cursor-pointer active:scale-[0.98] ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-neutral-900 dark:text-neutral-100 font-bold ring-1 ring-amber-500/20 shadow-xs'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className={`w-4 h-4 ${isSelected ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-400'}`} />
                  <span className="text-xs sm:text-[13px]">{province}</span>
                </div>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors disabled:opacity-50"
          >
            <Crosshair className="w-3.5 h-3.5" />
            {isLocating ? 'Finding your location…' : 'Use my current location'}
          </button>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Uses precise browser coordinates for a closer local weather estimate. Location access is optional.
          </p>
        </div>
        {locationError && (
          <p role="alert" className="mt-3 text-xs text-red-700 dark:text-red-300">
            {locationError}
          </p>
        )}
      </div>

      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
        {weather?.source === 'live'
          ? `Live ${weather.provider ?? 'weather API'} data${weather.latitude !== undefined && weather.longitude !== undefined ? ` · coordinates ${weather.latitude.toFixed(2)}, ${weather.longitude.toFixed(2)}` : ''}.${weather.provider === 'Open-Meteo' ? ' Model estimates can differ from a nearby personal weather station.' : ''}`
          : 'Showing simulated weather because live data is unavailable.'}{' '}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-neutral-700 dark:hover:text-neutral-200"
        >
          Weather data by Open-Meteo
        </a>
      </p>

      {currentUser?.role === 'admin' && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Weather API Connection
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium">
              Free Live Feed
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
            Uses the free Open-Meteo weather API by default. You can leave this blank, or add an OpenWeather API key if you want to override it.
          </p>

          <form onSubmit={handleSaveAndTestKey} className="space-y-3">
            <div className="relative">
              <Key className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Optional: OpenWeather key or leave blank for free Open-Meteo"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={isTesting}
                className="px-5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isTesting ? 'Verifying...' : 'Save & Test Key'}
              </button>
            </div>
          </form>

          {testResult && (
            <div
              className={`mt-4 p-3 rounded-xl text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
