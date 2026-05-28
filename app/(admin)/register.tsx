import { useState, useEffect } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Chip, Text, TextInput, Snackbar } from 'react-native-paper';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';

import { insertLocalMeasurement } from '@/lib/sqlite';
import { syncPendingMeasurements } from '@/lib/sync';
import { useAppSession } from '@/hooks/useAppSession';
import { useUserMeasurements } from '@/hooks/useUserMeasurements';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';

const generateId = (): string => {
  return Crypto.randomUUID();
};

const COLORS = {
  primary: '#003D70',
  white: '#F8F9FA',
  chartBlue: '#2E5FA3',
  green: '#2DB87B',
  grayLight: '#F5F5F5',
  textPrimary: '#1A1A1A',
  textSecondary: '#888888',
  textTerciary: '#003D70',
};

const PRECIPITATION_OPTIONS = [
  { label: 'Granizo', icon: 'snow' },
  { label: 'Lluvia torrencial', icon: 'rainy' },
  { label: 'Lluvias intermitentes', icon: 'water' },
  { label: 'Vientos muy fuertes', icon: 'flame' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { appUser, userId } = useAppSession();
  const { latest } = useUserMeasurements();
  const supabaseClient = useSupabaseClient();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Form state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [noRain, setNoRain] = useState(false);
  const [volumeMl, setVolumeMl] = useState('');
  const [rainfallMm, setRainfallMm] = useState<string>('');
  const [calculatedRainfallMm, setCalculatedRainfallMm] = useState<number | null>(null);
  const [measurementUnit, setMeasurementUnit] = useState<'ml' | 'mm'>('ml'); // Toggle for input unit
  const [selectedBehaviors, setSelectedBehaviors] = useState<string[]>([]);
  const [observations, setObservations] = useState('');

  // Formatted strings for display
  const dateDisplay = selectedDate.toLocaleDateString('es-ES');
  const timeDisplay = selectedTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });

  // Date picker handler
  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  // Time picker handler
  const onTimeChange = (_event: DateTimePickerEvent, time?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (time) {
      setSelectedTime(time);
    }
  };

  // Calculate time since last measurement
  const hoursSinceLast = latest
    ? Math.round((Date.now() - new Date(latest.measuredAt).getTime()) / 3600000)
    : null;

  // Auto-calculate rainfall when volume changes
  useEffect(() => {
    if (noRain) {
      setCalculatedRainfallMm(0);
      return;
    }

    const input = measurementUnit === 'ml' ? volumeMl : rainfallMm;
    if (!input) {
      setCalculatedRainfallMm(null);
      return;
    }

    const value = parseFloat(input);
    if (isNaN(value) || value <= 0) {
      setCalculatedRainfallMm(null);
      return;
    }

    if (measurementUnit === 'mm') {
      // Direct mm input
      setCalculatedRainfallMm(value);
    } else {
      // Convert ml to mm using tank dimensions (1m x 1m = 10,000 cm²)
      // Formula: mm = volumeMl / areaCm2
      const areaCm2 = 10000; // 100cm x 100cm
      const mm = value / areaCm2;
      setCalculatedRainfallMm(Math.round(mm * 10) / 10); // Round to 1 decimal
    }
  }, [volumeMl, rainfallMm, noRain, measurementUnit]);

  const toggleBehavior = (behavior: string) => {
    // Only one precipitation type can be selected at a time
    setSelectedBehaviors((prev) =>
      prev.includes(behavior) ? [] : [behavior]
    );
  };

  const onSave = async () => {
    if (!noRain) {
      const input = measurementUnit === 'ml' ? volumeMl : rainfallMm;
      if (!input || parseFloat(input) <= 0) {
        const unit = measurementUnit === 'ml' ? 'volumen en ml' : 'lluvia en mm';
        Alert.alert('Error', `Ingresa el ${unit}.`);
        return;
      }
    }

    setLoading(true);
    try {
      const pluviometerId = appUser?.pluviometerId ?? '';
      if (!pluviometerId) {
        Alert.alert('Error', 'No tienes un pluviómetro configurado.');
        setLoading(false);
        return;
      }

      // Combine date and time into measuredAt
      const measuredAt = new Date(selectedDate);
      measuredAt.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);

      // Calculate elapsed minutes from latest measurement
      const elapsedMinutes = latest
        ? Math.round((measuredAt.getTime() - new Date(latest.measuredAt).getTime()) / 60000)
        : null;

      // Calculate volumeMl if input was in mm
      const finalVolumeMl = noRain ? null : 
        (measurementUnit === 'mm' ? parseFloat(rainfallMm) * 10000 : parseFloat(volumeMl));

      // Create measurement object
      const now = new Date().toISOString();
      const measurement = {
        id: generateId(),
        userId: userId as string,
        pluviometerId,
        measuredAt: measuredAt.toISOString(),
        volumeMl: finalVolumeMl,
        rainfallMm: calculatedRainfallMm ?? 0,
        noRain,
        elapsedMinutes,
        observations: observations.trim() || null,
        behaviors: selectedBehaviors as any,
        synced: false,
        localId: generateId(),
        createdAt: now,
        updatedAt: now,
      };

      // Save to SQLite
      insertLocalMeasurement(measurement);

      // Invalidate measurements cache so dashboard updates
      queryClient.invalidateQueries({ queryKey: ['user-measurements', userId as string] });

      // Sync to Supabase in background
      syncPendingMeasurements(supabaseClient, userId as string).catch((err) => {
        console.warn('Sync failed, will retry later:', err);
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        router.push('/(admin)');
      }, 1500);
    } catch (error) {
      console.warn('[register] onSave error:', error);
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

      <Text style={[styles.title]}>Nuevo registro</Text>

      {/* Fecha y Hora */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardLabel}>FECHA Y HORA</Text>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateInputText}>{dateDisplay}</Text>
              <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.timeInput}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.dateInputText}>{timeDisplay}</Text>
              <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display="default"
              onChange={onTimeChange}
            />
          )}
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
            
            {/* Unit Toggle */}
            <View style={styles.unitToggleContainer}>
              <TouchableOpacity
                style={[styles.unitToggleButton, measurementUnit === 'ml' && styles.unitToggleButtonActive]}
                onPress={() => {
                  setMeasurementUnit('ml');
                  setRainfallMm('');
                }}
              >
                <Text style={[styles.unitToggleText, measurementUnit === 'ml' && styles.unitToggleTextActive]}>
                  Volumen (ml)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitToggleButton, measurementUnit === 'mm' && styles.unitToggleButtonActive]}
                onPress={() => {
                  setMeasurementUnit('mm');
                  setVolumeMl('');
                }}
              >
                <Text style={[styles.unitToggleText, measurementUnit === 'mm' && styles.unitToggleTextActive]}>
                  Lluvia (mm)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Volume Input */}
            {measurementUnit === 'ml' && (
              <TextInput
                mode="outlined"
                label="Volumen (ml)"
                value={volumeMl}
                onChangeText={setVolumeMl}
                keyboardType="numeric"
                style={styles.input}
                textColor={COLORS.textPrimary}
                outlineColor={COLORS.textSecondary}
                activeOutlineColor={COLORS.primary}
              />
            )}

            {/* Rainfall Input */}
            {measurementUnit === 'mm' && (
              <TextInput
                mode="outlined"
                label="Lluvia (mm)"
                value={rainfallMm}
                onChangeText={setRainfallMm}
                keyboardType="numeric"
                style={styles.input}
                textColor={COLORS.textPrimary}
                outlineColor={COLORS.textSecondary}
                activeOutlineColor={COLORS.primary}
              />
            )}

            {calculatedRainfallMm !== null && (
              <View style={styles.calculatedContainer}>
                <Text style={styles.calculatedLabel}>
                  {measurementUnit === 'ml' ? 'Pluviosidad calculada:' : 'Volumen equivalente:'}
                </Text>
                <Text style={styles.calculatedValue}>
                  {measurementUnit === 'ml' 
                    ? `${calculatedRainfallMm.toFixed(1)} mm`
                    : `${(calculatedRainfallMm * 10000).toFixed(0)} ml`
                  }
                </Text>
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
            {PRECIPITATION_OPTIONS.map((option) => {
              const isSelected = selectedBehaviors.includes(option.label);
              return (
                <TouchableOpacity
                  key={option.label}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => toggleBehavior(option.label)}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={16}
                    color={isSelected ? COLORS.white : COLORS.primary}
                  />
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
            textColor={COLORS.textPrimary}
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

      {/* Success Snackbar */}
      <Snackbar
        visible={showSuccess}
        onDismiss={() => setShowSuccess(false)}
        duration={1500}
        style={styles.successSnackbar}
      >
        <View style={styles.successContent}>
          <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
          <Text style={styles.successText}>Registro guardado correctamente</Text>
        </View>
      </Snackbar>
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
    color: COLORS.textTerciary,
  },
  card: {
    borderRadius: 12,
    backgroundColor: COLORS.grayLight,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 12,
  },
  unitToggleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 4,
  },
  unitToggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: COLORS.grayLight,
    alignItems: 'center',
  },
  unitToggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  unitToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  unitToggleTextActive: {
    color: COLORS.white,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeInput: {
    width: 100,
    backgroundColor: COLORS.white,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateInputText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  inputIcon: {
    marginLeft: 8,
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
    color: COLORS.textPrimary,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.primary,
  },
  chipTextSelected: {
    color: COLORS.white,
  },
  observationsInput: {
    backgroundColor: COLORS.white,
    color: COLORS.textPrimary,
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
  successSnackbar: {
    backgroundColor: COLORS.green,
    borderRadius: 8,
  },
  successContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});