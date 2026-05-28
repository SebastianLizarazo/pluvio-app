import { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import { useAnalytics } from '@/hooks/useAnalytics';
import { ANALYTICS_DEFAULTS } from '@/constants/app';
import { toIsoDate } from '@/utils/date';
import type { Measurement } from '@/types/domain';

const COLORS = {
  primary: '#1B3A6B',
  chartBlue: '#2E5FA3',
  green: '#2DB87B',
  grayLight: '#F5F5F5',
  textPrimary: '#1A1A1A',
  textSecondary: '#888888',
  textTertiary: '#2DB87B',
  white: '#FFFFFF',
};

const MONTH_FULL_LABELS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEKDAY_LABELS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

export function HistorialCalendar() {
  const now = new Date();
  const [navYear, setNavYear] = useState(now.getFullYear());
  const [navMonth, setNavMonth] = useState(now.getMonth());

  const { monthTotals, dailySeries } = useAnalytics(navYear, ANALYTICS_DEFAULTS.drySeasonThresholdMm);

  const monthTotalMm = monthTotals[navMonth]?.totalMm ?? 0;

  const { daysWithRainInMonth, avgMmPerDayInMonth, maxDayInMonth } = useMemo(() => {
    const daysInMonth = new Date(navYear, navMonth + 1, 0).getDate();
    const startDayOfYear = Math.floor((new Date(navYear, navMonth, 1).getTime() - new Date(navYear, 0, 0).getTime()) / 86400000);

    const dayMap = new Map<number, number>();
    dailySeries.forEach((d, i) => {
      const dayOfYear = i + 1;
      if (dayOfYear > startDayOfYear && dayOfYear <= startDayOfYear + daysInMonth) {
        dayMap.set(dayOfYear, d.mm);
      }
    });

    const count = Array.from(dayMap.values()).filter((v) => v > 0).length;
    const sum = Array.from(dayMap.values()).reduce((a, b) => a + b, 0);
    const avg = count > 0 ? sum / count : 0;
    let max = { mm: 0, day: 0 };
    dayMap.forEach((mm, day) => {
      if (mm > max.mm) {
        max = { mm, day };
      }
    });

    return { daysWithRainInMonth: count, avgMmPerDayInMonth: avg, maxDayInMonth: max };
  }, [dailySeries, navMonth, navYear]);

  const maxDayInMonthDateStr = useMemo(() => {
    if (maxDayInMonth.day <= 0 || maxDayInMonth.mm <= 0) return 'N/A';
    const startDayOfYear = Math.floor((new Date(navYear, navMonth, 1).getTime() - new Date(navYear, 0, 0).getTime()) / 86400000);
    const actualDay = maxDayInMonth.day - startDayOfYear;
    if (actualDay < 1 || actualDay > 31) return 'N/A';
    const date = new Date(navYear, navMonth, actualDay);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  }, [navYear, navMonth, maxDayInMonth]);

  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(navYear, navMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(navYear, navMonth, 1).getDay();
    const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const startDayOfYear = Math.floor((new Date(navYear, navMonth, 1).getTime() - new Date(navYear, 0, 0).getTime()) / 86400000);

    const cells: Array<{ day: number | null; mm: number; isToday: boolean }> = [];

    for (let i = 0; i < adjustedFirstDay; i++) {
      cells.push({ day: null, mm: 0, isToday: false });
    }

    const todayIso = toIsoDate(now);

    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfYear = startDayOfYear + d;
      const mm = dailySeries[dayOfYear - 1]?.mm ?? 0;
      const dateIso = toIsoDate(new Date(navYear, navMonth, d));
      const isToday = dateIso === todayIso;
      cells.push({ day: d, mm, isToday });
    }

    return cells;
  }, [dailySeries, navMonth, navYear, now]);

  const getCellColor = (mm: number) => {
    if (mm === 0) return '#E0E0E0';
    if (mm < 10) return '#90CAF9';
    if (mm <= 20) return '#2E5FA3';
    return '#1B3A6B';
  };

  const renderRainDrops = (mm: number) => {
    if (mm === 0) {
      // Empty drop
      return (
        <View style={styles.dropsContainer}>
          <Ionicons name="water-outline" size={14} color={COLORS.textSecondary} />
        </View>
      );
    }
    if (mm < 10) {
      // Light rain - 1 drop
      return (
        <View style={styles.dropsContainer}>
          <Ionicons name="water" size={10} color={COLORS.chartBlue} />
        </View>
      );
    }
    if (mm <= 20) {
      // Moderate rain - 2 drops
      return (
        <View style={styles.dropsContainer}>
          <Ionicons name="water" size={10} color={COLORS.chartBlue} />
          <Ionicons name="water" size={10} color={COLORS.chartBlue} style={{ marginLeft: -4 }} />
        </View>
      );
    }
    // Heavy rain - 3 drops
    return (
      <View style={styles.dropsContainer}>
        <Ionicons name="water" size={10} color={COLORS.chartBlue} />
        <Ionicons name="water" size={10} color={COLORS.chartBlue} style={{ marginLeft: -4 }} />
        <Ionicons name="water" size={10} color={COLORS.chartBlue} style={{ marginLeft: -4 }} />
      </View>
    );
  };

  const navigateMonth = (delta: number) => {
    let m = navMonth + delta;
    let y = navYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setNavMonth(m);
    setNavYear(y);
  };

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.monthNavBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.monthNavTitle}>{MONTH_FULL_LABELS[navMonth]} {navYear}</Text>
        <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.monthNavBtn}>
          <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.monthMetricCard}>
        <Text style={styles.monthMetricLabel}>TOTAL MENSUAL</Text>
        <Text style={styles.monthMetricValue}>{monthTotalMm.toFixed(1)} mm</Text>
      </View>

      <View style={styles.calendarGrid}>
        {WEEKDAY_LABELS.map((d) => (
          <View key={d} style={styles.calendarWeekdayCell}>
            <Text style={styles.calendarWeekdayText}>{d}</Text>
          </View>
        ))}
        {calendarDays.map((cell, i) => (
          <View
            key={i}
            style={[
              styles.calendarCell,
              cell.isToday && styles.calendarCellToday,
              cell.day === null && styles.calendarCellEmpty,
            ]}
          >
            {cell.day !== null && (
              <>
                <Text style={[styles.calendarDayNum, cell.isToday && styles.calendarDayNumToday]}>
                  {cell.day}
                </Text>
                <View style={{ flex: 1 }} />
                {renderRainDrops(cell.mm)}
              </>
            )}
          </View>
        ))}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={styles.legendDropsContainer}>
            <Ionicons name="water" size={12} color={COLORS.chartBlue} />
            <Ionicons name="water" size={12} color={COLORS.chartBlue} style={{ marginLeft: -4 }} />
            <Ionicons name="water" size={12} color={COLORS.chartBlue} style={{ marginLeft: -4 }} />
          </View>
          <Text style={styles.legendText}>Lluvia Intensa ({'>'}20mm)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendDropsContainer}>
            <Ionicons name="water" size={12} color={COLORS.chartBlue} />
            <Ionicons name="water" size={12} color={COLORS.chartBlue} style={{ marginLeft: -4 }} />
          </View>
          <Text style={styles.legendText}>Moderada (10-20mm)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendDropsContainer}>
            <Ionicons name="water" size={12} color={COLORS.chartBlue} />
          </View>
          <Text style={styles.legendText}>Ligera ({'<'}10mm)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendDropsContainer}>
            <Ionicons name="water-outline" size={12} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.legendText}>Sin lluvia (0mm)</Text>
        </View>
      </View>

      <View style={styles.monthStatsRow}>
        <Card style={[styles.monthStatCard, { backgroundColor: COLORS.grayLight }]}>
          <Card.Content>
            <Text style={[styles.monthStatLabel, { color: COLORS.textTertiary }]}>DÍAS CON LLUVIA</Text>
            <Text style={styles.monthStatValue}>{daysWithRainInMonth}</Text>
          </Card.Content>
        </Card>
        <Card style={[styles.monthStatCard, { backgroundColor: COLORS.grayLight }]}>
          <Card.Content>
            <Text style={styles.monthStatLabel}>PROMEDIO/DÍA</Text>
            <Text style={styles.monthStatValue}>{avgMmPerDayInMonth.toFixed(1)} mm</Text>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.recordCard}>
        <Text style={styles.recordLabel}>RÉCORD DIARIO</Text>
        <Text style={styles.recordValue}>{maxDayInMonth.mm.toFixed(1)} mm</Text>
        <View style={styles.recordRow}>
          <Ionicons name="rainy" size={16} color={COLORS.white} />
          <Text style={styles.recordDate}>{maxDayInMonthDateStr}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calendarContainer: { gap: 16 },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthNavBtn: {
    padding: 8,
  },
  monthNavTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  monthMetricCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  monthMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    opacity: 0.8,
    letterSpacing: 1,
  },
  monthMetricValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 4,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
    padding: 8,
    gap: 4,
  },
  calendarWeekdayCell: {
    width: `${(100 - 2) / 7}%`,
    alignItems: 'center',
    paddingVertical: 4,
  },
  calendarWeekdayText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  calendarCell: {
    width: `${(100 - 2) / 7}%`,
    aspectRatio: 1,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  calendarCellToday: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  calendarCellEmpty: {
    backgroundColor: 'transparent',
  },
  calendarDayNum: {
    fontSize: 10,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  calendarDayNumToday: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  calendarMm: {
    fontSize: 8,
    fontWeight: '600',
  },
  dropsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  calendarCellDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  legendDropsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: -4,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  monthStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  monthStatCard: {
    flex: 1,
    borderRadius: 12,
  },
  monthStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  monthStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  recordCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  recordLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    opacity: 0.8,
    letterSpacing: 1,
  },
  recordValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    marginVertical: 4,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordDate: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.9,
  },
});