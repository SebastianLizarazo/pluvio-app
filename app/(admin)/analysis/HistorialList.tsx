import { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, Modal, Alert } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import { useUserMeasurements } from '@/hooks/useUserMeasurements';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';
import { useAppSession } from '@/hooks/useAppSession';
import { updateLocalMeasurement } from '@/lib/sqlite';
import { toIsoDate } from '@/utils/date';
import type { Measurement } from '@/types/domain';

const COLORS = {
  primary: '#1B3A6B',
  chartBlue: '#2E5FA3',
  grayLight: '#F5F5F5',
  textPrimary: '#1A1A1A',
  textSecondary: '#888888',
  white: '#FFFFFF',
  green: '#2DB87B',
  orange: '#FF9800',
};

const MONTH_FULL_LABELS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function HistorialList() {
  const { data: measurements = [] } = useUserMeasurements();
  const { userId } = useAppSession();
  const supabaseClient = useSupabaseClient();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [precipitationType, setPrecipitationType] = useState<string | null>(null);
  const [startHour, setStartHour] = useState('00');
  const [endHour, setEndHour] = useState('23');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Edit modal state
  const [editingMeasurement, setEditingMeasurement] = useState<Measurement | null>(null);
  const [editMm, setEditMm] = useState('');
  const [isEditingLoading, setIsEditingLoading] = useState(false);
  
  const PAGE_SIZE = 20;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [navYear, setNavYear] = useState(currentYear);
  const [navMonth, setNavMonth] = useState(currentMonth);

  const monthMeasurements = useMemo(() => {
    return measurements.filter((m) => {
      const d = new Date(m.measuredAt);
      return d.getFullYear() === navYear && d.getMonth() === navMonth;
    });
  }, [measurements, navYear, navMonth]);

  const totalMm = monthMeasurements.reduce((acc, m) => acc + m.rainfallMm, 0);
  const daysWithRain = new Set(
    monthMeasurements.filter((m) => m.rainfallMm > 0).map((m) => toIsoDate(new Date(m.measuredAt)))
  ).size;

  const maxDayInMonth = useMemo(() => {
    return monthMeasurements.reduce(
      (acc, m) => (m.rainfallMm > acc.mm ? { mm: m.rainfallMm, date: m.measuredAt } : acc),
      { mm: 0, date: '' }
    );
  }, [monthMeasurements]);

  const maxDayDateStr = useMemo(() => {
    if (!maxDayInMonth.date) return 'N/A';
    return new Date(maxDayInMonth.date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [maxDayInMonth]);

  const filteredMeasurements = useMemo(() => {
    let filtered = monthMeasurements;

    // Filtro por búsqueda
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((m) => {
        const dateStr = toIsoDate(new Date(m.measuredAt)).toLowerCase();
        const obsStr = (m.observations || '').toLowerCase();
        const timeStr = new Date(m.measuredAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }).toLowerCase();
        return dateStr.includes(q) || obsStr.includes(q) || timeStr.includes(q);
      });
    }

    // Filtro por fecha específica
    if (selectedDate) {
      const selectedDateStr = toIsoDate(selectedDate);
      filtered = filtered.filter((m) => {
        const measurementDateStr = toIsoDate(new Date(m.measuredAt));
        return measurementDateStr === selectedDateStr;
      });
    }

    // Filtro por tipo de precipitación
    if (precipitationType) {
      filtered = filtered.filter((m) => {
        if (precipitationType === 'dry') return m.rainfallMm === 0 || m.noRain;
        if (precipitationType === 'light') return m.rainfallMm > 0 && m.rainfallMm < 10;
        if (precipitationType === 'moderate') return m.rainfallMm >= 10 && m.rainfallMm <= 20;
        if (precipitationType === 'intense') return m.rainfallMm > 20;
        return true;
      });
    }

    // Filtro por hora
    const startH = parseInt(startHour);
    const endH = parseInt(endHour);
    filtered = filtered.filter((m) => {
      const hour = new Date(m.measuredAt).getHours();
      return hour >= startH && hour <= endH;
    });

    return filtered;
  }, [monthMeasurements, searchQuery, selectedDate, precipitationType, startHour, endHour]);

  const paginatedMeasurements = filteredMeasurements.slice(0, (page + 1) * PAGE_SIZE);
  const hasMore = paginatedMeasurements.length < filteredMeasurements.length;

  const navigateMonth = (delta: number) => {
    let m = navMonth + delta;
    let y = navYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setNavMonth(m);
    setNavYear(y);
    setPage(0);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDate(null);
    setPrecipitationType(null);
    setStartHour('00');
    setEndHour('23');
    setPage(0);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const formatMonthBadge = (iso: string) => {
    return new Date(iso).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }).toUpperCase();
  };

  const getPrecipitationLabel = (mm: number, noRain: boolean) => {
    if (mm === 0 || noRain) return 'Sin lluvia';
    if (mm < 10) return 'Ligera';
    if (mm <= 20) return 'Moderada';
    return 'Intensa';
  };

  const openEditModal = (measurement: Measurement) => {
    setEditingMeasurement(measurement);
    setEditMm(measurement.rainfallMm.toString());
  };

  const saveEditedMeasurement = async () => {
    if (!editingMeasurement || !editMm.trim()) {
      Alert.alert('Error', 'Por favor ingresa un valor válido.');
      return;
    }

    const newMm = parseFloat(editMm);
    if (isNaN(newMm) || newMm < 0) {
      Alert.alert('Error', 'Por favor ingresa un número válido mayor o igual a 0.');
      return;
    }

    setIsEditingLoading(true);
    try {
      // Calculate the equivalent volume in ml (tank is 1m x 1m = 10,000 cm²)
      const newVolumeMl = newMm > 0 ? newMm * 10000 : null;

      // Update in Supabase
      const { error } = await supabaseClient
        .from('measurements')
        .update({
          rainfall_mm: newMm,
          volume_ml: newVolumeMl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingMeasurement.id);

      if (error) {
        Alert.alert('Error', 'No se pudo guardar el cambio.');
        return;
      }

      // Update in SQLite
      updateLocalMeasurement({
        ...editingMeasurement,
        rainfallMm: newMm,
        volumeMl: newVolumeMl,
        updatedAt: new Date().toISOString(),
      });

      // Invalidate cache to refresh
      queryClient.invalidateQueries({ queryKey: ['user-measurements', userId as string] });

      Alert.alert('Éxito', 'Medición actualizada correctamente.');
      setEditingMeasurement(null);
      setEditMm('');
    } catch (error) {
      console.error('Error editing measurement:', error);
      Alert.alert('Error', 'Ocurrió un error al guardar.');
    } finally {
      setIsEditingLoading(false);
    }
  };

  return (
    <View style={styles.listContainer}>
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.monthNavBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.monthNavTitle}>{MONTH_FULL_LABELS[navMonth]} {navYear}</Text>
        <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.monthNavBtn}>
          <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.totalAnnualCard}>
        <Text style={styles.totalAnnualLabel}>ACUMULADO MENSUAL</Text>
        <Text style={styles.totalAnnualValue}>{totalMm.toFixed(1)} mm</Text>
        <Text style={styles.totalAnnualSubtext}>
          Días con lluvia: {daysWithRain} días
        </Text>
      </View>

      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Máxima Registrada</Text>
          <Text style={styles.intensityValue}>{maxDayInMonth.mm.toFixed(1)} mm</Text>
          <Text style={styles.intensitySubtext}>Registrado el {maxDayDateStr}</Text>
        </Card.Content>
      </Card>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={18} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Buscar observación..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={(t) => { setSearchQuery(t); setPage(0); }}
        />
      </View>

      {/* Filter Toggle */}
      <TouchableOpacity 
        style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Ionicons name={showFilters ? "filter" : "filter"} size={18} color={showFilters ? COLORS.primary : COLORS.textSecondary} />
        <Text style={[styles.filterToggleText, showFilters && styles.filterToggleTextActive]}>
          {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
        </Text>
        <Ionicons name={showFilters ? "chevron-up" : "chevron-down"} size={18} color={showFilters ? COLORS.primary : COLORS.textSecondary} />
      </TouchableOpacity>

      {/* Advanced Filters */}
      {showFilters && (
        <Card style={styles.filterCard}>
          <Card.Content style={styles.filterContent}>
            {/* Date Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>📅 Seleccionar Fecha</Text>
              <TouchableOpacity 
                style={[styles.dateButton, selectedDate && styles.dateButtonActive]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={18} color={selectedDate ? COLORS.primary : COLORS.textSecondary} />
                <Text style={[styles.dateButtonText, selectedDate && styles.dateButtonTextActive]}>
                  {selectedDate ? selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Toca para seleccionar fecha'}
                </Text>
              </TouchableOpacity>
              {selectedDate && (
                <TouchableOpacity style={styles.clearDateButton} onPress={() => { setSelectedDate(null); setPage(0); }}>
                  <Text style={styles.clearDateButtonText}>✕ Limpiar fecha</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Precipitation Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>🌧️ Tipo de Precipitación</Text>
              <View style={styles.filterButtonsRow}>
                {[
                  { id: 'dry', label: '☁️ Sin lluvia', icon: '☁️' },
                  { id: 'light', label: '🌤️ Ligera', icon: '🌤️' },
                  { id: 'moderate', label: '🌧️ Moderada', icon: '🌧️' },
                  { id: 'intense', label: '⛈️ Intensa', icon: '⛈️' },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.filterButton,
                      precipitationType === type.id && styles.filterButtonActive,
                    ]}
                    onPress={() => {
                      setPrecipitationType(precipitationType === type.id ? null : type.id);
                      setPage(0);
                    }}
                  >
                    <Text style={styles.filterButtonEmoji}>{type.icon}</Text>
                    <Text
                      style={[
                        styles.filterButtonLabel,
                        precipitationType === type.id && styles.filterButtonLabelActive,
                      ]}
                    >
                      {type.label.split(' ')[1]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Hour Range Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>🕐 Rango de Hora</Text>
              <View style={styles.hourFilterRow}>
                <View style={styles.hourFilter}>
                  <Text style={styles.hourLabel}>Desde:</Text>
                  <View style={styles.hourInputGroup}>
                    <TouchableOpacity 
                      onPress={() => setStartHour(String((parseInt(startHour) - 1 + 24) % 24).padStart(2, '0'))}
                      style={styles.hourButton}
                    >
                      <Ionicons name="remove" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.hourValue}>{startHour}:00</Text>
                    <TouchableOpacity 
                      onPress={() => setStartHour(String((parseInt(startHour) + 1) % 24).padStart(2, '0'))}
                      style={styles.hourButton}
                    >
                      <Ionicons name="add" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.hourFilter}>
                  <Text style={styles.hourLabel}>Hasta:</Text>
                  <View style={styles.hourInputGroup}>
                    <TouchableOpacity 
                      onPress={() => setEndHour(String((parseInt(endHour) - 1 + 24) % 24).padStart(2, '0'))}
                      style={styles.hourButton}
                    >
                      <Ionicons name="remove" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.hourValue}>{endHour}:00</Text>
                    <TouchableOpacity 
                      onPress={() => setEndHour(String((parseInt(endHour) + 1) % 24).padStart(2, '0'))}
                      style={styles.hourButton}
                    >
                      <Ionicons name="add" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Clear Filters Button */}
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Ionicons name="close-circle" size={18} color={COLORS.white} />
              <Text style={styles.clearButtonText}>Limpiar Filtros</Text>
            </TouchableOpacity>
          </Card.Content>
        </Card>
      )}

      {/* Results */}
      {paginatedMeasurements.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Sin registros para esa fecha</Text>
        </View>
      ) : (
        <>
          {paginatedMeasurements.map((m, i) => (
            <View key={m.id ?? i} style={styles.listItem}>
              <View style={styles.listItemContent}>
                <View style={styles.listItemLeft}>
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateBadgeText}>{formatMonthBadge(m.measuredAt)}</Text>
                  </View>
                  <View style={styles.listItemInfo}>
                    <Text style={styles.listItemTime}>{formatTime(m.measuredAt)}</Text>
                    <Text style={styles.listItemPrecip}>{getPrecipitationLabel(m.rainfallMm, m.noRain)}</Text>
                  </View>
                </View>
                <View style={styles.listItemRight}>
                  <Text style={styles.listItemMm}>{m.rainfallMm.toFixed(1)} mm</Text>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => openEditModal(m)}
                  >
                    <Ionicons name="pencil" size={16} color={COLORS.chartBlue} />
                  </TouchableOpacity>
                </View>
              </View>
              {m.observations && (
                <Text style={styles.listItemObservations}>💬 {m.observations}</Text>
              )}
              {i < paginatedMeasurements.length - 1 && <View style={styles.listSeparator} />}
            </View>
          ))}
          {hasMore && (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={() => setPage((p) => p + 1)}>
              <Text style={styles.loadMoreBtnText}>Cargar más</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            if (Platform.OS === 'android') {
              setShowDatePicker(false);
              if (event.type === 'set' && date) {
                setSelectedDate(date);
                setPage(0);
              }
            } else if (date) {
              setSelectedDate(date);
              setPage(0);
            }
          }}
          maximumDate={new Date()}
        />
      )}
      {Platform.OS === 'ios' && showDatePicker && (
        <View style={styles.datePickerContainer}>
          <TouchableOpacity 
            style={styles.datePickerDone}
            onPress={() => setShowDatePicker(false)}
          >
            <Text style={styles.datePickerDoneText}>Hecho</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Edit Modal */}
      <Modal
        visible={editingMeasurement !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingMeasurement(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Medición</Text>
              <TouchableOpacity
                onPress={() => setEditingMeasurement(null)}
                disabled={isEditingLoading}
              >
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {editingMeasurement && (
              <>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalInfoLabel}>Fecha y Hora:</Text>
                  <Text style={styles.modalInfoValue}>
                    {new Date(editingMeasurement.measuredAt).toLocaleString('es-ES')}
                  </Text>
                </View>

                <TextInput
                  style={styles.modalInput}
                  placeholder="Lluvia (mm)"
                  placeholderTextColor={COLORS.textSecondary}
                  value={editMm}
                  onChangeText={setEditMm}
                  keyboardType="numeric"
                  editable={!isEditingLoading}
                />

                <View style={styles.modalButtonContainer}>
                  <Button
                    mode="outlined"
                    onPress={() => setEditingMeasurement(null)}
                    disabled={isEditingLoading}
                    style={styles.modalButton}
                  >
                    Cancelar
                  </Button>
                  <Button
                    mode="contained"
                    onPress={saveEditedMeasurement}
                    loading={isEditingLoading}
                    disabled={isEditingLoading}
                    buttonColor={COLORS.primary}
                    textColor={COLORS.white}
                    style={styles.modalButton}
                  >
                    Guardar
                  </Button>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: { gap: 16 },
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
  sectionCard: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  intensityValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  intensitySubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.grayLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  listItem: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 10,
    padding: 12,
  },
  listItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  listItemTime: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  listItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listItemMm: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  listItemIcon: {
    fontSize: 16,
  },
  listSeparator: {
    height: 1,
    backgroundColor: COLORS.white,
    marginTop: 10,
  },
  loadMoreBtn: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  loadMoreBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.grayLight,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterToggleActive: {
    borderColor: COLORS.primary,
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterToggleTextActive: {
    color: COLORS.primary,
  },
  filterCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  filterContent: {
    gap: 16,
  },
  filterSection: {
    gap: 12,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  filterButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: COLORS.grayLight,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  filterButtonEmoji: {
    fontSize: 18,
  },
  filterButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterButtonLabelActive: {
    color: COLORS.primary,
  },
  hourFilterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  hourFilter: {
    flex: 1,
    gap: 8,
  },
  hourLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  hourInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.grayLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  hourButton: {
    padding: 4,
  },
  hourValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    minWidth: 60,
    textAlign: 'center',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    marginTop: 8,
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  listItemInfo: {
    flexDirection: 'column',
    gap: 2,
  },
  listItemPrecip: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  listItemObservations: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.white,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: COLORS.grayLight,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dateButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  dateButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  dateButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  clearDateButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    borderRadius: 6,
    backgroundColor: COLORS.grayLight,
  },
  clearDateButtonText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  datePickerContainer: {
    backgroundColor: COLORS.grayLight,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.textSecondary + '30',
  },
  datePickerDone: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  datePickerDoneText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  // Edit Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalInfo: {
    marginBottom: 16,
  },
  modalInfoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  modalInfoValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
  editButton: {
    padding: 4,
  },
});