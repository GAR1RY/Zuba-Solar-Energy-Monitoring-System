import React, { useState } from 'react';
import { ArrowRight, Info, ShieldCheck, Lock, EyeOff, CheckCircle2, X, SunMedium, Eye } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ThemeToggleButton } from '../components/layout/ThemeToggleButton';

interface AuthProps {
  onViewAbout: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onViewAbout }) => {
  const { login, register, syncError } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  // Form starts clean and empty as strictly specified
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      if (mode === 'login') {
        const ok = await login(email, password);
        if (!ok) {
          setErrorMsg('Invalid email or password, or this account is inactive.');
        }
      } else {
        if (!name.trim()) {
          setErrorMsg('Please enter your full name.');
          return;
        }
        if (password.length < 8) {
          setErrorMsg('Choose a password with at least 8 characters.');
          return;
        }
        const ok = await register(name, email, password);
        if (!ok) {
          setErrorMsg('An account with this email address already exists.');
        }
      }
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Could not complete sign-in. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 h-screen h-[100dvh] overflow-y-auto overscroll-contain flex flex-col items-center justify-center p-4 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <div className="absolute top-4 right-4">
        <ThemeToggleButton />
      </div>
      <div className="w-full max-w-sm my-auto">
        {/* Brand Lockup with Clean, Uniform Amber State */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 dark:border-amber-500/35 shadow-xs mb-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center shadow-xs shrink-0">
              <SunMedium className="w-5 h-5 text-neutral-950 stroke-[2.4]" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">
                  Zuba
                </span>
                <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-200 uppercase">
                  Solar
                </span>
              </div>
              <span className="block text-[11px] font-bold tracking-wider uppercase text-amber-700 dark:text-amber-400">
                Solar Energy Monitor
              </span>
            </div>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Solar Energy & Storage Monitoring Platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {mode === 'login' ? 'Sign In to Zuba' : 'Create Operator Account'}
            </h1>
            <button
              onClick={onViewAbout}
              className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>About</span>
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          {syncError && (
            <div role="alert" className="mb-4 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
              Server connection problem: {syncError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mwelwa Banda"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Email Address
                </label>
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(true)}
                  className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span>Privacy Policy</span>
                </button>
              </div>
              <input
                type="email"
                required
                placeholder="name@domain.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                Your email identifies your account on this server and is not used for marketing.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-pressed={showPassword}
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Hide password' : 'Show password'}</span>
              </button>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Toggle Login / Register */}
          <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-center">
            {mode === 'login' ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                New operator?{' '}
                <button
                  onClick={() => {
                    setMode('register');
                    setErrorMsg(null);
                  }}
                  className="font-semibold text-neutral-900 dark:text-neutral-100 hover:underline cursor-pointer"
                >
                  Create an account
                </button>
              </p>
            ) : (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Already registered?{' '}
                <button
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                  }}
                  className="font-semibold text-neutral-900 dark:text-neutral-100 hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer Data Handling & Policy button */}
        <div className="mt-5 text-center">
          <button
            onClick={() => setShowPolicyModal(true)}
            className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            <span>Email & Data Handling Policy</span>
          </button>
        </div>
      </div>

      {/* Email & Data Handling Policy Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 max-w-lg w-full max-h-[88vh] overflow-y-auto overscroll-contain p-6 sm:p-7 shadow-xl space-y-5 text-neutral-900 dark:text-neutral-100">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Email & Data Handling Policy
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    How Zuba protects your email address and solar operational data
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPolicyModal(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg cursor-pointer"
                aria-label="Close policy"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Policy Points */}
            <div className="space-y-4 text-xs sm:text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-300">
              {/* Point 1: Email Privacy */}
              <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300">
                  <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>1. Strict Email Protection & Zero Spam</span>
                </div>
                <p className="text-neutral-600 dark:text-neutral-300 text-xs pl-6">
                  Your email address is strictly used to identify your session and operator profile. We will <strong>never</strong> send promotional spam, newsletters, or third-party marketing emails. We never sell, lease, or distribute your email address to data brokers, advertisers, or outside companies.
                </p>
              </div>

              {/* Point 2: Shared SQL storage */}
              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800/60 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-neutral-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>2. Shared Database & Account Privacy</span>
                </div>
                <p className="text-neutral-600 dark:text-neutral-300 text-xs pl-6">
                  Solar systems, meter logs, maintenance tasks, and operator accounts are stored in the server's shared SQLite database. Each operator can access only their own records; the administrator can manage platform accounts and systems.
                </p>
              </div>

              {/* Point 3: Zero Trackers */}
              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800/60 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-neutral-100">
                  <EyeOff className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>3. No Third-Party Tracking or Telemetry</span>
                </div>
                <p className="text-neutral-600 dark:text-neutral-300 text-xs pl-6">
                  Zuba operates with zero behavioral tracking pixels, zero analytics cookies, and zero profiling beacons. Your solar generation numbers, building load metrics, and login hours are never surveilled or reported to third parties.
                </p>
              </div>

              {/* Point 4: Full User Control & Erasure */}
              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800/60 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-neutral-100">
                  <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>4. Complete User Control & Instant Data Erasure</span>
                </div>
                <p className="text-neutral-600 dark:text-neutral-300 text-xs pl-6">
                  Operational data is stored in the shared server database and scoped to your account. Clearing browser data does not delete server records; contact the platform administrator to request account or data removal.
                </p>
              </div>

              {/* Legal Reference */}
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 pt-1">
                Policy aligned with the Zambia Data Protection Act No. 3 of 2021 and international privacy-by-design standards.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
              <button
                onClick={() => setShowPolicyModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                I Understand & Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
