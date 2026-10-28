import React from 'react';
import {
  LayoutDashboard,
  SunMedium,
  CloudSun,
  History,
  Wrench,
  Bell,
  Info,
  Settings,
  ShieldAlert,
  LogOut,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const { currentUser, logout, alerts, settings, toggleTheme } = useApp();
  const unreadAlertsCount = alerts.filter((a) => !a.isRead).length;

  const isDarkMode =
    settings.theme === 'dark' ||
    (settings.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const navItems = [
    { id: 'home', label: 'Overview', icon: LayoutDashboard },
    { id: 'systems', label: 'Systems', icon: SunMedium },
    { id: 'weather', label: 'Weather', icon: CloudSun },
    { id: 'history', label: 'Meter History', icon: History },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: Bell,
      badge: unreadAlertsCount > 0 ? unreadAlertsCount : undefined,
    },
    { id: 'about', label: 'About Zuba', icon: Info },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (currentUser?.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Platform Admin', icon: ShieldAlert });
  }

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border-r border-neutral-200/80 dark:border-neutral-800/80 flex flex-col justify-between p-5 overflow-y-auto overscroll-contain transition-transform duration-250 ease-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand header with clean, consistent colored background matching the theme */}
          <div className="flex items-center gap-2 mb-7 mt-1">
            <button
              onClick={() => handleNavClick('home')}
              className="flex-1 flex items-center gap-3 p-2.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 dark:border-amber-500/35 shadow-xs hover:bg-amber-500/15 dark:hover:bg-amber-500/20 transition-all text-left group focus:outline-none cursor-pointer active:scale-[0.98]"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center shadow-xs shrink-0 transition-transform group-hover:scale-105 group-active:scale-95">
                <SunMedium className="w-5 h-5 text-neutral-950 stroke-[2.4]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">
                    Zuba
                  </span>
                  <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-200 uppercase">
                    Solar
                  </span>
                </div>
                <span className="block text-[11px] font-bold tracking-wider uppercase text-amber-700 dark:text-amber-400 truncate">
                  Solar Energy Monitor
                </span>
              </div>
            </button>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 lg:hidden rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-100/50 dark:bg-neutral-800/50 focus:outline-none active:scale-95 transition-all shrink-0 cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav list without Reports */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                    isActive
                      ? 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-950 dark:text-amber-100 font-bold border-l-3 border-amber-500 shadow-2xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive
                          ? 'text-amber-600 dark:text-amber-400 stroke-[2.4]'
                          : 'text-neutral-400 dark:text-neutral-500 stroke-[1.8]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[11px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500 text-white tabular-nums shadow-2xs">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar bottom: Light/Dark mode quick toggle, User Card, Sign Out */}
        <div className="border-t border-neutral-200/80 dark:border-neutral-800/80 pt-4 px-1 space-y-3">
          {/* Quick Light & Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-100/60 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all active:scale-[0.98] cursor-pointer"
            title="Toggle Light or Dark Mode"
          >
            <span className="flex items-center gap-2">
              <Moon className={`w-3.5 h-3.5 ${isDarkMode ? 'text-amber-400 fill-amber-400/40' : 'text-neutral-500'}`} />
              <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">
              Toggle
            </span>
          </button>

          {currentUser && (
            <div className="px-2 pt-1">
              <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-200 truncate">
                {currentUser.name}
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                {currentUser.email}
              </div>
            </div>
          )}

          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-md"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
