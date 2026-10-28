import React from 'react';
import { AlertCircle, CheckCircle2, RotateCcw, Wrench } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Alerts: React.FC = () => {
  const { alerts, maintenanceTasks, toggleMaintenanceTask, resetMaintenanceTask } = useApp();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Maintenance Alerts
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Active notifications for scheduled maintenance tasks that require your attention
        </p>
      </div>

      {/* Alert List */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-neutral-200/80 dark:border-neutral-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Pending & Overdue Maintenance
            </h2>
          </div>
          <span className="text-xs text-neutral-400 tabular-nums">
            {alerts.length} active alert{alerts.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
          {alerts.map((a) => {
            const isOverdue = a.type === 'maintenance_overdue';
            const relatedTask = maintenanceTasks.find((t) => t.id === a.taskId);

            return (
              <div
                key={a.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      isOverdue
                        ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4" />
                  </div>

                  <div>
                    <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {a.message}
                    </div>
                    {relatedTask && (
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Due Date: <span className="font-medium text-neutral-700 dark:text-neutral-300">{relatedTask.dueDate}</span> · Scheduled cycle: every {relatedTask.cycleDays} days
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Action from Alert */}
                {relatedTask && (
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => toggleMaintenanceTask(relatedTask.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                      <span>Mark Done</span>
                    </button>
                    <button
                      onClick={() => resetMaintenanceTask(relatedTask.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      title="Reset cycle for next period"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {alerts.length === 0 && (
            <div className="p-12 text-center text-xs text-neutral-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                All Maintenance Tasks Are Completed
              </div>
              <p className="text-neutral-500 dark:text-neutral-400">
                There are no pending or overdue maintenance items. Alerts will only trigger when maintenance is due or not done.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
