import { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import { useUserMeasurements } from '@/hooks/useUserMeasurements';
import { useAnalytics } from '@/hooks/useAnalytics';
import { TANK_DEFAULT_LIMITS, ANALYTICS_DEFAULTS } from '@/constants/app';
import { mmToLiters } from '@/utils';
import { TankBar } from './components/TankBar';

const COLORS = {
  primary: '#1B3A6B',
  chartBlue: '#2E5FA3',
  green: '#2DB87B',
  grayLight: '#F5F5F5',
  textPrimary: '#1A1A1A',
  textSecondary: '#888888',
  white: '#FFFFFF',
  orange: '#F57C00',
};

const MONTH_FULL_LABELS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function PanelContent() {
  const currentYear = new Date().getFullYear();
  const { monthTotals, topWet, maxRainDay, bestDryStreak, wetSeason, drySeason } = useAnalytics(currentYear, ANALYTICS_DEFAULTS.drySeasonThresholdMm);
  const { todayTotalMm, monthTotalMm, semesterTotalMm } = useUserMeasurements();

  const litersDay = mmToLiters(todayTotalMm, 20);
  const litersMonth = mmToLiters(monthTotalMm, 20);
  const litersSemester = mmToLiters(semesterTotalMm, 20);

  const totalAnnualMm = useMemo(() => {
    return monthTotals.reduce((acc, m) => acc + m.totalMm, 0);
  }, [monthTotals]);

  const prevYearAnalytics = useAnalytics(currentYear - 1, ANALYTICS_DEFAULTS.drySeasonThresholdMm);
  const prevYearTotal = useMemo(() => {
    return prevYearAnalytics.monthTotals.reduce((acc, m) => acc + m.totalMm, 0);
  }, [prevYearAnalytics]);

  const pctChange = prevYearTotal > 0 ? ((totalAnnualMm - prevYearTotal) / prevYearTotal) * 100 : 0;

  const maxWetMonthMm = topWet.length > 0 ? topWet[0].totalMm : 1;

  const maxRainDayDateStr = useMemo(() => {
    if (maxRainDay.day <= 0 || maxRainDay.mm <= 0) return 'N/A';
    const date = new Date(Date.UTC(currentYear, 0, maxRainDay.day));
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  }, [currentYear, maxRainDay]);

  return (
    <View style={styles.panelContainer}>
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>ANÁLISIS ANUAL {currentYear}</Text>
        <Text style={styles.heroValue}>{totalAnnualMm.toFixed(1)} mm</Text>
        {pctChange !== 0 && (
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>
              {pctChange > 0 ? '↑' : '↓'} {pctChange > 0 ? '+' : ''}{pctChange.toFixed(1)}% vs {currentYear - 1}
            </Text>
          </View>
        )}
      </View>

      <TankBar
        label="HOY"
        valueMm={todayTotalMm}
        limitMm={TANK_DEFAULT_LIMITS.day}
        subtext={`${litersDay.toFixed(1)} L / M²`}
      />
      <TankBar
        label="ESTE MES"
        valueMm={monthTotalMm}
        limitMm={TANK_DEFAULT_LIMITS.month}
        subtext={`${litersMonth.toFixed(1)} L / M²`}
      />
      <TankBar
        label="SEMESTRE"
        valueMm={semesterTotalMm}
        limitMm={TANK_DEFAULT_LIMITS.semester}
        subtext={`${litersSemester.toFixed(1)} L / M²`}
      />

      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Registros Extremos</Text>
          <View style={styles.extremeRow}>
            <View style={styles.extremeItem}>
              <Ionicons name="rainy" size={24} color={COLORS.chartBlue} />
              <View style={styles.extremeText}>
                <View style={[styles.badge, { backgroundColor: COLORS.chartBlue + '20' }]}>
                  <Text style={[styles.badgeText, { color: COLORS.chartBlue }]}>MÁXIMO HISTÓRICO DIARIO</Text>
                </View>
                <Text style={styles.extremeValue}>{maxRainDay.mm.toFixed(1)} mm</Text>
                <Text style={styles.extremeSubtext}>{maxRainDayDateStr}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.extremeRow, { marginTop: 12 }]}>
            <View style={styles.extremeItem}>
              <Ionicons name="sunny" size={24} color={COLORS.orange} />
              <View style={styles.extremeText}>
                <View style={[styles.badge, { backgroundColor: COLORS.orange + '20' }]}>
                  <Text style={[styles.badgeText, { color: COLORS.orange }]}>PERIODO DE SEQUÍA</Text>
                </View>
                <Text style={styles.extremeValue}>{bestDryStreak} Días</Text>
                <Text style={styles.extremeSubtext}>Sin precipitación registrable</Text>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>MESES CON MAYOR PLUVIOSIDAD</Text>
          {topWet.map((m, i) => (
            <View key={m.key} style={styles.wetMonthRow}>
              <Text style={styles.wetMonthLabel}>
                {i + 1}. {MONTH_FULL_LABELS[monthTotals.findIndex((mt) => mt.key === m.key)] ?? m.label}
              </Text>
              <Text style={styles.wetMonthValue}>{m.totalMm.toFixed(1)} mm</Text>
              <View style={styles.wetMonthBarWrapper}>
                <View
                  style={[
                    styles.wetMonthBarFill,
                    { width: `${(m.totalMm / maxWetMonthMm) * 100}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Ciclos Estacionales</Text>
          <Text style={styles.seasonDesc}>Distribución de humedad por temporada actual.</Text>
          <View style={styles.seasonRow}>
            <View style={[styles.badge, { backgroundColor: COLORS.green + '20' }]}>
              <Text style={[styles.badgeText, { color: COLORS.green }]}>TEMPORADA HÚMEDA</Text>
            </View>
            <Text style={styles.seasonList}>{wetSeason.join(' – ') || 'N/A'}</Text>
          </View>
          <View style={styles.seasonRow}>
            <View style={[styles.badge, { backgroundColor: COLORS.orange + '20' }]}>
              <Text style={[styles.badgeText, { color: COLORS.orange }]}>TEMPORADA SECA</Text>
            </View>
            <Text style={styles.seasonList}>{drySeason.join(' – ') || 'N/A'}</Text>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.chipsRow}>
        <TouchableOpacity style={styles.chip}>
          <Text style={styles.chipText}>🕐 Histórico</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chip}>
          <Text style={styles.chipText}>📊 Predictivo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chip}>
          <Text style={styles.chipText}>💧 Hidrología</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panelContainer: { gap: 16 },
  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
    opacity: 0.8,
    letterSpacing: 1,
  },
  heroValue: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.white,
    marginVertical: 8,
  },
  heroBadge: {
    backgroundColor: COLORS.green,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  heroBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
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
  extremeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  extremeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  extremeText: {
    flex: 1,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  extremeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  extremeSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  wetMonthRow: {
    marginBottom: 12,
  },
  wetMonthLabel: {
    fontSize: 13,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  wetMonthValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  wetMonthBarWrapper: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  wetMonthBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  seasonDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  seasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  seasonList: {
    fontSize: 13,
    color: COLORS.textPrimary,
    flex: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
});