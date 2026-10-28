import React from 'react';
import { Menu, ChevronDown, Moon } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  onOpenSidebar: () => void;
  activeTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar, activeTitle }) => {
  const { systems, currentSystem, setCurrentSystemId, liveReading, settings, toggleTheme } = useApp();

  const isDarkMode =
    settings.theme === 'dark' ||
    (settings.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-3.5 bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200/60 dark:border-neutral-800/60">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onOpenSidebar}
          className="p-1.5 -ml-1 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 lg:hidden rounded-md"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Current page title & System selector */}
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            {activeTitle}
          </span>

          {currentSystem && systems.length > 0 && (
            <>
              <span className="text-neutral-300 dark:text-neutral-700">/</span>
              <div className="relative inline-block">
                <select
                  value={currentSystem.id}
                  onChange={(e) => setCurrentSystemId(e.target.value)}
                  className="appearance-none bg-transparent pr-6 pl-1.5 py-0.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500 rounded"
                >
                  {systems.map((s) => (
                    <option key={s.id} value={s.id} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
                      {s.name} ({s.panelCount} Solars)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-0.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right side live status and theme toggle (no sun icon, no guide button) */}
      <div className="flex items-center gap-2 sm:gap-3 text-xs">
        {liveReading && (
          <div className="hidden sm:flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="tabular-nums font-medium text-neutral-700 dark:text-neutral-300">
              {liveReading.generationKw} kW
            </span>
            <span className="text-neutral-300 dark:text-neutral-700">·</span>
            <span className="tabular-nums">{liveReading.batteryPercent}% Battery</span>
          </div>
        )}

        {/* Clean Theme Toggle with tactile click feedback and clear mode label */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          <Moon className={`w-3.5 h-3.5 transition-colors ${isDarkMode ? 'text-amber-400 fill-amber-400/40' : 'text-neutral-400'}`} />
          <span className="tabular-nums">{isDarkMode ? 'Dark' : 'Light'}</span>
        </button>
      </div>
    </header>
  );
};
