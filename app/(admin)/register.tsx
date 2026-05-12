import { useState, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Text, TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import { useUserMeasurements } from '@/hooks/useUserMeasurements';

const COLORS = {
  primary: '#003D70',
  white: '#F8F9FA',
  chartBlue: '#2E5FA3',
  green: '#2DB87B',
  grayLight: '#F5F5F5',
  textPrimary: '#1A1A1A',
  textSecondary: '#888888',
};

const PRECIPITATION_OPTIONS = [
  { label: 'Granizo', icon: 'snow' },
  { label: 'Lluvia torrencial', icon: 'rainy' },
  { label: 'Lluvias intermitentes', icon: 'water' },
  { label: 'Incendio', icon: 'flame' },
];

export default function RegisterScreen() {
  const { latest } = useUserMeasurements();
  const [loading, setLoading] = useState(false);

  // Form state
  const [date, setDate] = useState(new Date().toLocaleDateString('es-ES'));
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  );
  const [noRain, setNoRain] = useState(false);
  const [volumeMl, setVolumeMl] = useState('');
  const [rainfallMm, setRainfallMm] = useState<number | null>(null);
  const [selectedBehaviors, setSelectedBehaviors] = useState<string[]>([]);
  const [observations, setObservations] = useState('');

  // Calculate time since last measurement
  const hoursSinceLast = latest
    ? Math.round((Date.now() - new Date(latest.measuredAt).getTime()) / 3600000)
    : null;

  // Auto-calculate rainfall when volume changes
  useEffect(() => {
    if (volumeMl && !noRain) {
      const volume = parseFloat(volumeMl);
      if (!isNaN(volume)) {
        // Formula: mm = volume_ml / (π * (diameter_cm/2)²)
        // Assuming diameter of 20cm for MVP
        const diameterCm = 20;
        const radiusCm = diameterCm / 2;
        const areaCm2 = Math.PI * Math.pow(radiusCm, 2);
        const mm = volume / areaCm2;
        setRainfallMm(Math.round(mm * 100) / 100);
      }
    } else if (noRain) {
      setRainfallMm(0);
    }
  }, [volumeMl, noRain]);

  const toggleBehavior = (behavior: string) => {
    setSelectedBehaviors((prev) =>
      prev.includes(behavior) ? prev.filter((b) => b !== behavior) : [...prev, behavior]
    );
  };

  const onSave = async () => {
    if (!noRain && (!volumeMl || parseFloat(volumeMl) <= 0)) {
      Alert.alert('Error', 'Ingresa el volumen en ml.');
      return;
    }

    setLoading(true);
    try {
      // TODO: Save to SQLite + sync
      Alert.alert('Éxito', 'Registro guardado correctamente.');
      // Reset form
      setVolumeMl('');
      setRainfallMm(null);
      setSelectedBehaviors([]);
      setObservations('');
      setNoRain(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tiempo desde última medición */}
      {hoursSinceLast !== null && (
        <View style={styles.timeBanner}>
          <Ionicons name="time-outline" size={18} color={COLORS.green} />
          <Text style={styles.timeBannerText}>
            Hace {hoursSinceLast} hora{hoursSinceLast !== 1 ? 's' : ''} desde tu última medición
          </Text>
        </View>
      )}

      <Text style={styles.title}>Nuevo registro</Text>

      {/* Fecha y Hora */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardLabel}>FECHA Y HORA</Text>
          <View style={styles.dateTimeRow}>
            <TextInput
              mode="outlined"
              label="Fecha"
              value={date}
              onChangeText={setDate}
              style={styles.dateInput}
              outlineColor={COLORS.textSecondary}
              activeOutlineColor={COLORS.primary}
            />
            <TextInput
              mode="outlined"
              label="Hora"
              value={time}
              onChangeText={setTime}
              style={styles.timeInput}
              outlineColor={COLORS.textSecondary}
              activeOutlineColor={COLORS.primary}
            />
          </View>
        </Card.Content>
      </Card>

      {/* No llovió */}
      <Card style={styles.card}>
        <Card.Content>
          <Button
            mode={noRain ? 'contained' : 'outlined'}
            onPress={() => setNoRain(!noRain)}
            buttonColor={noRain ? COLORS.green : undefined}
            style={styles.noRainButton}
          >
            <View style={styles.noRainContent}>
              <Ionicons
                name={noRain ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={noRain ? COLORS.white : COLORS.textSecondary}
              />
              <Text style={[styles.noRainText, noRain && styles.noRainTextActive]}>
                No llovió hoy (0 mm)
              </Text>
            </View>
          </Button>
        </Card.Content>
      </Card>

      {/* Volumen y pluviosidad */}
      {!noRain && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardLabel}>MEDICIÓN</Text>
            <TextInput
              mode="outlined"
              label="Volumen (ml)"
              value={volumeMl}
              onChangeText={setVolumeMl}
              keyboardType="numeric"
              style={styles.input}
              outlineColor={COLORS.textSecondary}
              activeOutlineColor={COLORS.primary}
            />

            {rainfallMm !== null && (
              <View style={styles.calculatedContainer}>
                <Text style={styles.calculatedLabel}>Pluviosidad calculada:</Text>
                <Text style={styles.calculatedValue}>{rainfallMm.toFixed(2)} mm</Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Tipo de precipitación */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardLabel}>TIPO DE PRECIPITACIÓN</Text>
          <View style={styles.chipsContainer}>
            {PRECIPITATION_OPTIONS.map((option) => (
              <Chip
                key={option.label}
                icon={() => <Ionicons name={option.icon as any} size={16} color={COLORS.primary} />}
                selected={selectedBehaviors.includes(option.label)}
                onPress={() => toggleBehavior(option.label)}
                style={styles.chip}
                selectedColor={COLORS.primary}
              >
                {option.label}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* Observaciones */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardLabel}>OBSERVACIONES</Text>
          <TextInput
            mode="outlined"
            placeholder="Observaciones adicionales..."
            value={observations}
            onChangeText={setObservations}
            multiline
            numberOfLines={4}
            style={styles.observationsInput}
            outlineColor={COLORS.textSecondary}
            activeOutlineColor={COLORS.primary}
          />
        </Card.Content>
      </Card>

      {/* Botón guardar */}
      <Button
        mode="contained"
        onPress={onSave}
        loading={loading}
        disabled={loading}
        buttonColor={COLORS.primary}
        textColor={COLORS.white}
        style={styles.saveButton}
        contentStyle={styles.saveButtonContent}
      >
        Guardar registro
      </Button>
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
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  card: {
    borderRadius: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 12,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  timeInput: {
    width: 100,
    backgroundColor: COLORS.white,
  },
  noRainButton: {
    borderRadius: 8,
  },
  noRainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noRainText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  noRainTextActive: {
    color: COLORS.white,
  },
  input: {
    backgroundColor: COLORS.white,
  },
  calculatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.grayLight,
    borderRadius: 8,
  },
  calculatedLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  calculatedValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.chartBlue,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.white,
  },
  observationsInput: {
    backgroundColor: COLORS.white,
  },
  saveButton: {
    borderRadius: 8,
    marginTop: 8,
  },
  saveButtonContent: {
    paddingVertical: 8,
  },
  timeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.green}20`,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  timeBannerText: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: '500',
  },
});