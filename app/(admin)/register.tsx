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
  { label: 'Otras', icon: 'ellipsis-horizontal' },
];

// Límites de validación
const MAX_ML = 200000; // 200L máximo para un registro
const MAX_MM = 500; // 500mm máximo (lluvia extrema)

// Limpia el input de valores inválidos
const sanitizeNumericInput = (value: string): string => {
  // Solo permite números y un punto decimal
  return value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
};

// Valida que el valor esté dentro del rango
const clampValue = (value: number, max: number): number => {
  if (isNaN(value) || value < 0) return 0;
  if (value > max) return max;
  return value;
};

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
  const [inputMode, setInputMode] = useState<'ml' | 'mm'>('ml');
  const [volumeMl, setVolumeMl] = useState('');
  const [directMm, setDirectMm] = useState('');
  const [rainfallMm, setRainfallMm] = useState<number | null>(null);
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

  // Auto-calculate rainfall when volume changes (ml mode)
  useEffect(() => {
    if (inputMode !== 'ml' || noRain) {
      if (noRain) setRainfallMm(0);
      return;
    }

    const rawValue = parseFloat(volumeMl);
    if (isNaN(rawValue) || rawValue <= 0) {
      setRainfallMm(null);
      return;
    }

    // Clamp to max
    const clamped = clampValue(rawValue, MAX_ML);
    if (clamped !== rawValue) {
      setVolumeMl(clamped.toString());
    }

    // Formula: mm = volume_ml / (π * (diameter_cm/2)²)
    // Assuming diameter of 20cm for MVP
    const diameterCm = 20;
    const radiusCm = diameterCm / 2;
    const areaCm2 = Math.PI * Math.pow(radiusCm, 2);
    const mm = clamped / areaCm2;
    setRainfallMm(Math.round(mm * 100) / 100);
  }, [volumeMl, noRain, inputMode]);

  // Handle direct mm input (mm mode)
  useEffect(() => {
    if (inputMode !== 'mm' || noRain) {
      if (noRain) setRainfallMm(0);
      return;
    }

    const rawValue = parseFloat(directMm);
    if (isNaN(rawValue) || rawValue <= 0) {
      setRainfallMm(null);
      return;
    }

    // Clamp to max
    const clamped = clampValue(rawValue, MAX_MM);
    if (clamped !== rawValue) {
      setDirectMm(clamped.toString());
    }

    setRainfallMm(Math.round(clamped * 100) / 100);
  }, [directMm, noRain, inputMode]);

  const toggleBehavior = (behavior: string) => {
    // Only one precipitation type can be selected at a time
    setSelectedBehaviors((prev) =>
      prev.includes(behavior) ? [] : [behavior]
    );
  };

  const onSave = async () => {
    if (!noRain && rainfallMm === null) {
      const unit = inputMode === 'ml' ? 'ml' : 'mm';
      Alert.alert('Error', `Ingresa un valor válido en ${unit}.`);
      return;
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

      // Determine volumeMl and rainfallMm based on input mode
      const finalMm = noRain ? 0 : (rainfallMm ?? 0);
      const finalVolumeMl = inputMode === 'ml' && !noRain ? parseFloat(volumeMl) : null;

      // Create measurement object
      const now = new Date().toISOString();
      const measurement = {
        id: generateId(),
        userId: userId as string,
        pluviometerId,
        measuredAt: measuredAt.toISOString(),
        volumeMl: finalVolumeMl,
        rainfallMm: finalMm,
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

            {/* Selector de unidad ml / mm */}
            <View style={styles.unitSelector}>
              <TouchableOpacity
                style={[styles.unitButton, inputMode === 'ml' && styles.unitButtonActive]}
                onPress={() => {
                  setInputMode('ml');
                  setDirectMm('');
                  setRainfallMm(null);
                }}
              >
                <Text style={[styles.unitButtonText, inputMode === 'ml' && styles.unitButtonTextActive]}>
                  ml
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitButton, inputMode === 'mm' && styles.unitButtonActive]}
                onPress={() => {
                  setInputMode('mm');
                  setVolumeMl('');
                  setRainfallMm(null);
                }}
              >
                <Text style={[styles.unitButtonText, inputMode === 'mm' && styles.unitButtonTextActive]}>
                  mm
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input según el modo */}
            {inputMode === 'ml' ? (
              <TextInput
                mode="outlined"
                label="Volumen (ml)"
                value={volumeMl}
                onChangeText={(text) => setVolumeMl(sanitizeNumericInput(text))}
                keyboardType="numeric"
                style={styles.input}
                textColor={COLORS.textPrimary}
                outlineColor={COLORS.textSecondary}
                activeOutlineColor={COLORS.primary}
                placeholder="Ej: 1500"
              />
            ) : (
              <TextInput
                mode="outlined"
                label="Pluviosidad (mm)"
                value={directMm}
                onChangeText={(text) => setDirectMm(sanitizeNumericInput(text))}
                keyboardType="numeric"
                style={styles.input}
                textColor={COLORS.textPrimary}
                outlineColor={COLORS.textSecondary}
                activeOutlineColor={COLORS.primary}
                placeholder="Ej: 12.5"
              />
            )}

            {rainfallMm !== null && (
              <View style={styles.calculatedContainer}>
                <Text style={styles.calculatedLabel}>
                  {inputMode === 'ml' ? 'Pluviosidad calculada:' : 'Valor registrado:'}
                </Text>
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

      {/* Observaciones - solo se muestra cuando "Otras" está seleccionado */}
      {selectedBehaviors.includes('Otras') && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardLabel}>OBSERVACIONES</Text>
            <TextInput
              mode="outlined"
              placeholder="Describe el tipo de precipitación..."
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
      )}

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
  unitSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  unitButtonActive: {
    backgroundColor: COLORS.primary,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  unitButtonTextActive: {
    color: COLORS.white,
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