import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import { TankIndicator } from '@/components';
import { useAppSession } from '@/hooks/useAppSession';
import { useUserMeasurements } from '@/hooks/useUserMeasurements';
import { TANK_DEFAULT_LIMITS } from '@/constants/app';

const COLORS = {
  primary: '#1B3A6B',
  chartBlue: '#2E5FA3',
  green: '#2DB87B',
  grayLight: '#F5F5F5',
  textPrimary: '#1A1A1A',
  textSecondary: '#888888',
  white: '#FFFFFF',
};

export default function AdminDashboardScreen() {
  const { appUser } = useAppSession();
  const { todayMeasurements, todayTotalMm, monthTotalMm, semesterTotalMm, latest } = useUserMeasurements();

  const diameterCm = 20; // TODO: from pluviometer config
  const hasTodayRecord = todayMeasurements.length > 0;
  const lastMeasurementHours = latest
    ? Math.round((Date.now() - new Date(latest.measuredAt).getTime()) / 3600000)
    : null;
  const showAlert = lastMeasurementHours !== null && lastMeasurementHours > 24;

  const userName = appUser?.fullName?.split(' ')[0] ?? 'Usuario';

  // Calculate percentages
  const dayPercent = Math.min((todayTotalMm / TANK_DEFAULT_LIMITS.day) * 100, 100);
  const monthPercent = Math.min((monthTotalMm / TANK_DEFAULT_LIMITS.month) * 100, 100);
  const semesterPercent = Math.min((semesterTotalMm / TANK_DEFAULT_LIMITS.semester) * 100, 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Bar Logo - already handled by layout header */}

      {/* Banner de alerta */}
      {showAlert && (
        <View style={styles.alertBanner}>
          <Ionicons name="warning" size={20} color={COLORS.white} />
          <Text style={styles.alertText}>Llevas más de 24h sin registrar datos</Text>
        </View>
      )}

      {/* Saludo */}
      <Text style={styles.greeting}>Hola, {userName}</Text>
      <Text style={styles.subGreeting}>Este es el estado de tu estación hoy.</Text>

      {/* Card Nivel de Agua */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Nivel de Agua</Text>

          {/* Tabs - simple implementation */}
          <View style={styles.tabs}>
            <View style={[styles.tab, styles.tabActive]}>
              <Text style={[styles.tabText, styles.tabTextActive]}>Día</Text>
            </View>
            <View style={styles.tab}>
              <Text style={styles.tabText}>Mes</Text>
            </View>
            <View style={styles.tab}>
              <Text style={styles.tabText}>Semestre</Text>
            </View>
          </View>

          {/* Tank visualization */}
          <View style={styles.tankContainer}>
            <View style={styles.tank}>
              <View style={[styles.tankFill, { height: `${dayPercent}%` }]} />
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
            <Text style={styles.volumeLabel}>VOLUMEN ESTIMADO</Text>
            <Text style={styles.volumeValue}>{(todayTotalMm * 10).toLocaleString()} Litros</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Card Registro de Hoy */}
      <Card style={[styles.card, styles.cardGray]}>
        <Card.Content>
          <Text style={[styles.cardLabel, { color: COLORS.green }]}>REGISTRO DE HOY</Text>
          {!hasTodayRecord ? (
            <>
              <Text style={styles.missingText}>Falta registro</Text>
              <View style={styles.registerButton}>
                <Text style={styles.registerButtonText}>Registrar ahora</Text>
              </View>
            </>
          ) : (
            <Text style={styles.recordText}>
              {todayMeasurements.length} registro(s) hoy
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Card Acumulado del Mes */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardLabel}>ACUMULADO DEL MES</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricValue}>{monthTotalMm.toFixed(1)} mm</Text>
            <View style={styles.trendBadge}>
              <Ionicons name="arrow-up" size={14} color={COLORS.green} />
              <Text style={styles.trendText}>+12% más que el mes pasado</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Card Última Medición */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardLabel}>ÚLTIMA MEDICIÓN</Text>
          <View style={styles.lastMeasurement}>
            <Ionicons name="time-outline" size={24} color={COLORS.textSecondary} />
            <View>
              <Text style={styles.measurementValue}>
                {latest ? `${latest.rainfallMm.toFixed(1)} mm` : 'Sin mediciones'}
              </Text>
              <Text style={styles.measurementTime}>
                {latest
                  ? new Date(latest.measuredAt).toLocaleDateString('es-ES', {
                      weekday: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-'}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  alertBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  alertText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subGreeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  card: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardGray: {
    backgroundColor: COLORS.grayLight,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
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
    color: COLORS.textPrimary,
    fontWeight: '600',
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
  },
  volumeValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  missingText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  registerButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 30,
    paddingVertical: 14,
    marginTop: 12,
    alignItems: 'center',
  },
  registerButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  recordText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    color: COLORS.green,
  },
  lastMeasurement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  measurementValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  measurementTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});