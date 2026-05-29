import { useMemo } from 'react';

import { useUserMeasurements } from '@/hooks/useUserMeasurements';
import { toIsoDate } from '@/utils/date';

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

    // Map keyed by ISO date string (YYYY-MM-DD) — no timezone/time ambiguity
    const dailyMap = new Map<string, number>();
    inYear.forEach((item) => {
      const key = toIsoDate(new Date(item.measuredAt));
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + item.rainfallMm);
    });

    // Build 366-entry daily series indexed 1..366 alongside ISO dates for reference
    const dailySeries = Array.from({ length: 366 }, (_, i) => {
      const dayIndex = i + 1;
      const date = new Date(Date.UTC(year, 0, dayIndex));
      const key = toIsoDate(date);
      return { day: dayIndex, mm: Number((dailyMap.get(key) ?? 0).toFixed(2)) };
    });

    // Max rain day: find the day (1-366) with highest mm
    const maxRainDay = dailySeries.reduce(
      (acc, item) => (item.mm > acc.mm ? item : acc),
      { day: 1, mm: 0 },
    );

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
