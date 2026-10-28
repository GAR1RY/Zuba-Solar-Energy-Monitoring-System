import { CloudSun, Battery } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EnergyFlow } from '../components/dashboard/EnergyFlow';
import { ProductionChart } from '../components/dashboard/ProductionChart';
import { calculateExpectedDailyKwh, calculatePerformanceRatio } from '../services/estimator';

interface HomeProps {
  onNavigate: (tab: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { currentSystem, liveReading, weather, meterLogs, settings } = useApp();

  if (!currentSystem) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          No Solar System Configured
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
          Register your solar array and battery storage specifications to begin monitoring.
        </p>
        <button
          onClick={() => onNavigate('systems')}
          className="px-5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
        >
          Add Installation
        </button>
      </div>
    );
  }

  const clouds = weather ? weather.cloudCover : 20;
  const temp = weather ? weather.temperatureC : 26;

  const todayPredictedKwh = calculateExpectedDailyKwh(
    currentSystem.panelCount,
    currentSystem.panelWattage,
    clouds,
    temp,
    currentSystem.correctionFactor
  );

  const estimatedDailySavingsZmw = Number((todayPredictedKwh * settings.tariffZmw).toFixed(2));
  const currentPR = liveReading
    ? calculatePerformanceRatio(liveReading.generationKw, liveReading.expectedKw)
    : 95;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Title & Context */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Solar Energy Overview
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1 flex flex-wrap items-center gap-2">
            <span className="font-semibold text-neutral-900 dark:text-neutral-200">{currentSystem.name}</span>
            <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
            <span className="text-amber-600 dark:text-amber-400 font-medium">{currentSystem.panelCount} Solars ({currentSystem.systemClass})</span>
            <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
            <span className="tabular-nums font-medium text-neutral-700 dark:text-neutral-300">{currentSystem.city}</span>
          </p>
        </div>

        <div className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 px-2.5 py-1 rounded-lg">
          System Health: <span className="font-bold text-amber-700 dark:text-amber-300">{currentPR}% Performance Ratio</span>
        </div>
      </div>

      {/* 4 Clean, Consistent Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Generating Now */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-5 shadow-xs transition-all hover:border-neutral-300 dark:hover:border-neutral-700">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold">
            <span>Generating Now</span>
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 shadow-xs shadow-amber-500/50 animate-pulse" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums mt-2">
            {liveReading ? liveReading.generationKw : 0}{' '}
            <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">kW</span>
          </div>
          <div className="text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums mt-1">
            {liveReading ? liveReading.expectedKw : 0} kW baseline
          </div>
        </div>

        {/* Metric 2: Today's Forecast */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-5 shadow-xs transition-all hover:border-neutral-300 dark:hover:border-neutral-700">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold">
            <span>Today's Forecast</span>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300">5.8 PSH</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums mt-2">
            {todayPredictedKwh}{' '}
            <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">kWh</span>
          </div>
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums mt-1 font-medium">
            Est. K {estimatedDailySavingsZmw} ZMW value
          </div>
        </div>

        {/* Metric 3: Battery Level */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-5 shadow-xs transition-all hover:border-neutral-300 dark:hover:border-neutral-700">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold">
            <span>Battery Level</span>
            <Battery className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums mt-2">
            {liveReading ? liveReading.batteryPercent : 0}{' '}
            <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">%</span>
          </div>
          <div className="text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums mt-1">
            {currentSystem.batteryCapacityKwh} kWh nominal bank
          </div>
        </div>

        {/* Metric 4: Weather Conditions */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-5 shadow-xs transition-all hover:border-neutral-300 dark:hover:border-neutral-700">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold">
            <span className="truncate">Weather · {weather ? weather.city : currentSystem.city}</span>
            <CloudSun className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums mt-2">
            {weather ? weather.temperatureC : 26}{' '}
            <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">°C</span>
          </div>
          <div className="text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums mt-1 truncate">
            {weather ? `${weather.description} (${weather.cloudCover}% clouds)` : 'Clear'}
          </div>
        </div>
      </div>

      {/* Energy Flow Graphic */}
      {liveReading && <EnergyFlow reading={liveReading} system={currentSystem} />}

      {/* Seven-Day Production History Chart */}
      <ProductionChart logs={meterLogs} todayPredictedKwh={todayPredictedKwh} />
    </div>
  );
};
