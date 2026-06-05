export const TANK_DIAMETER_CM = 112.84; // ~1m² area: 2 * sqrt(10000cm²/π) = 112.84cm

export const getArea = (diameterCm: number): number => {
  return Math.PI * Math.pow(diameterCm / 2, 2);
};

export const calcRainfallMm = (volumeMl: number, diameterCm: number): number => {
  return volumeMl / getArea(diameterCm);
};

export const mmToLiters = (mm: number, diameterCm: number): number => {
  // Formula: mm * area_cm2 / 10000 = liters
  // (since 1mm over 1m² = 1 liter, and 1m² = 10000cm²)
  return (mm * getArea(diameterCm)) / 10000;
};

export const elapsedMinutes = (prev: Date, current: Date): number => {
  return Math.round((current.getTime() - prev.getTime()) / 60000);
};
