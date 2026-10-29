import React from 'react';
import { Shield, Activity, RefreshCw, Clock, Zap, CloudSun, Thermometer, ShieldCheck, Lock, EyeOff, CheckCircle2 } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          About Zuba
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          System purpose, weather duration mechanics, architectural model, and open standards
        </p>
      </div>

      {/* Main Overview Card */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 p-6 sm:p-8 shadow-xs space-y-7 leading-relaxed">
        {/* Section 1: What is Zuba? */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              What is Zuba?
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
            <strong>Zuba</strong> is an open-source, web-based photovoltaic and energy storage monitoring platform.
            Named after the sun, Zuba unifies real-time electrical generation, building loads, battery state-of-charge,
            and atmospheric weather into one calm, restrained interface designed for clarity and precision.
          </p>
        </div>

        {/* Section 2: Regional Energy Context */}
        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Regional Energy Context & Purpose
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 mb-3">
            In Southern Africa and Zambia specifically, the national electrical grid historically relies heavily on centralized hydropower (such as the Kariba Dam and Kafue Gorge). Climate-induced droughts and seasonal water deficits have frequently constrained generation capacity, driving widespread adoption of decentralized rooftop solar arrays, commercial backup installations, and rural mini-grids.
          </p>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
            Without reliable monitoring, system owners often cannot determine whether suboptimal generation stems from module soiling, hardware inverter faults, high-temperature efficiency losses, or simple cloud attenuation. Zuba solves this by providing clear, weather-grounded performance metrics.
          </p>
        </div>

        {/* Section 3: Weather Duration & Solar Generation (iOS-Style, Simple & User-Friendly) */}
        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Weather Duration & Solar Generation
            </h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              iOS Energy Guide
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 mb-4">
            Solar panels do not just depend on brightness—they depend on <strong>how long</strong> conditions last.
            Here is how weather duration directly acts on your energy generation and battery storage:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Card 1: Power vs Duration */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800/60 space-y-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Duration Equals Stored Energy
                </span>
              </div>
              <p className="text-[12px] text-neutral-600 dark:text-neutral-300 leading-normal">
                Power (<span className="font-semibold text-neutral-800 dark:text-neutral-200">kW</span>) is instantaneous speed, but energy (<span className="font-semibold text-neutral-800 dark:text-neutral-200">kWh</span>) is duration multiplied by power. A quick 15-minute burst of bright sun only charges a tiny fraction of your battery, whereas 4 sustained hours of steady sunlight completely refills your storage bank.
              </p>
            </div>

            {/* Card 2: Peak Window */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800/60 space-y-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Zap className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  The 5-Hour Peak Window (10:00 – 15:00)
                </span>
              </div>
              <p className="text-[12px] text-neutral-600 dark:text-neutral-300 leading-normal">
                In Zambia, over 70% of all solar energy arrives during the 5 hours between 10:00 and 15:00 (averaging 5.8 Peak Sun Hours). Clear sky duration during these five midday hours is worth three times more kilowatt-hours than early morning or late afternoon sun.
              </p>
            </div>

            {/* Card 3: Cloud Duration */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800/60 space-y-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <CloudSun className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Passing Cloud vs Sustained Overcast
                </span>
              </div>
              <p className="text-[12px] text-neutral-600 dark:text-neutral-300 leading-normal">
                A brief 10-minute passing cloud is harmless—your battery automatically buffers the temporary dip with under 2% daily loss. But when thick overcast persists for 3 or more continuous hours, solar generation drops to its 22% diffuse floor, signaling the need to conserve battery reserves.
              </p>
            </div>

            {/* Card 4: Heat Duration */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800/60 space-y-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Thermometer className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  High Heat Duration (&gt; 25°C)
                </span>
              </div>
              <p className="text-[12px] text-neutral-600 dark:text-neutral-300 leading-normal">
                Silicon solar cells lose roughly 0.4% efficiency for each degree above 25°C. When a Zambian afternoon sustains 32°C for 4 consecutive hours, modules operate at approximately 3% lower efficiency throughout that entire period. Zuba automatically incorporates this duration into your forecast.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: How the System Works */}
        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-3">
            How the System Works
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800/60">
              <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5">
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                1. Live Energy Tracking
              </div>
              <p className="text-[12px] text-neutral-500 dark:text-neutral-400">
                Measures instantaneous electrical power from solar modules, battery storage percentage, facility load demand, and utility grid transfer.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800/60">
              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5">
                <Activity className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                2. Weather-Derated Model
              </div>
              <p className="text-[12px] text-neutral-500 dark:text-neutral-400">
                Calculates daily expected generation factoring in 5.8 Peak Sun Hours (PSH), cloud attenuation, and silicon thermal derating (&gt;25°C).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800/60">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                3. Online Calibration
              </div>
              <p className="text-[12px] text-neutral-500 dark:text-neutral-400">
                When an operator logs daily physical meter readings, an online stochastic gradient descent step automatically tunes the correction factor (γ).
              </p>
            </div>
          </div>
        </div>

        {/* Section 5: Industry Standards & Classification */}
        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Industry Standards & IEC Compliance
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 mb-3">
            Zuba adheres to common international renewable energy capacity classifications:
          </p>

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400">
                  <th className="py-2 px-3 font-semibold">Space Category</th>
                  <th className="py-2 px-3 font-semibold">Number of Solars</th>
                  <th className="py-2 px-3 font-semibold">Typical Applications</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
                <tr>
                  <td className="py-2 px-3 font-medium">Residential Space</td>
                  <td className="py-2 px-3 font-semibold text-amber-600 dark:text-amber-400">1 to 8 Solars</td>
                  <td className="py-2 px-3">Homes, apartments, domestic backup power</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium">Commercial Space</td>
                  <td className="py-2 px-3 font-semibold text-amber-600 dark:text-amber-400">9 to 24 Solars</td>
                  <td className="py-2 px-3">Shops, retail stores, healthcare clinics, offices, schools</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium">Industrial Space</td>
                  <td className="py-2 px-3 font-semibold text-amber-600 dark:text-amber-400">25+ Solars</td>
                  <td className="py-2 px-3">Manufacturing, agri-processing, warehouses, campuses</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Installation performance is evaluated using the <strong>Performance Ratio (PR)</strong> concept from <strong>IEC 61724</strong> (<em>Photovoltaic System Performance Monitoring</em>), defined as the ratio of actual energy produced to the nominal energy predicted under current environmental irradiance.
          </p>
        </div>

        {/* Section 6: Email & Data Handling Policy */}
        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Email & Data Handling Policy
              </h3>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
              Privacy Protected
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 mb-4">
            Zuba is architected around transparent, local-first data principles. Here is how your email and solar operational data are processed and secured:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Policy Item 1: Email Protection */}
            <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Zero Spam & Strict Email Protection</span>
              </div>
              <p className="text-[12px] text-neutral-600 dark:text-neutral-300 leading-normal">
                Your email is used solely to sign you into your workspace. We never send advertising, promotional newsletters, or unsolicited emails. We never sell, rent, or share operator email addresses with marketing brokers or external organizations.
              </p>
            </div>

            {/* Policy Item 2: Local-First Storage */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800/60 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>On-Device SQLite Database</span>
              </div>
              <p className="text-[12px] text-neutral-600 dark:text-neutral-300 leading-normal">
                Solar system configurations, meter readings, maintenance tasks, and settings are stored in a SQLite database on the computer running Zuba, rather than in browser storage. The database file is kept in <code className="px-1 py-0.2 rounded bg-neutral-200/60 dark:bg-neutral-700/60 font-mono text-[11px]">backend/instance/zuba.db</code>.
              </p>
            </div>

            {/* Policy Item 3: No Tracking */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800/60 space-y-1.5">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-xs">
                <EyeOff className="w-4 h-4 shrink-0" />
                <span>Zero Behavioral Tracking & Telemetry</span>
              </div>
              <p className="text-[12px] text-neutral-600 dark:text-neutral-300 leading-normal">
                No tracking cookies, marketing beacons, or user surveillance scripts are embedded in Zuba. Your electricity production, consumption curves, and operator schedules are completely confidential.
              </p>
            </div>

            {/* Policy Item 4: User Control & Legal Framework */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800/60 space-y-1.5">
              <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 shrink-0 text-amber-500" />
                <span>Total Data Erasure & Compliance</span>
              </div>
              <p className="text-[12px] text-neutral-600 dark:text-neutral-300 leading-normal">
                You can reset or wipe all stored solar accounts, meter logs, and calibration values anytime. Formulated in alignment with the <em>Zambia Data Protection Act No. 3 of 2021</em> and modern privacy-by-design standards.
              </p>
            </div>
          </div>
        </div>

        {/* Section 7: License & Architecture */}
        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-neutral-400" />
            <span>Open Source under the MIT License</span>
          </div>
          <div>
            Built with modern web standards · Offline resilient · Tabular numeric alignment
          </div>
        </div>
      </div>
    </div>
  );
};
