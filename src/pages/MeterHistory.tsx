import React, { useState } from 'react';
import { Download, PlusCircle, CheckCircle2, Sun, Moon, Zap, BatteryCharging, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateExpectedDailyKwh } from '../services/estimator';

export const MeterHistory: React.FC = () => {
  const { currentSystem, meterLogs, recordMeterReading, weather } = useApp();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalGenerationKwh, setTotalGenerationKwh] = useState<string>('');
  const [feedback, setFeedback] = useState<{ newFactor: number; delta: number; totalDayKwh: number; netKwh: number } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  const systemLogs = currentSystem
    ? meterLogs.filter((l) => l.systemId === currentSystem.id || l.systemId === '')
    : meterLogs;

  const filteredLogs = systemLogs.filter((l) => l.date.includes(filterQuery));

  const numGenerated = parseFloat(totalGenerationKwh) || 0;

  // Predicted baseline for current date/weather
  const clouds = weather ? weather.cloudCover : 20;
  const temp = weather ? weather.temperatureC : 26;
  const predictedToday = currentSystem
    ? calculateExpectedDailyKwh(
        currentSystem.panelCount,
        currentSystem.panelWattage,
        clouds,
        temp,
        currentSystem.correctionFactor
      )
    : 0;

  const handleRecord = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (isNaN(numGenerated) || numGenerated <= 0) {
      setFormError('Please enter the total solar energy generated today before sunset.');
      return;
    }

    const res = recordMeterReading({
      date,
      totalGenerationKwh: numGenerated,
      consumedKwh: 0,
      eveningRemainingKwh: 0,
    });

    setFeedback(res);
    setTotalGenerationKwh('');

    setTimeout(() => {
      setFeedback(null);
    }, 8000);
  };

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Date', 'Total Generated Today (kWh)'];

    const rows = filteredLogs.map((l) => {
      const totalGen = l.totalDayGenerationKwh !== undefined ? l.totalDayGenerationKwh : (l.morningReadingKwh || 0) + (l.daytimeReadingKwh || 0);
      return [l.date, totalGen.toFixed(1)];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `zuba_${currentSystem?.name.toLowerCase().replace(/\s+/g, '_') || 'meter'}_sunset_log.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Sunset Daily Meter Log & History
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            One daily log recorded at the end of the day right before sunset (~17:30 – 18:00)
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shadow-xs cursor-pointer active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Record Sunset Log Form */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 p-5 sm:p-7 shadow-xs">
        <div className="mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-500" />
            <span>End-of-Day Sunset Reading</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Record the date and total solar generation for today’s sunset log.
          </p>
        </div>

        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs font-semibold text-red-700 dark:text-red-300">
            {formError}
          </div>
        )}

        <form onSubmit={handleRecord} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Log Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Total Generated Today (kWh)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                placeholder="e.g. 24.5"
                value={totalGenerationKwh}
                onChange={(e) => setTotalGenerationKwh(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500 tabular-nums"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Save Sunset Log</span>
            </button>
          </div>
        </form>

        {/* Feedback message */}
        {feedback && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Sunset log recorded! Total generated today: <strong>{feedback.totalDayKwh} kWh</strong>.
            </span>
          </div>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-200/80 dark:border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Daily Sunset Log ({filteredLogs.length} Entries)
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Date and total generation recorded for each sunset entry.
            </p>
          </div>

          <input
            type="text"
            placeholder="Search dates..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500 w-full sm:w-60"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200/60 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-800/30 text-neutral-500 dark:text-neutral-400">
                <th className="py-3 px-3.5 font-semibold">Date</th>
                <th className="py-3 px-3.5 font-semibold">Total Generated Today</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/40 dark:divide-neutral-800/40 tabular-nums">
              {filteredLogs.map((log) => {
                const totalGen = log.totalDayGenerationKwh !== undefined ? log.totalDayGenerationKwh : (log.morningReadingKwh || 0) + (log.daytimeReadingKwh || 0);

                return (
                  <tr key={log.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
                    <td className="py-3 px-3.5 font-medium text-neutral-900 dark:text-neutral-100">{log.date}</td>
                    <td className="py-3 px-3.5 font-bold text-neutral-900 dark:text-neutral-100">
                      {totalGen.toFixed(1)} <span className="text-[10px] font-normal text-neutral-400">kWh</span>
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-8 text-center text-neutral-400">
                    No sunset logs recorded yet. Take a reading at sunset (~17:30 - 18:00) and enter it above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
