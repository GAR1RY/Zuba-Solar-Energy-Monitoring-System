import { useState, useRef, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Home } from './pages/Home';
import { Systems } from './pages/Systems';
import { Weather } from './pages/Weather';
import { MeterHistory } from './pages/MeterHistory';
import { Maintenance } from './pages/Maintenance';
import { Alerts } from './pages/Alerts';
import { About } from './pages/About';
import { Settings } from './pages/Settings';
import { Admin } from './pages/Admin';
import { Auth } from './pages/Auth';
import { ZubaFloatingAI } from './components/ai/ZubaFloatingAI';

const TAB_TITLES: Record<string, string> = {
  home: 'Solar Overview',
  systems: 'Solar Systems',
  weather: 'Live Weather',
  history: 'Meter History',
  maintenance: 'Maintenance',
  alerts: 'Alerts',
  about: 'About Zuba',
  settings: 'Settings',
  admin: 'Platform Admin',
};

function MainApp() {
  const { currentUser, isLoading, apiError, clearApiError } = useApp();
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewingPublicAbout, setViewingPublicAbout] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);

  // When switching tabs, smoothly reset the dashboard scroll position without moving the background
  useEffect(() => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 text-sm text-neutral-500 dark:text-neutral-400">
        Connecting to Zuba…
      </div>
    );
  }

  // If not signed in and not viewing public About
  if (!currentUser && !viewingPublicAbout) {
    return <Auth onViewAbout={() => setViewingPublicAbout(true)} />;
  }

  // If viewing public about without being logged in
  if (!currentUser && viewingPublicAbout) {
    return (
      <div className="fixed inset-0 h-screen h-[100dvh] overflow-y-auto overscroll-contain bg-neutral-50 dark:bg-neutral-950 p-6 sm:p-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Zuba
              </span>
            </div>
            <button
              onClick={() => setViewingPublicAbout(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
            >
              Back to Sign In
            </button>
          </div>
          <About />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 h-screen h-[100dvh] w-full flex overflow-hidden bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Workspace Canvas */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 lg:pl-64">
        <Header
          onOpenSidebar={() => setIsSidebarOpen(true)}
          activeTitle={TAB_TITLES[activeTab] || 'Zuba'}
        />

        {apiError && (
          <div
            role="alert"
            className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 sm:mx-8"
          >
            <span>{apiError}</span>
            <button type="button" onClick={clearApiError} className="font-semibold underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Dedicated scrollable dashboard container - keeps background completely still */}
        <main
          ref={mainContentRef}
          tabIndex={-1}
          className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-8 focus:outline-none"
        >
          {activeTab === 'home' && <Home onNavigate={(tab) => setActiveTab(tab)} />}
          {activeTab === 'systems' && <Systems />}
          {activeTab === 'weather' && <Weather />}
          {activeTab === 'history' && <MeterHistory />}
          {activeTab === 'maintenance' && <Maintenance />}
          {activeTab === 'alerts' && <Alerts />}
          {activeTab === 'about' && <About />}
          {activeTab === 'settings' && <Settings />}
          {activeTab === 'admin' && <Admin />}
        </main>

        {/* Floating Ask Zuba AI Pop-up at Bottom Right */}
        <ZubaFloatingAI />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
