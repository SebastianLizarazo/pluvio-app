import { useMemo } from 'react';

import { useUserMeasurements } from '@/hooks/useUserMeasurements';

type MonthBucket = {
  key: string;
  label: string;
  totalMm: number;
};

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const useAnalytics = (year: number, dryThreshold = 60) => {
  const { data: measurements = [] } = useUserMeasurements();

  return useMemo(() => {
    const inYear = measurements.filter((item) => new Date(item.measuredAt).getUTCFullYear() === year);

    const dailyMap = new Map<number, number>();
    inYear.forEach((item) => {
      const dayOfYear = Math.floor(
        (Date.UTC(
          new Date(item.measuredAt).getUTCFullYear(),
          new Date(item.measuredAt).getUTCMonth(),
          new Date(item.measuredAt).getUTCDate(),
        ) -
          Date.UTC(new Date(item.measuredAt).getUTCFullYear(), 0, 0)) /
          86400000,
      );

      dailyMap.set(dayOfYear, (dailyMap.get(dayOfYear) ?? 0) + item.rainfallMm);
    });

    const dailySeries = Array.from({ length: 366 }, (_, i) => ({
      day: i + 1,
      mm: Number((dailyMap.get(i + 1) ?? 0).toFixed(2)),
    }));

    const monthTotals = Array.from({ length: 12 }, (_, i): MonthBucket => ({
      key: `${year}-${i + 1}`,
      label: MONTH_LABELS[i],
      totalMm: 0,
    }));

    inYear.forEach((item) => {
      const month = new Date(item.measuredAt).getUTCMonth();
      monthTotals[month].totalMm += item.rainfallMm;
    });

    const monthTotalsRounded = monthTotals.map((m) => ({ ...m, totalMm: Number(m.totalMm.toFixed(2)) }));

    const topWet = [...monthTotalsRounded].sort((a, b) => b.totalMm - a.totalMm).slice(0, 3);
    const topDry = [...monthTotalsRounded].sort((a, b) => a.totalMm - b.totalMm).slice(0, 3);

    const wetSeason = monthTotalsRounded.filter((m) => m.totalMm >= dryThreshold).map((m) => m.label);
    const drySeason = monthTotalsRounded.filter((m) => m.totalMm < dryThreshold).map((m) => m.label);

    const maxRainDay = dailySeries.reduce(
      (acc, item) => (item.mm > acc.mm ? item : acc),
      { day: 1, mm: 0 },
    );

    const daysWithRain = new Set(
      inYear
        .filter((item) => item.rainfallMm > 0)
        .map((item) => new Date(item.measuredAt).toISOString().slice(0, 10)),
    );

    let bestDryStreak = 0;
    let currentStreak = 0;
    for (let day = 1; day <= 366; day += 1) {
      const date = new Date(Date.UTC(year, 0, day));
      const key = date.toISOString().slice(0, 10);

      if (daysWithRain.has(key)) {
        currentStreak = 0;
      } else {
        currentStreak += 1;
      }

      if (currentStreak > bestDryStreak) {
        bestDryStreak = currentStreak;
      }
    }

    return {
      dailySeries,
      monthTotals: monthTotalsRounded,
      topWet,
      topDry,
      wetSeason,
      drySeason,
      maxRainDay,
      bestDryStreak,
    };
  }, [dryThreshold, measurements, year]);
};
