import { MeterLog, Reading, SolarSystem, WeatherSnapshot } from '../types';

export interface ZubaSystemContext {
  system: SolarSystem | null;
  reading: Reading | null;
  weather: WeatherSnapshot | null;
  meterLogs: MeterLog[];
  tariffZmw?: number;
}

/**
 * Dedicated Custom AI Intelligence Engine for Zuba Solar System.
 * Parses natural questions in plain English and returns direct, concise,
 * strictly system-grounded answers without using any external LLMs.
 */
export function askZubaSolarAI(question: string, context: ZubaSystemContext): string {
  const { system, reading, weather, meterLogs, tariffZmw = 2.5 } = context;

  if (!system) {
    return 'No solar system is currently configured. Please add your solar installation in the Systems tab first.';
  }

  const q = question.trim().toLowerCase();

  // 1. Battery charge duration / when will battery be full
  if (
    q.includes('battery') &&
    (q.includes('charge') || q.includes('full') || q.includes('how long') || q.includes('when') || q.includes('time') || q.includes('100%'))
  ) {
    if (!reading) {
      return `Your ${system.batteryCapacityKwh} kWh battery is connected, but live readings are still loading.`;
    }

    const currentPercent = reading.batteryPercent;
    const capacity = system.batteryCapacityKwh || 10;

    if (currentPercent >= 99.5) {
      return `Your battery is currently 100% full (${capacity} kWh). All current solar power is directly supplying your building loads and exporting surplus to the grid.`;
    }

    const neededKwh = Number((capacity * (1 - currentPercent / 100)).toFixed(2));
    const netChargingKw = Number((reading.generationKw - reading.consumptionKw).toFixed(2));

    if (netChargingKw <= 0.05) {
      return `Your battery is at ${currentPercent}% and needs ${neededKwh} kWh to reach 100%. Right now, it is not charging because building consumption (${reading.consumptionKw} kW) matches or exceeds solar production (${reading.generationKw} kW). It will resume charging once solar generation rises above your building demand.`;
    }

    const hoursToFull = neededKwh / netChargingKw;
    const totalMinutes = Math.round(hoursToFull * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const durationStr = hrs > 0 ? `${hrs} hour${hrs > 1 ? 's' : ''} ${mins} min` : `${mins} minutes`;

    const completionDate = new Date(Date.now() + totalMinutes * 60 * 1000);
    const completionTimeStr = completionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `At current net charging power of ${netChargingKw} kW, your battery (currently at ${currentPercent}%) will take approximately ${durationStr} to reach 100% full, arriving at full charge at around ${completionTimeStr}.`;
  }

  // 2. Battery percentage or status
  if (q.includes('battery') && (q.includes('level') || q.includes('percentage') || q.includes('status') || q.includes('how much'))) {
    if (!reading) return `Battery capacity is ${system.batteryCapacityKwh} kWh.`;
    const storedKwh = ((system.batteryCapacityKwh * reading.batteryPercent) / 100).toFixed(1);
    return `Your battery is at ${reading.batteryPercent}% (${storedKwh} kWh stored out of ${system.batteryCapacityKwh} kWh total capacity).`;
  }

  // 3. Sunset daily log & real meter history
  if (
    q.includes('sunset') ||
    q.includes('log') ||
    q.includes('meter') ||
    q.includes('difference') ||
    q.includes('history') ||
    q.includes('balance') ||
    (q.includes('generate') && (q.includes('day') || q.includes('today') || q.includes('yesterday')))
  ) {
    if (meterLogs.length === 0) {
      return `No sunset meter logs have been recorded yet for ${system.name}. Record your single daily log right before sunset in the Meter History tab to track total daylight production, consumption, and night battery reserve.`;
    }

    const latest = meterLogs[0];
    const total = latest.totalDayGenerationKwh !== undefined ? latest.totalDayGenerationKwh : ((latest.morningReadingKwh || 0) + (latest.daytimeReadingKwh || 0));
    const consumed = latest.energyConsumedKwh || 0;
    const eveningLeft = latest.eveningRemainingKwh !== undefined ? latest.eveningRemainingKwh : 0;
    const net = Number((total - consumed).toFixed(1));

    return `According to your sunset meter log for ${latest.date}:
• Total Solar Produced (Dawn to Sunset): ${total.toFixed(1)} kWh
• Total Consumed by Loads: ${consumed.toFixed(1)} kWh
• Net Energy Balance: ${net >= 0 ? `+${net}` : net} kWh (${net >= 0 ? 'Surplus' : 'Deficit'})
• Battery Storage Left for Night: ${eveningLeft.toFixed(1)} kWh in battery bank.`;
  }

  // 4. Night / Evening energy left & night endurance
  if (q.includes('night') || q.includes('evening') || q.includes('left') || q.includes('last through')) {
    if (meterLogs.length > 0) {
      const latest = meterLogs[0];
      const eveningLeft = latest.eveningRemainingKwh !== undefined ? latest.eveningRemainingKwh : 0;
      const avgNightLoad = Math.max(0.3, system.panelCount * 0.04);
      const hoursBackup = (eveningLeft / avgNightLoad).toFixed(1);

      return `Based on your latest meter log, you had ${eveningLeft.toFixed(1)} kWh left in storage at the end of the evening. At typical night demand, this gives you approximately ${hoursBackup} hours of power, which is ${Number(hoursBackup) >= 10 ? 'sufficient to comfortably last through the night' : 'low, so consider minimizing heavy night loads'}.`;
    }

    if (reading) {
      const stored = ((system.batteryCapacityKwh * reading.batteryPercent) / 100).toFixed(1);
      return `Your battery currently holds ${stored} kWh (${reading.batteryPercent}%). At typical evening demand, this provides roughly ${((parseFloat(stored) / 0.4)).toFixed(0)} hours of night backup power.`;
    }

    return `Your system has a ${system.batteryCapacityKwh} kWh battery bank. Record your evening readings in Meter History to get exact night endurance predictions.`;
  }

  // 5. Current solar generation / output
  if (q.includes('generating') || q.includes('current power') || q.includes('producing') || q.includes('output') || q.includes('now')) {
    if (!reading) return 'Live power reading is currently synchronizing.';
    const ratedKw = ((system.panelCount * (system.panelWattage || 450)) / 1000).toFixed(1);
    return `Your solar array (${system.panelCount} Solars) is currently producing ${reading.generationKw} kW out of ${ratedKw} kW rated peak capacity. Building consumption is ${reading.consumptionKw} kW.`;
  }

  // 6. Savings / Kwacha / ZMW
  if (q.includes('saving') || q.includes('money') || q.includes('kwacha') || q.includes('zmw') || q.includes('cost') || q.includes('value')) {
    const ratedKw = (system.panelCount * (system.panelWattage || 450)) / 1000;
    const estDailyKwh = ratedKw * 5.8 * 0.85 * (system.correctionFactor || 1);
    const dailyZmw = (estDailyKwh * tariffZmw).toFixed(2);
    const monthlyZmw = (parseFloat(dailyZmw) * 30).toFixed(2);

    return `At the current tariff rate of K${tariffZmw.toFixed(2)} per kWh:
• Daily estimated savings: K${dailyZmw} ZMW
• Monthly estimated savings: ~K${monthlyZmw} ZMW
Based on an average daily yield of ~${estDailyKwh.toFixed(1)} kWh.`;
  }

  // 7. Weather & sunlight impact
  if (q.includes('weather') || q.includes('sun') || q.includes('cloud') || q.includes('rain') || q.includes('temperature')) {
    const temp = weather ? weather.temperatureC : 26;
    const clouds = weather ? weather.cloudCover : 20;
    const desc = weather ? weather.description : 'Sunny';
    const city = weather ? weather.city : system.city;

    return `Current weather in ${city} is ${temp}°C with ${clouds}% cloud coverage (${desc}). Peak sunlight in Zambia averages 5.8 Peak Sun Hours daily, with strongest generation between 10:00 and 15:00.`;
  }

  // 8. System specifications / panels / solars
  if (q.includes('system') || q.includes('solar') || q.includes('panel') || q.includes('size') || q.includes('capacity')) {
    const ratedKw = ((system.panelCount * (system.panelWattage || 450)) / 1000).toFixed(1);
    return `System Profile for ${system.name}:
• Number of Solars: ${system.panelCount} Solars (${system.systemClass} Space)
• Total Solar Capacity: ${ratedKw} kWp (${system.panelWattage || 450}W per solar)
• Battery Storage Bank: ${system.batteryCapacityKwh} kWh
• Location: ${system.city}
• System Calibration Factor: ${system.correctionFactor.toFixed(4)}`;
  }

  // 9. Can I run appliances / loads
  if (q.includes('can i') || q.includes('run') || q.includes('pump') || q.includes('fridge') || q.includes('load') || q.includes('appliance')) {
    if (!reading) return 'Checking system status. Ensure solar production exceeds load before turning on heavy appliances.';
    const surplus = reading.generationKw - reading.consumptionKw;

    if (surplus > 1.0) {
      return `Yes. You currently have a healthy solar surplus of +${surplus.toFixed(2)} kW above your building demand. It is a good time to run appliances or water pumps while daylight is strong.`;
    } else if (surplus > 0) {
      return `You have a small solar surplus of +${surplus.toFixed(2)} kW. Moderate appliances are fine, but heavy heating or pumping loads may draw from your battery.`;
    } else {
      return `Current load (${reading.consumptionKw} kW) already exceeds solar production (${reading.generationKw} kW) by ${Math.abs(surplus).toFixed(2)} kW. Running additional heavy appliances will discharge your battery.`;
    }
  }

  // General fallback: Concise, clear plain-English overview
  const genKw = reading ? reading.generationKw : 0;
  const loadKw = reading ? reading.consumptionKw : 0;
  const batt = reading ? reading.batteryPercent : 0;

  return `Here is your quick Zuba system summary:
• Solar Production: ${genKw} kW (${system.panelCount} Solars)
• Building Load: ${loadKw} kW
• Battery: ${batt}% of ${system.batteryCapacityKwh} kWh
You can ask me specific questions like:
- "How long until the battery is 100% full?"
- "What was our total generation in our latest sunset log?"
- "Will our battery reserve last through the night?"
- "How much money am I saving today in Kwacha?"`;
}
