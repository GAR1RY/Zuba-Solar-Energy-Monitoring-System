import React from 'react';
import { Sun, BatteryCharging, Home, Zap } from 'lucide-react';
import { Reading, SolarSystem } from '../../types';

interface EnergyFlowProps {
  reading: Reading;
  system: SolarSystem;
}

export const EnergyFlow: React.FC<EnergyFlowProps> = ({ reading, system }) => {
  const isGenerating = reading.generationKw > 0.05;
  const isCharging = reading.generationKw > reading.consumptionKw;
  const gridExport = reading.gridKw > 0;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Energy Distribution
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Instantaneous power transfer between array, storage, building, and grid
          </p>
        </div>

        <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 tabular-nums">
          {system.panelCount} Solars · {system.systemClass}
        </div>
      </div>

      {/* Grid of 4 nodes with uniform, clean styling */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 relative">
        {/* Node 1: Solar Array */}
        <div className="relative p-4 rounded-xl bg-neutral-50/80 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800/60 text-center">
          <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Sun className={`w-4 h-4 ${isGenerating ? 'animate-spin-slow' : ''}`} />
          </div>
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Solar Array
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums mt-1">
            {reading.generationKw}{' '}
            <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">kW</span>
          </div>
          <div className="text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums mt-0.5">
            Expected: {reading.expectedKw} kW
          </div>
        </div>

        {/* Node 2: Battery Storage */}
        <div className="relative p-4 rounded-xl bg-neutral-50/80 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800/60 text-center">
          <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
            <BatteryCharging className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Storage Bank
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums mt-1">
            {reading.batteryPercent}{' '}
            <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">%</span>
          </div>
          <div className="text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums mt-0.5">
            {isCharging ? 'Charging' : 'Supplying load'} · {system.batteryCapacityKwh} kWh
          </div>
        </div>

        {/* Node 3: Building Load */}
        <div className="relative p-4 rounded-xl bg-neutral-50/80 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800/60 text-center">
          <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
            <Home className="w-4 h-4" />
          </div>
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Facility Load
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums mt-1">
            {reading.consumptionKw}{' '}
            <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">kW</span>
          </div>
          <div className="text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums mt-0.5">
            Active consumption
          </div>
        </div>

        {/* Node 4: Utility Grid */}
        <div className="relative p-4 rounded-xl bg-neutral-50/80 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800/60 text-center">
          <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Utility Grid
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums mt-1">
            {Math.abs(reading.gridKw)}{' '}
            <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">kW</span>
          </div>
          <div className="text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums mt-0.5">
            {gridExport ? 'Surplus Export' : 'Grid Import'}
          </div>
        </div>
      </div>
    </div>
  );
};
