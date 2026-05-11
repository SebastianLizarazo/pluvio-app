export const getArea = (diameterCm: number): number => {
  return Math.PI * Math.pow(diameterCm / 2, 2);
};

export const calcRainfallMm = (volumeMl: number, diameterCm: number): number => {
  return volumeMl / getArea(diameterCm);
};

export const mmToLiters = (mm: number, diameterCm: number): number => {
  return (mm * getArea(diameterCm)) / 1000;
};

export const elapsedMinutes = (prev: Date, current: Date): number => {
  return Math.round((current.getTime() - prev.getTime()) / 60000);
};
