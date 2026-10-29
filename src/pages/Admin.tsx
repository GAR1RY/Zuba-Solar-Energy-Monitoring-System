import React, { useState } from 'react';
import { Users, Sun, Activity, UserX, UserCheck, Trash2, CircleDollarSign } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Admin: React.FC = () => {
  const { currentUser, allUsers, systems, toggleUserStatus, deleteUser, weather, settings, updateSettings } = useApp();
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [tariffInput, setTariffInput] = useState(String(settings.tariffZmw));
  const [tariffMessage, setTariffMessage] = useState<string | null>(null);

  const classCounts = {
    Residential: systems.filter((s) => s.systemClass === 'Residential').length,
    Commercial: systems.filter((s) => s.systemClass === 'Commercial').length,
    Industrial: systems.filter((s) => s.systemClass === 'Industrial').length,
  };

  const totalSolars = systems.reduce((acc, s) => acc + s.panelCount, 0);

  if (currentUser?.role !== 'admin') {
    return (
      <div role="alert" className="max-w-2xl mx-auto p-5 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-sm text-red-800 dark:text-red-200">
        Administrator access is required to view this page.
      </div>
    );
  }

  const handleSaveTariff = async (event: React.FormEvent) => {
    event.preventDefault();
    const tariff = Number(tariffInput);
    if (!Number.isFinite(tariff) || tariff < 0 || tariff > 1000) {
      setTariffMessage('Enter a tariff between K0 and K1,000 per kWh.');
      return;
    }
    const saved = await updateSettings({ tariffZmw: tariff });
    setTariffMessage(
      saved
        ? 'Tariff updated. Savings estimates now use this rate.'
        : 'Could not save the tariff. Please try again.'
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Platform Governance
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Administrator console for system-wide solar spaces, active operators, and platform health
        </p>
      </div>

      {/* High-level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium">
            <span>Registered Operators</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums mt-2">
            {allUsers.length}
          </div>
          <div className="text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums mt-1">
            {allUsers.filter((u) => u.isActive).length} active accounts
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium">
            <span>Total Installed Solars</span>
            <Sun className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums mt-2">
            {totalSolars}
          </div>
          <div className="text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums mt-1">
            Across {systems.length} solar installation{systems.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium">
            <span>Weather Telemetry</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums mt-2 capitalize">
            {weather ? weather.source : 'Nominal'}
          </div>
          <div className="text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums mt-1">
            Active atmospheric station: {weather?.city || 'Lusaka'}
          </div>
        </div>
      </div>

      {/* Systems Breakdown by Space Category */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-5 sm:p-6 shadow-xs">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
          Installed Systems by Space Category
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
          Breakdown of registered solar installations
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(classCounts).map(([tierName, count]) => (
            <div
              key={tierName}
              className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/50 dark:border-neutral-800/50"
            >
              <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{tierName}</div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums mt-1">
                {count}
              </div>
              <div className="text-[11px] text-neutral-400 tabular-nums mt-0.5">
                {tierName === 'Residential' && '1 – 8 Solars'}
                {tierName === 'Commercial' && '9 – 24 Solars'}
                {tierName === 'Industrial' && '25+ Solars'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform-wide energy tariff */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-5 sm:p-6 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <CircleDollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Energy Tariff
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Set the ZMW cost per kWh used for the dashboard and AI savings estimates.
            </p>
          </div>
        </div>
        <form onSubmit={handleSaveTariff} className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3">
          <label className="block flex-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Tariff (ZMW per kWh)
            <div className="mt-1 flex items-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 focus-within:ring-1 focus-within:ring-amber-500">
              <span className="pl-3 text-xs text-neutral-500">K</span>
              <input
                type="number"
                min="0"
                max="1000"
                step="0.01"
                required
                value={tariffInput}
                onChange={(event) => {
                  setTariffInput(event.target.value);
                  setTariffMessage(null);
                }}
                className="w-full px-2.5 py-2 text-xs bg-transparent text-neutral-900 dark:text-neutral-100 focus:outline-none tabular-nums"
              />
            </div>
          </label>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
          >
            Save tariff
          </button>
        </form>
        {tariffMessage && (
          <p role="status" className={`mt-3 text-xs ${tariffMessage.startsWith('Enter') ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
            {tariffMessage}
          </p>
        )}
        <p className="mt-3 text-[11px] text-neutral-400 dark:text-neutral-500">
          This setting is saved in this browser and is used by its savings estimates.
        </p>
      </div>

      {/* User Management Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-200/80 dark:border-neutral-800/80">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Registered Operators Directory
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Manage user authorization and activate/deactivate accounts
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200/60 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-800/30 text-neutral-500 dark:text-neutral-400">
                <th className="py-3 px-4 font-semibold">User</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold">Assigned Systems</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Registered</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/40 dark:divide-neutral-800/40 tabular-nums">
              {allUsers.map((u) => {
                const userSystemsCount = systems.filter((s) => s.userId === u.id).length;
                const isAdmin = u.role === 'admin';
                return (
                  <tr key={u.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-neutral-900 dark:text-neutral-100">{u.name}</div>
                      <div className="text-[11px] text-neutral-400">{u.email}</div>
                    </td>
                    <td className="py-3 px-4 font-medium capitalize">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ${
                          isAdmin
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-700 dark:text-neutral-300">
                      {userSystemsCount} installation{userSystemsCount === 1 ? '' : 's'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          u.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-400 text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!isAdmin && (
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => toggleUserStatus(u.id)}
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            title={u.isActive ? 'Deactivate account' : 'Activate account'}
                          >
                            {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4 text-emerald-600" />}
                          </button>
                          {userToDelete === u.id ? (
                            <div className="inline-flex items-center gap-1 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 px-2 py-0.5 rounded-lg animate-in fade-in duration-150">
                              <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">
                                Delete?
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  deleteUser(u.id);
                                  setUserToDelete(null);
                                }}
                                className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-600 text-white hover:bg-red-700 active:scale-95 transition-all"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setUserToDelete(null)}
                                className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600 active:scale-95 transition-all"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setUserToDelete(u.id)}
                              className="p-1.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
