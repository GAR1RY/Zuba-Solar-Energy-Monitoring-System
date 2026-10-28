import { SystemClass } from '../types';

/**
 * Classify system by the number of solars (solar panels):
 * - Residential: 1 to 8 solars
 * - Commercial: 9 to 24 solars
 * - Industrial: 25+ solars
 */
export function inferSystemClass(solarCount: number): SystemClass {
  if (solarCount <= 8) {
    return 'Residential';
  } else if (solarCount <= 24) {
    return 'Commercial';
  } else {
    return 'Industrial';
  }
}

/**
 * Zuba Photovoltaic Prediction Equation:
 * E_predicted = (N_panels * W_panel / 1000) * 5.8 PSH * cloud_factor * temp_derate * correction_factor
 * cloud_factor = max(0.22, 1 - (clouds% / 100) * 0.78)
 * temp_derate = 1 - (T_amb - 25) * 0.004 (applied only when T_amb > 25 °C)
 */
export function calculateExpectedDailyKwh(
  panelCount: number,
  panelWattage: number = 450,
  cloudCoverPercent: number = 20,
  temperatureC: number = 26,
  correctionFactor: number = 1.0,
  peakSunHours: number = 5.8
): number {
  const ratedKwp = (panelCount * (panelWattage || 450)) / 1000.0;
  const cloudFactor = Math.max(0.22, 1.0 - (cloudCoverPercent / 100.0) * 0.78);

  let tempDerate = 1.0;
  if (temperatureC > 25.0) {
    tempDerate = Math.max(0.60, 1.0 - (temperatureC - 25.0) * 0.004);
  }

  const baselineKwh = ratedKwp * peakSunHours * cloudFactor * tempDerate;
  const predicted = baselineKwh * (correctionFactor > 0 ? correctionFactor : 1.0);
  return Number(predicted.toFixed(2));
}

/**
 * Online parameter recalibration step (SGD) against verified meter yield.
 */
export function tuneCorrectionFactor(
  currentFactor: number,
  actualKwh: number,
  predictedKwh: number,
  learningRate: number = 0.15
): number {
  if (predictedKwh <= 0 || actualKwh <= 0) {
    return currentFactor;
  }
  const safeCurrent = currentFactor > 0 ? currentFactor : 1.0;
  const unweighted = predictedKwh / safeCurrent;
  const ratio = actualKwh / unweighted;
  const updated = safeCurrent + learningRate * (ratio - safeCurrent);
  const clamped = Math.max(0.45, Math.min(1.65, updated));
  return Number(clamped.toFixed(4));
}

/**
 * IEC 61724 Standard Photovoltaic Performance Ratio (PR%)
 */
export function calculatePerformanceRatio(actualKwh: number, expectedKwh: number): number {
  if (expectedKwh <= 0) return 0.0;
  const pr = (actualKwh / expectedKwh) * 100.0;
  return Number(Math.max(0.0, Math.min(140.0, pr)).toFixed(1));
}
