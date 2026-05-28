import { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import { useUserMeasurements } from '@/hooks/useUserMeasurements';
import { useAnalytics } from '@/hooks/useAnalytics';
import { ANALYTICS_DEFAULTS } from '@/constants/app';
import { toIsoDate } from '@/utils/date';
import { MonthBarChart } from './components/MonthBarChart';

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

export function AnualContent() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { monthTotals, maxRainDay } = useAnalytics(selectedYear, ANALYTICS_DEFAULTS.drySeasonThresholdMm);
  const { data: measurements = [] } = useUserMeasurements();

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    measurements.forEach((m) => {
      years.add(new Date(m.measuredAt).getUTCFullYear());
    });
    years.add(currentYear);
    const sorted = Array.from(years).sort((a, b) => a - b);
    return sorted.slice(-3);
  }, [measurements, currentYear]);

  const totalYearMm = useMemo(() => {
    return monthTotals.reduce((acc, m) => acc + m.totalMm, 0);
  }, [monthTotals]);

  const litersPerHa = (totalYearMm * 10000 / 1000000).toFixed(2);

  const daysWithRain = useMemo(() => {
    const days = new Set<string>();
    measurements
      .filter((m) => new Date(m.measuredAt).getUTCFullYear() === selectedYear && m.rainfallMm > 0)
      .forEach((m) => {
        days.add(toIsoDate(new Date(m.measuredAt)));
      });
    return days.size;
  }, [measurements, selectedYear]);

  const topMonth = useMemo(() => {
    return monthTotals.reduce((acc, m) => (m.totalMm > acc.totalMm ? m : acc), monthTotals[0]);
  }, [monthTotals]);

  const topMonthIndex = monthTotals.findIndex((m) => m.key === topMonth.key);
  const topMonthLabel = MONTH_FULL_LABELS[topMonthIndex] ?? topMonth.label;

  const avgMmPerDay = daysWithRain > 0 ? totalYearMm / daysWithRain : 0;

  const maxRainDayDateStr = useMemo(() => {
    if (maxRainDay.day <= 0 || maxRainDay.mm <= 0) return 'N/A';
    const date = new Date(Date.UTC(selectedYear, 0, maxRainDay.day));
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  }, [selectedYear, maxRainDay]);

  const prevYearAnalytics = useAnalytics(selectedYear - 1, ANALYTICS_DEFAULTS.drySeasonThresholdMm);
  const prevYearTotal = useMemo(() => {
    return prevYearAnalytics.monthTotals.reduce((acc, m) => acc + m.totalMm, 0);
  }, [prevYearAnalytics]);

  const pctChange = prevYearTotal > 0 ? ((totalYearMm - prevYearTotal) / prevYearTotal) * 100 : 0;

  const rainPct = (() => {
    const isLeapYear = (selectedYear % 4 === 0 && selectedYear % 100 !== 0) || selectedYear % 400 === 0;
    const daysInYear = isLeapYear ? 366 : 365;
    return ((daysWithRain / daysInYear) * 100).toFixed(1);
  })();

  return (
    <ScrollView style={styles.anualContainer} contentContainerStyle={styles.anualContent}>
      <View style={styles.anualHeader}>
        <Text style={styles.anualTitle}>RESUMEN DE DATOS</Text>
        <Text style={styles.anualSubtitle}>Análisis Anual</Text>
      </View>

      <View style={styles.yearSelector}>
        {availableYears.length === 0 && (
          <Text style={styles.yearPlaceholder}>Sin datos disponibles</Text>
        )}
        {availableYears.map((year) => (
          <TouchableOpacity
            key={year}
            style={[styles.yearPill, selectedYear === year && styles.yearPillActive]}
            onPress={() => setSelectedYear(year)}
          >
            <Text style={[styles.yearPillText, selectedYear === year && styles.yearPillTextActive]}>
              {year}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.chartTitle}>Precipitación Mensual</Text>
          <Text style={styles.chartSubtitle}>Distribución de mm acumulados por mes</Text>
          <MonthBarChart data={monthTotals} maxMonth={topMonth.label} />
        </Card.Content>
      </Card>

      <View style={styles.totalAnnualCard}>
        <Text style={styles.totalAnnualLabel}>TOTAL ANUAL</Text>
        <Text style={styles.totalAnnualValue}>{totalYearMm.toFixed(1)} mm</Text>
        <Text style={styles.totalAnnualSubtext}>Equivalente a {litersPerHa} millones de litros por hectárea.</Text>
      </View>

      <View style={styles.statsGrid}>
        <Card style={[styles.statCard, { backgroundColor: COLORS.grayLight }]}>
          <Card.Content>
            <Ionicons name="rainy" size={20} color={COLORS.green} />
            <Text style={[styles.statLabel, { color: COLORS.textTertiary }]}>DÍA MÁS LLUVIOSO</Text>
            <Text style={styles.statValue}>{maxRainDay.mm.toFixed(1)} mm</Text>
            <Text style={styles.statSubtext}>{maxRainDayDateStr}</Text>
          </Card.Content>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: COLORS.grayLight }]}>
          <Card.Content>
            <Ionicons name="water" size={20} color={COLORS.chartBlue} />
            <Text style={styles.statLabel}>DÍAS CON LLUVIA</Text>
            <Text style={styles.statValue}>{daysWithRain} días</Text>
          </Card.Content>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: COLORS.grayLight }]}>
          <Card.Content>
            <Ionicons name="stats-chart" size={20} color={COLORS.chartBlue} />
            <Text style={styles.statLabel}>PROMEDIO/DÍA</Text>
            <Text style={styles.statValue}>{avgMmPerDay.toFixed(1)} mm</Text>
          </Card.Content>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: COLORS.grayLight }]}>
          <Card.Content>
            <Ionicons name="calendar" size={20} color={COLORS.chartBlue} />
            <Text style={styles.statLabel}>MES MÁS LLUVIOSO</Text>
            <Text style={styles.statValue}>{topMonthLabel}</Text>
            <Text style={styles.statSubtext}>{topMonth.totalMm.toFixed(1)} mm</Text>
          </Card.Content>
        </Card>
      </View>

      {prevYearTotal > 0 && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Vs. Año anterior</Text>
            <View style={styles.comparisonRow}>
              <Text style={[styles.comparisonPct, { color: pctChange >= 0 ? COLORS.green : '#C62828' }]}>
                {pctChange >= 0 ? '↑ +' : '↘ -'}{Math.abs(pctChange).toFixed(1)}%
              </Text>
              <View style={styles.comparisonBars}>
                <View style={styles.comparisonBarWrapper}>
                  <Text style={styles.comparisonBarLabel}>{selectedYear - 1}</Text>
                  <View style={styles.comparisonBarOuter}>
                    <View
                      style={[
                        styles.comparisonBarFill,
                        { width: `${Math.min((prevYearTotal / Math.max(totalYearMm, prevYearTotal)) * 100, 100)}%` },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.comparisonBarWrapper}>
                  <Text style={styles.comparisonBarLabel}>{selectedYear}</Text>
                  <View style={styles.comparisonBarOuter}>
                    <View
                      style={[
                        styles.comparisonBarFill,
                        { width: `${Math.min((totalYearMm / Math.max(totalYearMm, prevYearTotal)) * 100, 100)}%` },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Frecuencia de Lluvia</Text>
          <Text style={styles.frequencyDesc}>{daysWithRain} días con precipitación registrada.</Text>
          <Text style={styles.frequencyPct}>{rainPct}%</Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  anualContainer: { flex: 1 },
  anualContent: { padding: 16, gap: 16, paddingBottom: 32 },
  anualHeader: {
    alignItems: 'center',
  },
  anualTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  anualSubtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 4,
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  yearPlaceholder: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  yearPill: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  yearPillActive: {
    backgroundColor: COLORS.primary,
  },
  yearPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  yearPillTextActive: {
    color: COLORS.white,
  },
  sectionCard: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  chartSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  totalAnnualCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  totalAnnualLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    opacity: 0.8,
    letterSpacing: 1,
  },
  totalAnnualValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    marginVertical: 4,
  },
  totalAnnualSubtext: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    borderRadius: 12,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statSubtext: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  comparisonRow: {
    gap: 12,
  },
  comparisonPct: {
    fontSize: 20,
    fontWeight: '700',
  },
  comparisonBars: {
    gap: 8,
  },
  comparisonBarWrapper: {
    gap: 4,
  },
  comparisonBarLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  comparisonBarOuter: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  comparisonBarFill: {
    height: '100%',
    backgroundColor: COLORS.chartBlue,
    borderRadius: 4,
  },
  frequencyDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  frequencyPct: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.primary,
  },
});