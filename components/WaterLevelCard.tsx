import { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text } from 'react-native-paper';

import { TANK_MAX_MM } from '@/constants/app';
import { TANK_DIAMETER_CM, mmToLiters } from '@/utils';

type TankPeriod = 'day' | 'month' | 'semester';

const MONTH_FULL_LABELS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTH_SHORT_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const COLORS = {
  primary: '#1B3A6B',
  chartBlue: '#2E5FA3',
  green: '#2DB87B',
  grayLight: '#F5F5F5',
  textSecondary: '#888888',
  white: '#FFFFFF',
};

interface WaterLevelCardProps {
  todayTotalMm: number;
  monthTotalMm: number;
  semesterTotalMm: number;
}

export const WaterLevelCard = ({ todayTotalMm, monthTotalMm, semesterTotalMm }: WaterLevelCardProps) => {
  const [tankPeriod, setTankPeriod] = useState<TankPeriod>('day');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Period labels with dates
  const periodInfo = useMemo(() => {
    const dayDate = new Date();
    const dayLabel = `${dayDate.getDate()} de ${MONTH_FULL_LABELS[dayDate.getMonth()]} de ${dayDate.getFullYear()}`;

    const monthLabel = `${MONTH_FULL_LABELS[currentMonth]} ${currentYear}`;

    // Semestre: last 6 months including current
    const semesterStartMonth = (currentMonth - 5 + 12) % 12;
    const semesterStartYear = currentMonth - 5 < 0 ? currentYear - 1 : currentYear;
    const semesterLabel = `${MONTH_SHORT_LABELS[semesterStartMonth]} ${semesterStartYear} - ${MONTH_SHORT_LABELS[currentMonth]} ${currentYear}`;

    return {
      day: dayLabel,
      month: monthLabel,
      semester: semesterLabel,
    };
  }, [currentMonth, currentYear]);

  // Tank progress logic
  const tankCapacityLiters = mmToLiters(TANK_MAX_MM, TANK_DIAMETER_CM);

  // Calculate completed tanks and current tank progress for each period
  const dayCompletedTanks = Math.floor(todayTotalMm / TANK_MAX_MM);
  const dayCurrentMm = todayTotalMm % TANK_MAX_MM;
  const dayPercent = Math.min((dayCurrentMm / TANK_MAX_MM) * 100, 100);
  const dayLiters = mmToLiters(dayCurrentMm, TANK_DIAMETER_CM);

  const monthCompletedTanks = Math.floor(monthTotalMm / TANK_MAX_MM);
  const monthCurrentMm = monthTotalMm % TANK_MAX_MM;
  const monthPercent = Math.min((monthCurrentMm / TANK_MAX_MM) * 100, 100);
  const monthLiters = mmToLiters(monthCurrentMm, TANK_DIAMETER_CM);

  const semesterCompletedTanks = Math.floor(semesterTotalMm / TANK_MAX_MM);
  const semesterCurrentMm = semesterTotalMm % TANK_MAX_MM;
  const semesterPercent = Math.min((semesterCurrentMm / TANK_MAX_MM) * 100, 100);
  const semesterLiters = mmToLiters(semesterCurrentMm, TANK_DIAMETER_CM);

  // Selected period values
  const selectedPercent = tankPeriod === 'day' ? dayPercent : tankPeriod === 'month' ? monthPercent : semesterPercent;
  const selectedMm = tankPeriod === 'day' ? dayCurrentMm : tankPeriod === 'month' ? monthCurrentMm : semesterCurrentMm;
  const selectedLiters = tankPeriod === 'day' ? dayLiters : tankPeriod === 'month' ? monthLiters : semesterLiters;
  const selectedCompletedTanks = tankPeriod === 'day' ? dayCompletedTanks : tankPeriod === 'month' ? monthCompletedTanks : semesterCompletedTanks;
  const selectedLabel = tankPeriod === 'day' ? 'Día' : tankPeriod === 'month' ? 'Mes' : 'Semestre';
  const selectedPeriodLabel = periodInfo[tankPeriod];

  // Only show tank counter for month and semester (day won't have multiple tanks)
  const showTankCounter = selectedCompletedTanks > 0 && tankPeriod !== 'day';

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.cardTitle}>Progreso representado en un tanque de 1m³ (1000 litros)</Text>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tankPeriod === 'day' && styles.tabActive]}
            onPress={() => setTankPeriod('day')}
          >
            <Text style={[styles.tabText, tankPeriod === 'day' && styles.tabTextActive]}>Día</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tankPeriod === 'month' && styles.tabActive]}
            onPress={() => setTankPeriod('month')}
          >
            <Text style={[styles.tabText, tankPeriod === 'month' && styles.tabTextActive]}>Mes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tankPeriod === 'semester' && styles.tabActive]}
            onPress={() => setTankPeriod('semester')}
          >
            <Text style={[styles.tabText, tankPeriod === 'semester' && styles.tabTextActive]}>Semestre</Text>
          </TouchableOpacity>
        </View>

        {/* Tank counter badge */}
        {showTankCounter && (
          <View style={styles.tankCounterBadge}>
            <Text style={styles.tankCounterText}>
              {selectedCompletedTanks} tanque{selectedCompletedTanks > 1 ? 's' : ''} completo{selectedCompletedTanks > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Period label */}
        <Text style={styles.periodLabel}>{selectedPeriodLabel}</Text>

        {/* Tank visualization */}
        <View style={styles.tankContainer}>
          <View style={[styles.tank, styles.tankWithBorder]}>
            <View style={[styles.tankFill, { height: `${selectedPercent}%` }]} />
          </View>
          <View style={styles.tankLabels}>
            <Text style={styles.tankLabel}>100%</Text>
            <Text style={styles.tankLabel}>75%</Text>
            <Text style={styles.tankLabel}>50%</Text>
            <Text style={styles.tankLabel}>25%</Text>
          </View>
        </View>

        {/* Volumen estimado */}
        <View style={styles.volumeContainer}>
          <Text style={styles.volumeLabel}>Volumen en este tanque ({selectedPeriodLabel})</Text>
          <Text style={styles.volumeValue}>{selectedLiters.toFixed(2)} L</Text>
          <Text style={styles.volumeSubtext}>de {tankCapacityLiters.toFixed(0)} L capacidad</Text>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    backgroundColor: COLORS.grayLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 12,
    alignSelf: 'center',
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  tankCounterBadge: {
    backgroundColor: COLORS.green,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'center',
    marginBottom: 8,
  },
  tankCounterText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  periodLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.chartBlue,
    textAlign: 'center',
    marginBottom: 12,
  },
  tankContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 16,
  },
  tank: {
    flex: 1,
    height: 160,
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  tankWithBorder: {
    borderWidth: 2,
    borderColor: COLORS.chartBlue,
  },
  tankFill: {
    backgroundColor: COLORS.chartBlue,
    width: '100%',
  },
  tankLabels: {
    justifyContent: 'space-between',
    paddingLeft: 8,
  },
  tankLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  volumeContainer: {
    alignItems: 'center',
  },
  volumeLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    textAlign: 'center',
  },
  volumeValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  volumeSubtext: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});