import { Alert, MaintenanceTask, MeterLog, Reading, SolarSystem, WeatherSnapshot } from '../types';

export const storage = {
  // Alert system: ONLY alerts when maintenance tasks have not been completed
  getAlerts(tasks: MaintenanceTask[], userId: string): Alert[] {
    const today = new Date().toISOString().split('T')[0];
    const todayMs = new Date(today).getTime();
    const alerts: Alert[] = [];

    tasks.forEach((task) => {
      if (!task.isDone) {
        const dueMs = new Date(task.dueDate).getTime();
        const diffDays = Math.ceil((dueMs - todayMs) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          alerts.push({
            id: `alt_overdue_${task.id}`,
            userId,
            systemId: task.systemId || undefined,
            taskId: task.id,
            type: 'maintenance_overdue',
            message: `Overdue Maintenance: "${task.title}" has not been performed (${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} past due).`,
            createdAt: new Date().toISOString(),
            isRead: false,
          });
        } else if (diffDays <= 7) {
          alerts.push({
            id: `alt_due_${task.id}`,
            userId,
            systemId: task.systemId || undefined,
            taskId: task.id,
            type: 'maintenance_due',
            message: `Pending Maintenance: "${task.title}" is due ${diffDays === 0 ? 'today' : `in ${diffDays} day${diffDays === 1 ? '' : 's'}`}.`,
            createdAt: new Date().toISOString(),
            isRead: false,
          });
        }
      }
    });

    return alerts;
  },

  computeLiveReading(system: SolarSystem, weather: WeatherSnapshot): Reading {
    const now = new Date();
    const catHour = (now.getUTCHours() + 2 + now.getUTCMinutes() / 60) % 24;
    const ratedKw = (system.panelCount * (system.panelWattage || 450)) / 1000.0;

    let generationKw = 0.0;
    let expectedKw = 0.0;

    if (catHour >= 6.0 && catHour <= 18.0) {
      const altitude = Math.sin(((catHour - 6.0) / 12.0) * Math.PI);
      const cloudFactor = Math.max(0.20, 1.0 - (weather.cloudCover / 100.0) * 0.75);
      const safeFactor = system.correctionFactor > 0 ? system.correctionFactor : 1.0;
      generationKw = Number((ratedKw * altitude * cloudFactor * safeFactor).toFixed(2));
      expectedKw = Number((ratedKw * altitude).toFixed(2));
    }

    const baseLoad = ratedKw * 0.28;
    const loadFluctuation = 0.9 + Math.random() * 0.2;
    const consumptionKw = Number(Math.max(0.25, baseLoad * loadFluctuation).toFixed(2));

    const netPower = generationKw - consumptionKw;
    let batteryPercent = 78.0;
    if (netPower >= 0) {
      batteryPercent = Math.min(100.0, 70.0 + (netPower / (ratedKw || 1)) * 25.0);
    } else {
      batteryPercent = Math.max(22.0, 75.0 - (Math.abs(netPower) / (ratedKw || 1)) * 20.0);
    }

    const gridKw = Number((netPower > 0 ? netPower * 0.4 : netPower * 0.6).toFixed(2));

    return {
      id: `read_${Date.now()}`,
      systemId: system.id,
      timestamp: now.toISOString(),
      generationKw,
      consumptionKw,
      batteryPercent: Number(batteryPercent.toFixed(1)),
      gridKw,
      expectedKw,
    };
  },
};
