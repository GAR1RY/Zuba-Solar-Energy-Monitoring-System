import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, SunMedium, Battery } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SolarSystem, SystemClass } from '../types';
import { inferSystemClass } from '../services/estimator';
import { DEFAULT_PROVINCE, ZAMBIAN_PROVINCES, ZAMBIAN_LOCATIONS } from '../services/weather';

export const Systems: React.FC = () => {
  const { systems, addSystem, deleteSystem, currentSystem, setCurrentSystemId, currentUser } = useApp();

  const [name, setName] = useState('');
  const [solarCount, setSolarCount] = useState<number>(8);
  const [batteryCapacityKwh, setBatteryCapacityKwh] = useState<number>(10.0);
  const [city, setCity] = useState(DEFAULT_PROVINCE);
  const [systemClass, setSystemClass] = useState<SystemClass>('Residential');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [systemToDelete, setSystemToDelete] = useState<string | null>(null);

  const handleSolarCountChange = (val: number) => {
    const count = Math.max(1, val);
    setSolarCount(count);
    setSystemClass(inferSystemClass(count));
  };

  const handleClassSelect = (cls: SystemClass) => {
    setSystemClass(cls);
    if (cls === 'Residential' && solarCount > 8) {
      setSolarCount(8);
    } else if (cls === 'Commercial' && (solarCount <= 8 || solarCount > 24)) {
      setSolarCount(16);
    } else if (cls === 'Industrial' && solarCount <= 24) {
      setSolarCount(32);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cityCoords = ZAMBIAN_LOCATIONS[city] || ZAMBIAN_LOCATIONS[DEFAULT_PROVINCE];

    const newSys = await addSystem({
      userId: currentUser?.id || '',
      name: name.trim() || `${city} ${systemClass} Space`,
      panelCount: solarCount,
      panelWattage: 450,
      capacityKwp: Number(((solarCount * 450) / 1000).toFixed(2)),
      batteryCapacityKwh,
      city,
      latitude: cityCoords.lat,
      longitude: cityCoords.lon,
      tilt: 15.0,
      azimuth: 0.0,
      correctionFactor: 1.0,
      isSimulated: true,
      systemClass,
    });

    if (!newSys) return;
    setSuccessNotice(`System "${newSys.name}" added successfully with ${newSys.panelCount} solars.`);
    setName('');
    setSolarCount(8);
    setSystemClass('Residential');
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Solar Systems
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Add your solar installation by specifying the space type and number of solars
        </p>
      </div>

      {successNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Primary Workspace: Clean Form to Add a New System */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 p-6 sm:p-7 shadow-xs">
        <div className="mb-5">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Add New Solar System
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Configure the installation name, space category, and count of solar panels
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              System or Location Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Home Rooftop, Main Clinic, Commercial Store"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Space Type Selector (Residential / Commercial / Industrial) */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
              Space Category
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(['Residential', 'Commercial', 'Industrial'] as SystemClass[]).map((cls) => {
                const isSelected = systemClass === cls;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => handleClassSelect(cls)}
                    className={`py-3 px-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-neutral-900 dark:text-neutral-100 font-bold shadow-xs'
                        : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium'
                    }`}
                  >
                    <div className="text-xs sm:text-sm">{cls}</div>
                    <div className="text-[11px] font-normal text-neutral-400 mt-0.5">
                      {cls === 'Residential' && '1 – 8 Solars'}
                      {cls === 'Commercial' && '9 – 24 Solars'}
                      {cls === 'Industrial' && '25+ Solars'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Number of Solars Input (no kilowatts, purely panel count) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Number of Solars (Panels)
              </label>
              <div className="relative">
                <SunMedium className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="1"
                  max="10000"
                  required
                  value={solarCount}
                  onChange={(e) => handleSolarCountChange(parseInt(e.target.value) || 1)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm font-bold rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500 tabular-nums"
                />
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                {systemClass} solar configuration: {solarCount} solar module{solarCount === 1 ? '' : 's'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Battery Storage (kWh)
              </label>
              <div className="relative">
                <Battery className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="50000"
                  required
                  value={batteryCapacityKwh}
                  onChange={(e) => setBatteryCapacityKwh(parseFloat(e.target.value) || 5.0)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm font-bold rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500 tabular-nums"
                />
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">Battery storage capacity</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Location
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {ZAMBIAN_PROVINCES.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-neutral-400 mt-1">Province location</p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs sm:text-sm font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add System</span>
            </button>
          </div>
        </form>
      </div>

      {/* Configured Systems List (if any exist) */}
      {systems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 px-1">
            Configured Systems ({systems.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {systems.map((sys: SolarSystem) => {
              const isSelected = currentSystem?.id === sys.id;
              return (
                <div
                  key={sys.id}
                  className={`bg-white dark:bg-neutral-900 rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-amber-500 ring-1 ring-amber-500/20'
                      : 'border-neutral-200/80 dark:border-neutral-800/80'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                          {sys.name}
                        </h4>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          {sys.city} · {sys.systemClass}
                        </div>
                      </div>

                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          isSelected
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        {isSelected ? 'Active' : 'Standby'}
                      </span>
                    </div>

                    <div className="my-3 py-2.5 border-y border-neutral-100 dark:border-neutral-800 space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                      <div className="flex justify-between">
                        <span>Solar Setup:</span>
                        <span className="font-bold text-neutral-900 dark:text-neutral-100">
                          {sys.panelCount} Solars ({sys.systemClass})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Battery Storage:</span>
                        <span>{sys.batteryCapacityKwh} kWh</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    {!isSelected ? (
                      <button
                        onClick={() => setCurrentSystemId(sys.id)}
                        className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        Set as Active System
                      </button>
                    ) : (
                      <span className="text-xs text-neutral-400">Active Monitoring</span>
                    )}

                    {systemToDelete === sys.id ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                        <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                          Delete?
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            deleteSystem(sys.id);
                            setSystemToDelete(null);
                          }}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-2xs active:scale-95 transition-all cursor-pointer"
                          aria-label="Confirm delete"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setSystemToDelete(null)}
                          className="px-2 py-1 text-xs font-semibold rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 active:scale-95 transition-all cursor-pointer"
                          aria-label="Cancel delete"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSystemToDelete(sys.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer active:scale-95"
                        title="Delete system"
                        aria-label={`Delete system ${sys.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
