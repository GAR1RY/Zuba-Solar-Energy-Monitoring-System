import React, { useState } from 'react';
import { CheckSquare, Square, RotateCcw, Plus, Calendar, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Maintenance: React.FC = () => {
  const { maintenanceTasks, toggleMaintenanceTask, resetMaintenanceTask, addMaintenanceTask } = useApp();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [cycleDays, setCycleDays] = useState<number>(30);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + cycleDays);
    addMaintenanceTask(taskTitle.trim(), cycleDays, nextDate.toISOString().split('T')[0]);
    setTaskTitle('');
    setCycleDays(30);
    setIsAddOpen(false);
  };

  const getDaysRemaining = (dueDateStr: string): { days: number; isOverdue: boolean } => {
    const today = new Date().toISOString().split('T')[0];
    const diff = Math.ceil((new Date(dueDateStr).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
    return {
      days: Math.abs(diff),
      isOverdue: diff < 0,
    };
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Maintenance Schedule
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Scheduled maintenance checklist that automatically prompts and resets after cycle days are complete
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Scheduled Maintenance Checklist */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-neutral-200/80 dark:border-neutral-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Scheduled Maintenance Checklist
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Check off tasks as you finish them. Reset the cycle once the days are completed to keep your system maintained.
            </p>
          </div>

          <span className="text-xs font-semibold text-neutral-400 tabular-nums">
            {maintenanceTasks.filter((t) => t.isDone).length} of {maintenanceTasks.length} Done
          </span>
        </div>

        <div className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
          {maintenanceTasks.map((t) => {
            const { days, isOverdue } = getDaysRemaining(t.dueDate);
            return (
              <div
                key={t.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <button
                    onClick={() => toggleMaintenanceTask(t.id)}
                    className="mt-0.5 text-neutral-400 hover:text-amber-500 transition-colors focus:outline-none cursor-pointer"
                    aria-label={t.isDone ? 'Mark task incomplete' : 'Mark task complete'}
                  >
                    {t.isDone ? (
                      <CheckSquare className="w-5 h-5 text-amber-500" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>

                  <div>
                    <div
                      className={`text-sm font-semibold ${
                        t.isDone
                          ? 'line-through text-neutral-400 dark:text-neutral-500'
                          : 'text-neutral-900 dark:text-neutral-100'
                      }`}
                    >
                      {t.title}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-neutral-400" />
                        <span>Due: {t.dueDate}</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Resets every {t.cycleDays} days</span>
                      <span aria-hidden="true">·</span>
                      {!t.isDone && isOverdue && (
                        <span className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{days} day{days === 1 ? '' : 's'} overdue</span>
                        </span>
                      )}
                      {!t.isDone && !isOverdue && (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          {days === 0 ? 'Due today' : `${days} day${days === 1 ? '' : 's'} remaining`}
                        </span>
                      )}
                      {t.isDone && (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reset Action */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => resetMaintenanceTask(t.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shadow-xs"
                    title={`Reset and start a fresh ${t.cycleDays}-day cycle`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Cycle</span>
                  </button>
                </div>
              </div>
            );
          })}

          {maintenanceTasks.length === 0 && (
            <div className="p-10 text-center text-xs text-neutral-400">
              No tasks currently on the checklist. Click "+ Add Task" to set up your schedule.
            </div>
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl">
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">
              Add Maintenance Task
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Create a task and choose how many days before it resets
            </p>

            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wash module glass, verify battery terminals"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Reset Cycle (Days)
                </label>
                <select
                  value={cycleDays}
                  onChange={(e) => setCycleDays(parseInt(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value={15}>Every 15 Days</option>
                  <option value={30}>Every 30 Days (Monthly)</option>
                  <option value={45}>Every 45 Days</option>
                  <option value={60}>Every 60 Days (Bi-monthly)</option>
                  <option value={90}>Every 90 Days (Quarterly)</option>
                  <option value={180}>Every 180 Days (Semi-annual)</option>
                  <option value={365}>Every 365 Days (Annual)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
