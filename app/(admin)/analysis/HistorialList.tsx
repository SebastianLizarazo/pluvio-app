import { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import { useUserMeasurements } from '@/hooks/useUserMeasurements';
import { toIsoDate } from '@/utils/date';

const COLORS = {
  primary: '#1B3A6B',
  chartBlue: '#2E5FA3',
  grayLight: '#F5F5F5',
  textPrimary: '#1A1A1A',
  textSecondary: '#888888',
  white: '#FFFFFF',
};

const MONTH_FULL_LABELS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function HistorialList() {
  const { data: measurements = [] } = useUserMeasurements();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getUTCMonth();
  const [navYear, setNavYear] = useState(currentYear);
  const [navMonth, setNavMonth] = useState(currentMonth);

  const monthMeasurements = useMemo(() => {
    return measurements.filter((m) => {
      const d = new Date(m.measuredAt);
      return d.getUTCFullYear() === navYear && d.getUTCMonth() === navMonth;
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
    if (!searchQuery.trim()) return monthMeasurements;
    const q = searchQuery.toLowerCase();
    return monthMeasurements.filter((m) => toIsoDate(new Date(m.measuredAt)).includes(q));
  }, [monthMeasurements, searchQuery]);

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

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const formatMonthBadge = (iso: string) => {
    return new Date(iso).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }).toUpperCase();
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
          <Text style={styles.sectionTitle}>Intensidad Máxima</Text>
          <Text style={styles.intensityValue}>{maxDayInMonth.mm.toFixed(1)} mm/h</Text>
          <Text style={styles.intensitySubtext}>Registrado el {maxDayDateStr}</Text>
        </Card.Content>
      </Card>

      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={18} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Buscar por fecha u observación..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={(t) => { setSearchQuery(t); setPage(0); }}
        />
      </View>

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
                  <Text style={styles.listItemTime}>{formatTime(m.measuredAt)}</Text>
                </View>
                <View style={styles.listItemRight}>
                  <Text style={styles.listItemMm}>{m.rainfallMm.toFixed(1)} mm</Text>
                  <Text style={styles.listItemIcon}>{m.rainfallMm > 0 ? '🌧' : '☁️'}</Text>
                </View>
              </View>
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
});