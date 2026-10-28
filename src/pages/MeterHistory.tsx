import React, { useState } from 'react';
import { Download, PlusCircle, CheckCircle2, Sun, Moon, Zap, BatteryCharging, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateExpectedDailyKwh } from '../services/estimator';

export const MeterHistory: React.FC = () => {
  const { currentSystem, meterLogs, recordMeterReading, weather } = useApp();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalGenerationKwh, setTotalGenerationKwh] = useState<string>('');
  const [consumedKwh, setConsumedKwh] = useState<string>('');
  const [eveningRemainingKwh, setEveningRemainingKwh] = useState<string>('');
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState<{ newFactor: number; delta: number; totalDayKwh: number; netKwh: number } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  const systemLogs = currentSystem
    ? meterLogs.filter((l) => l.systemId === currentSystem.id || l.systemId === '')
    : meterLogs;

  const filteredLogs = systemLogs.filter((l) =>
    l.date.includes(filterQuery) || (l.note && l.note.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  // Live calculation preview
  const numGenerated = parseFloat(totalGenerationKwh) || 0;
  const numConsumed = parseFloat(consumedKwh) || 0;
  const numEvening = parseFloat(eveningRemainingKwh) || 0;

  const liveNetDifference = Number((numGenerated - numConsumed).toFixed(2));

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

  // Estimated night hours backup based on typical evening loads
  const avgNightLoadKw = currentSystem ? Math.max(0.3, currentSystem.panelCount * 0.04) : 0.4;
  const estimatedNightHours = numEvening > 0 ? (numEvening / avgNightLoadKw).toFixed(1) : '0';

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
      consumedKwh: numConsumed,
      eveningRemainingKwh: numEvening,
      note,
    });

    setFeedback(res);
    setTotalGenerationKwh('');
    setConsumedKwh('');
    setEveningRemainingKwh('');
    setNote('');

    setTimeout(() => {
      setFeedback(null);
    }, 8000);
  };

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;
    const headers = [
      'Date',
      'Total Solar Generated at Sunset (kWh)',
      'Energy Consumed (kWh)',
      'Net Daily Balance (kWh)',
      'Battery Left at Sunset (kWh)',
      'Predicted Baseline (kWh)',
      'Variance (kWh)',
      'Status',
      'Notes',
    ];

    const rows = filteredLogs.map((l) => {
      const totalGen = l.totalDayGenerationKwh !== undefined ? l.totalDayGenerationKwh : (l.morningReadingKwh || 0) + (l.daytimeReadingKwh || 0);
      const consumed = l.energyConsumedKwh !== undefined ? l.energyConsumedKwh : 0;
      const net = l.netKwh;
      const eveningLeft = l.eveningRemainingKwh !== undefined ? l.eveningRemainingKwh : l.eveningReadingKwh || 0;
      return [
        l.date,
        totalGen.toFixed(1),
        consumed.toFixed(1),
        net.toFixed(1),
        eveningLeft.toFixed(1),
        l.predictedKwh.toFixed(1),
        l.deltaKwh.toFixed(1),
        l.auditStatus,
        `"${l.note || ''}"`,
      ];
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>End-of-Day Sunset Reading</span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Read your inverter and battery display right before sunset to record your single daily entry
            </p>
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
            Calibration Factor: <strong className="text-amber-600 dark:text-amber-400">{currentSystem?.correctionFactor.toFixed(4) || '1.0000'}</strong>
          </div>
        </div>

        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs font-semibold text-red-700 dark:text-red-300">
            {formError}
          </div>
        )}

        <form onSubmit={handleRecord} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* 1. Date */}
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
              <span className="text-[10px] text-neutral-400">Date of sunset reading</span>
            </div>

            {/* 2. Total Day Solar Generation */}
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
              <span className="text-[10px] text-neutral-400">Total day solar yield at sunset</span>
            </div>

            {/* 3. Energy Consumed */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Energy Consumed (kWh)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                placeholder="e.g. 15.2"
                value={consumedKwh}
                onChange={(e) => setConsumedKwh(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500 tabular-nums"
              />
              <span className="text-[10px] text-neutral-400">Total electricity used by loads today</span>
            </div>

            {/* 4. Battery Left at Sunset */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Battery Left for Night (kWh)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                placeholder="e.g. 8.5"
                value={eveningRemainingKwh}
                onChange={(e) => setEveningRemainingKwh(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500 tabular-nums"
              />
              <span className="text-[10px] text-neutral-400">Storage reserve left at sunset</span>
            </div>
          </div>

          {/* Notes and Submit Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end pt-1">
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Operational Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Clear afternoon sun, ran borehole pump, battery full before sunset"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Save Sunset Log</span>
            </button>
          </div>
        </form>

        {/* Live Calculation Preview Card */}
        {(numGenerated > 0 || numConsumed > 0 || numEvening > 0) && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 text-xs">
            <div className="font-bold text-amber-900 dark:text-amber-200 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Sunset Summary Preview:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-neutral-700 dark:text-neutral-300 tabular-nums">
              <div>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">Daylight Produced:</span>
                <strong className="text-sm text-neutral-900 dark:text-white">{numGenerated} kWh</strong>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">Daily Energy Balance:</span>
                <strong className="text-sm text-neutral-900 dark:text-white">
                  {liveNetDifference >= 0 ? `+${liveNetDifference}` : liveNetDifference} kWh
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">Battery Left for Night:</span>
                <strong className="text-sm text-neutral-900 dark:text-white">{numEvening} kWh</strong>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">Night Backup Prediction:</span>
                <strong className="text-sm text-amber-700 dark:text-amber-300">
                  ~{estimatedNightHours} hrs {Number(estimatedNightHours) >= 10 ? '(Comfortable)' : '(Conserve)'}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Feedback message */}
        {feedback && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Sunset log recorded! Total generated today:{' '}
              <strong>{feedback.totalDayKwh} kWh</strong> (Net balance:{' '}
              <strong>{feedback.netKwh >= 0 ? `+${feedback.netKwh}` : feedback.netKwh} kWh</strong>).
              System calibration updated to <strong>γ = {feedback.newFactor.toFixed(4)}</strong>.
            </span>
          </div>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-200/80 dark:border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Daily Sunset Audit Trail ({filteredLogs.length} Entries)
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Single daily end-of-day sunset logs comparing real generation with predictive baseline
            </p>
          </div>

          <input
            type="text"
            placeholder="Search dates or notes..."
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
                <th className="py-3 px-3.5 font-semibold">Solar Generated</th>
                <th className="py-3 px-3.5 font-semibold">Consumed</th>
                <th className="py-3 px-3.5 font-semibold">Net Balance</th>
                <th className="py-3 px-3.5 font-semibold">Battery at Sunset</th>
                <th className="py-3 px-3.5 font-semibold">Predicted</th>
                <th className="py-3 px-3.5 font-semibold">Variance</th>
                <th className="py-3 px-3.5 font-semibold">Status</th>
                <th className="py-3 px-3.5 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/40 dark:divide-neutral-800/40 tabular-nums">
              {filteredLogs.map((log) => {
                const totalGen = log.totalDayGenerationKwh !== undefined ? log.totalDayGenerationKwh : (log.morningReadingKwh || 0) + (log.daytimeReadingKwh || 0);
                const consumed = log.energyConsumedKwh !== undefined ? log.energyConsumedKwh : 0;
                const net = log.netKwh;
                const eveningLeft = log.eveningRemainingKwh !== undefined ? log.eveningRemainingKwh : log.eveningReadingKwh || 0;
                const isPositive = log.deltaKwh >= 0;

                return (
                  <tr key={log.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
                    <td className="py-3 px-3.5 font-medium text-neutral-900 dark:text-neutral-100">{log.date}</td>
                    <td className="py-3 px-3.5 font-bold text-neutral-900 dark:text-neutral-100">
                      {totalGen.toFixed(1)} <span className="text-[10px] font-normal text-neutral-400">kWh</span>
                    </td>
                    <td className="py-3 px-3.5 text-neutral-600 dark:text-neutral-400">{consumed.toFixed(1)} kWh</td>
                    <td className="py-3 px-3.5 font-semibold">
                      <span className={net >= 0 ? 'text-amber-700 dark:text-amber-300' : 'text-neutral-700 dark:text-neutral-300'}>
                        {net >= 0 ? `+${net.toFixed(1)}` : net.toFixed(1)} kWh
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-semibold text-neutral-900 dark:text-neutral-100">
                      {eveningLeft.toFixed(1)} <span className="text-[10px] font-normal text-neutral-400">kWh</span>
                    </td>
                    <td className="py-3 px-3.5 text-neutral-500 dark:text-neutral-400">{log.predictedKwh.toFixed(1)} kWh</td>
                    <td className="py-3 px-3.5 font-semibold">
                      <span className={isPositive ? 'text-amber-700 dark:text-amber-300' : 'text-neutral-600 dark:text-neutral-400'}>
                        {isPositive ? `+${log.deltaKwh.toFixed(1)}` : log.deltaKwh.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium">
                        {log.auditStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-neutral-400 max-w-xs truncate text-[11px] font-sans">
                      {log.note || '—'}
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-neutral-400">
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
