import React from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useApp();

  const handleSelectTheme = (newTheme: 'light' | 'dark' | 'system') => {
    updateSettings({ theme: newTheme });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Customize interface appearance with light and dark mode
        </p>
      </div>

      {/* Appearance & Theme Card */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 p-6 sm:p-7 shadow-xs">
        <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">
          Appearance
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
          Choose whether Zuba appears in light mode, dark mode, or follows your system preference.
        </p>

        {/* 3 Theme Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Light Mode */}
          <button
            type="button"
            onClick={() => handleSelectTheme('light')}
            className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
              settings.theme === 'light'
                ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20'
                : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/30'
            }`}
          >
            <div>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                <Sun className="w-4 h-4" />
              </div>
              <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Light Mode
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Clean white and neutral canvas for bright environments
              </p>
            </div>

            {settings.theme === 'light' && (
              <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-amber-600">
                <Check className="w-3.5 h-3.5" />
                <span>Active</span>
              </div>
            )}
          </button>

          {/* Dark Mode */}
          <button
            type="button"
            onClick={() => handleSelectTheme('dark')}
            className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
              settings.theme === 'dark'
                ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20'
                : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/30'
            }`}
          >
            <div>
              <div className="w-8 h-8 rounded-xl bg-neutral-800 text-amber-400 flex items-center justify-center mb-3">
                <Moon className="w-4 h-4" />
              </div>
              <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Dark Mode
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Deep obsidian palette comfortable in low-light environments
              </p>
            </div>

            {settings.theme === 'dark' && (
              <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-amber-600">
                <Check className="w-3.5 h-3.5" />
                <span>Active</span>
              </div>
            )}
          </button>

          {/* System Automatic */}
          <button
            type="button"
            onClick={() => handleSelectTheme('system')}
            className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
              settings.theme === 'system'
                ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20'
                : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/30'
            }`}
          >
            <div>
              <div className="w-8 h-8 rounded-xl bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 flex items-center justify-center mb-3">
                <Monitor className="w-4 h-4" />
              </div>
              <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Auto (System)
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Automatically synchronizes with your device settings
              </p>
            </div>

            {settings.theme === 'system' && (
              <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-amber-600">
                <Check className="w-3.5 h-3.5" />
                <span>Active</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Zuba AI Intelligence Settings Card */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 p-6 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Zuba AI Intelligence
            </h2>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/20">
            Dedicated Engine
          </span>
        </div>

        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 leading-relaxed">
          Custom on-device intelligence created specifically for this solar project. Provides instant answers for battery 100% full charge times, sunset daily meter logs, and night storage endurance.
        </p>

        <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-semibold text-neutral-900 dark:text-neutral-100">
              Ask Zuba AI Pop-up
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              Accessible via the floating icon at the bottom right of the screen
            </div>
          </div>
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            Active
          </span>
        </div>
      </div>
    </div>
  );
};
