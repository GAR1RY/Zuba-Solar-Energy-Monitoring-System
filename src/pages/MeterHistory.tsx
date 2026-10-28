import React, { useState } from 'react';
import { Download, PlusCircle, CheckCircle2, Battery, Calendar, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const MeterHistory: React.FC = () => {
  const { currentSystem, meterLogs, recordMeterReading } = useApp();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [batteryKwh, setBatteryKwh] = useState<string>('');
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState<{ batteryKwh: number; batteryPercent: number; delta: number; newFactor: number } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  const systemLogs = currentSystem
    ? meterLogs.filter((l) => l.systemId === currentSystem.id || l.systemId === '')
    : meterLogs;

  const filteredLogs = systemLogs.filter((l) =>
    l.date.includes(filterQuery) || (l.note && l.note.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  const batteryCapacity = currentSystem?.batteryCapacityKwh || 10;
  const numBattery = parseFloat(batteryKwh) || 0;
  const calculatedPercent = batteryCapacity > 0 ? Math.min(100, Math.round((numBattery / batteryCapacity) * 100)) : 0;

  // Typical night load consumption for backup hours prediction
  const avgNightLoadKw = currentSystem ? Math.max(0.3, currentSystem.panelCount * 0.04) : 0.4;
  const backupHours = numBattery > 0 ? (numBattery / avgNightLoadKw).toFixed(1) : '0';

  const handleRecord = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (isNaN(numBattery) || numBattery <= 0) {
      setFormError('Please enter your battery energy level in kWh.');
      return;
    }

    if (numBattery > batteryCapacity * 1.2) {
      setFormError(`Battery reading exceeds system capacity (${batteryCapacity} kWh).`);
      return;
    }

    const res = recordMeterReading({
      date,
      batteryKwh: numBattery,
      note,
    });

    setFeedback({
      batteryKwh: res.batteryKwh,
      batteryPercent: res.batteryPercent,
      delta: res.delta,
      newFactor: res.newFactor,
    });

    setBatteryKwh('');
    setNote('');

    setTimeout(() => {
      setFeedback(null);
    }, 6000);
  };

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;
    const headers = [
      'Date',
      'Battery (kWh)',
      'Battery (%)',
      'Night Backup (Hours)',
      'Status',
      'Notes',
    ];

    const rows = filteredLogs.map((l) => {
      const stored = l.eveningRemainingKwh !== undefined ? l.eveningRemainingKwh : l.eveningReadingKwh || 0;
      const pct = l.batteryPercent !== undefined ? l.batteryPercent : Math.min(100, Math.round((stored / batteryCapacity) * 100));
      const hours = (stored / avgNightLoadKw).toFixed(1);
      return [
        l.date,
        stored.toFixed(1),
        `${pct}%`,
        hours,
        l.auditStatus,
        `"${l.note || ''}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `zuba_${currentSystem?.name.toLowerCase().replace(/\s+/g, '_') || 'battery'}_meter_history.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Meter History
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Log your date and battery energy level at the end of the day before sunset
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

      {/* Simplified 2-Field Entry Form */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Battery className="w-4 h-4 text-amber-500" />
              <span>Daily Log Entry</span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Evening is standard: logging right before sunset records your peak stored solar energy and predicts your night endurance.
            </p>
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
            Battery Capacity: <strong className="text-neutral-900 dark:text-neutral-100">{batteryCapacity} kWh</strong>
          </div>
        </div>

        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs font-semibold text-red-700 dark:text-red-300">
            {formError}
          </div>
        )}

        <form onSubmit={handleRecord} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Field 1: Date */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Log Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <span className="text-[11px] text-neutral-400 mt-1 block">Date of evening battery check</span>
            </div>

            {/* Field 2: Battery Size / Energy Level */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Battery Level (kWh)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max={batteryCapacity * 1.2}
                  required
                  placeholder={`e.g. ${(batteryCapacity * 0.85).toFixed(1)}`}
                  value={batteryKwh}
                  onChange={(e) => setBatteryKwh(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500 tabular-nums"
                />
              </div>
              <span className="text-[11px] text-neutral-400 mt-1 block">
                Stored energy in battery bank (out of {batteryCapacity} kWh)
              </span>
            </div>
          </div>

          {/* Optional Notes and Submit */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end pt-1">
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Sunny day, battery fully topped up"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs sm:text-sm font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4 text-amber-500" />
              <span>Save Log</span>
            </button>
          </div>
        </form>

        {/* Live Calculation Preview Card */}
        {numBattery > 0 && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 text-xs animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-neutral-700 dark:text-neutral-300 tabular-nums">
              <div>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">Battery Level:</span>
                <strong className="text-sm text-neutral-900 dark:text-white">
                  {numBattery} kWh ({calculatedPercent}%)
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">Night Backup Prediction:</span>
                <strong className="text-sm text-amber-700 dark:text-amber-300">
                  ~{backupHours} hours {Number(backupHours) >= 10 ? '(Comfortable)' : '(Conserve)'}
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">Endurance Status:</span>
                <strong className="text-sm text-neutral-900 dark:text-white">
                  {Number(backupHours) >= 10 ? 'Will last through the night' : 'Sufficient for low power loads'}
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
              Log recorded for <strong>{feedback.batteryKwh} kWh</strong> ({feedback.batteryPercent}%). Night prediction updated.
            </span>
          </div>
        )}
      </div>

      {/* Clean History Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-200/80 dark:border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Logged History ({filteredLogs.length} Entries)
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Daily record of battery level and night prediction
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
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Battery Stored</th>
                <th className="py-3 px-4 font-semibold">Battery Level</th>
                <th className="py-3 px-4 font-semibold">Night Backup</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/40 dark:divide-neutral-800/40 tabular-nums">
              {filteredLogs.map((log) => {
                const stored = log.eveningRemainingKwh !== undefined ? log.eveningRemainingKwh : log.eveningReadingKwh || 0;
                const pct = log.batteryPercent !== undefined ? log.batteryPercent : Math.min(100, Math.round((stored / batteryCapacity) * 100));
                const hours = (stored / avgNightLoadKw).toFixed(1);

                return (
                  <tr key={log.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
                    <td className="py-3 px-4 font-medium text-neutral-900 dark:text-neutral-100">{log.date}</td>
                    <td className="py-3 px-4 font-bold text-neutral-900 dark:text-neutral-100">
                      {stored.toFixed(1)} <span className="text-[10px] font-normal text-neutral-400">kWh</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-neutral-700 dark:text-neutral-300">
                      {pct}%
                    </td>
                    <td className="py-3 px-4 font-semibold text-amber-700 dark:text-amber-300">
                      ~{hours} hrs
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium">
                        {log.auditStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-400 max-w-xs truncate text-[11px] font-sans">
                      {log.note || '—'}
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    No meter entries logged yet. Enter today's date and your battery level above.
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
