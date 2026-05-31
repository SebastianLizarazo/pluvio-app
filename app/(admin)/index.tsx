import { ScrollView, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAppSession } from '@/hooks/useAppSession';
import { useUserMeasurements } from '@/hooks/useUserMeasurements';
import { WaterLevelCard } from '@/components/WaterLevelCard';

const COLORS = {
  primary: '#1B3A6B',
  green: '#2DB87B',
  grayLight: '#F5F5F5',
  textPrimary: '#1A1A1A',
  textSecondary: '#888888',
  white: '#FFFFFF',
};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { appUser } = useAppSession();
  const { todayMeasurements, monthTotalMm, semesterTotalMm, latest } = useUserMeasurements();

  const hasTodayRecord = todayMeasurements.length > 0;
  const lastMeasurementHours = latest
    ? Math.round((Date.now() - new Date(latest.measuredAt).getTime()) / 3600000)
    : null;
  const showAlert = lastMeasurementHours !== null && lastMeasurementHours > 24;

  const userName = appUser?.fullName?.split(' ')[0] ?? 'Usuario';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

      {/* Card Nivel de Agua - reutilizado en analysis también */}
      <WaterLevelCard
        todayTotalMm={todayMeasurements.reduce((acc, m) => acc + m.rainfallMm, 0)}
        monthTotalMm={monthTotalMm}
        semesterTotalMm={semesterTotalMm}
      />

      {/* Card Registro de Hoy */}
      <Card style={[styles.card, styles.cardGray]}>
        <Card.Content>
          <Text style={[styles.cardLabel, { color: COLORS.green }]}>REGISTRO DE HOY</Text>
          {!hasTodayRecord ? (
            <>
              <Text style={styles.missingText}>Falta registro</Text>
              <TouchableOpacity style={styles.registerButton} onPress={() => router.push('/(admin)/register')}>
                <Text style={styles.registerButtonText}>Registrar ahora</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.recordText}>
              {todayMeasurements.length} registro(s) hoy
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Card Acumulado del Mes */}
      <Card style={[styles.card, styles.cardGray]}>
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
      <Card style={[styles.card, styles.cardGray]}>
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
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
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