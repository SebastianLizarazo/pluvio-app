import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import type { Measurement } from '@/types/domain';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';
import { useAppSession } from '@/hooks/useAppSession';
import { updateLocalMeasurement } from '@/lib/sqlite';
import { syncPendingMeasurements } from '@/lib/sync';

const COLORS = {
  primary: '#1B3A6B',
  chartBlue: '#2E5FA3',
  grayLight: '#F5F5F5',
  textPrimary: '#1A1A1A',
  textSecondary: '#888888',
  white: '#FFFFFF',
  green: '#2DB87B',
};

interface EditMeasurementModalProps {
  measurement: Measurement | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export function EditMeasurementModal({ measurement, onClose, onUpdated }: EditMeasurementModalProps) {
  const supabaseClient = useSupabaseClient();
  const { userId } = useAppSession();

  // Form state - date/time derived from measurement, not editable
  const [displayDate, setDisplayDate] = useState('');
  const [displayTime, setDisplayTime] = useState('');
  const [editMm, setEditMm] = useState('');
  const [editNoRain, setEditNoRain] = useState(false);
  const [editObservations, setEditObservations] = useState('');

  // Effect to initialize form when measurement changes
  useEffect(() => {
    if (!measurement) {
      setEditMm('');
      setEditNoRain(false);
      setEditObservations('');
      return;
    }

    const measuredAtDate = new Date(measurement.measuredAt);
    setDisplayDate(measuredAtDate.toLocaleDateString('es-ES'));
    setDisplayTime(measuredAtDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
    setEditMm(measurement.rainfallMm > 0 ? measurement.rainfallMm.toString() : '');
    setEditNoRain(measurement.noRain);
    setEditObservations(''); // Observations input starts empty; user types new ones to append
  }, [measurement?.id]);

  const handleClose = () => {
    onClose();
  };

  const handleSave = () => {
    if (!measurement) return;

    if (!editNoRain) {
      const mmValue = parseFloat(editMm);
      if (isNaN(mmValue) || mmValue <= 0) {
        Alert.alert('Error', 'Ingresa un valor válido en mm.');
        return;
      }
    }

    // Append new observations to existing ones if user typed something
    let finalObservations: string | null = measurement.observations || null;
    if (editObservations.trim()) {
      const newObs = editObservations.trim();
      finalObservations = finalObservations
        ? `${finalObservations}\n📝 ${newObs}`
        : newObs;
    }

    const updatedMeasurement: Measurement = {
      ...measurement,
      rainfallMm: editNoRain ? 0 : parseFloat(editMm),
      noRain: editNoRain,
      observations: finalObservations,
      synced: false,
      updatedAt: new Date().toISOString(),
    };

    try {
      updateLocalMeasurement(updatedMeasurement);
      handleClose();

      // Invalidate measurements cache in parent
      onUpdated?.();

      if (userId && supabaseClient) {
        syncPendingMeasurements(supabaseClient, userId).catch((err) => {
          console.warn('[EditMeasurementModal] Sync failed:', err);
        });
      }

      Alert.alert('Éxito', 'Registro actualizado correctamente.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el registro.');
    }
  };

  return (
    <Modal
      visible={measurement !== null}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar Registro</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Section 1: Date and Time - Read Only */}
            <View style={styles.section}>
              <Text style={styles.modalLabel}>FECHA Y HORA</Text>
              <View style={styles.modalDateTimeRow}>
                <View style={styles.modalDateInput}>
                  <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.modalDateText}>{displayDate}</Text>
                </View>
                <View style={styles.modalTimeInput}>
                  <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.modalDateText}>{displayTime}</Text>
                </View>
              </View>
            </View>

            {/* Section 2: No Rain Toggle */}
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.modalNoRainButton, editNoRain && styles.modalNoRainButtonActive]}
                onPress={() => setEditNoRain(!editNoRain)}
              >
                <Ionicons
                  name={editNoRain ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={editNoRain ? COLORS.white : COLORS.textSecondary}
                />
                <Text style={[styles.modalNoRainText, editNoRain && styles.modalNoRainTextActive]}>
                  No llovió (0 mm)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Section 3: mm Input */}
            {!editNoRain && (
              <View style={styles.section}>
                <Text style={styles.modalLabel}>PLUVIOSIDAD (mm)</Text>
                <TextInput
                  mode="outlined"
                  label="mm"
                  value={editMm}
                  onChangeText={(text) => setEditMm(text.replace(/[^0-9.]/g, ''))}
                  keyboardType="numeric"
                  style={styles.modalInput}
                  textColor={COLORS.textPrimary}
                  outlineColor={COLORS.textSecondary}
                  activeOutlineColor={COLORS.primary}
                />
              </View>
            )}

            {/* Section 4: Observations - Append Only */}
            <View style={styles.section}>
              {measurement?.observations && (
                <View style={styles.modalObservationsPreview}>
                  <Text style={styles.modalLabel}>OBSERVACIONES ACTUALES</Text>
                  <Text style={styles.observationsPreviewText}>{measurement.observations}</Text>
                </View>
              )}
              <Text style={styles.modalLabel}>
                {measurement?.observations ? 'AGREGAR OBSERVACIONES' : 'OBSERVACIONES'}
              </Text>
              <TextInput
                mode="outlined"
                multiline
                numberOfLines={3}
                value={editObservations}
                onChangeText={setEditObservations}
                style={styles.modalObservationsInput}
                textColor={COLORS.textPrimary}
                outlineColor={COLORS.textSecondary}
                activeOutlineColor={COLORS.primary}
                placeholder="Escribe para agregar..."
              />
              {editObservations.trim() !== '' && (
                <Text style={styles.appendHint}>
                  📝 Las nuevas observaciones se agregarán a las existentes
                </Text>
              )}
            </View>

            {/* Save Button */}
            <View style={styles.section}>
              <Button
                mode="contained"
                onPress={handleSave}
                buttonColor={COLORS.primary}
                textColor={COLORS.white}
                style={styles.modalSaveButton}
              >
                Guardar Cambios
              </Button>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalBody: {},
  section: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  modalDateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalDateInput: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTimeInput: {
    width: 90,
    backgroundColor: COLORS.grayLight,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalDateText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  modalNoRainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.grayLight,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modalNoRainButtonActive: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  modalNoRainText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  modalNoRainTextActive: {
    color: COLORS.white,
  },
  modalInputSection: {
    gap: 8,
  },
  modalInput: {
    backgroundColor: COLORS.white,
  },
  modalObservationsInput: {
    backgroundColor: COLORS.white,
  },
  modalSaveButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  modalObservationsPreview: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
  },
  observationsPreviewText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  appendHint: {
    fontSize: 12,
    color: COLORS.chartBlue,
    fontStyle: 'italic',
    marginTop: -8,
  },
});