import { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import { useAnalytics } from '@/hooks/useAnalytics';
import { useUserMeasurements } from '@/hooks/useUserMeasurements';
import { ANALYTICS_DEFAULTS } from '@/constants/app';
import { toIsoDate } from '@/utils/date';

type CalendarCell = {
  day: number | null;
  mm: number;
  isToday: boolean;
  noRain: boolean; // true = usuario registró "no hubo lluvia"
  hasRecord: boolean; // true = hay algún registro (lluvia o noRain)
};

const COLORS = {
  primary: '#1B3A6B',
  chartBlue: '#2E5FA3',
  green: '#2DB87B',
  grayLight: '#F5F5F5',
  textPrimary: '#1A1A1A',
  textSecondary: '#888888',
  textTertiary: '#2DB87B',
  white: '#FFFFFF',
  redSoft: '#D32F2F', // para interrogación sin registro
};

const MONTH_FULL_LABELS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEKDAY_LABELS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

export function HistorialCalendar() {
  const now = new Date();
  const [navYear, setNavYear] = useState(now.getUTCFullYear());
  const [navMonth, setNavMonth] = useState(now.getUTCMonth());

  const { monthTotals, dailySeries } = useAnalytics(navYear, ANALYTICS_DEFAULTS.drySeasonThresholdMm);
  const { data: measurements = [] } = useUserMeasurements();

  const monthTotalMm = monthTotals[navMonth]?.totalMm ?? 0;

  const { daysWithRainInMonth, avgMmPerDayInMonth, maxDayInMonth } = useMemo(() => {
    const daysInMonth = new Date(Date.UTC(navYear, navMonth + 1, 0)).getUTCDate();
    const startDayOfYear = Math.floor((Date.UTC(navYear, navMonth, 1) - Date.UTC(navYear, 0, 0)) / 86400000);

    const dayMap = new Map<number, number>();
    dailySeries.forEach((d, i) => {
      const dayOfYear = i + 1;
      if (dayOfYear > startDayOfYear && dayOfYear <= startDayOfYear + daysInMonth) {
        dayMap.set(dayOfYear, d.mm);
      }
    });

    const count = Array.from(dayMap.values()).filter((v) => v > 0).length;
    const sum = Array.from(dayMap.values()).reduce((a, b) => a + b, 0);
    const avg = count > 0 ? sum / count : 0;
    let max = { mm: 0, day: 0 };
    dayMap.forEach((mm, day) => {
      if (mm > max.mm) {
        max = { mm, day };
      }
    });

    return { daysWithRainInMonth: count, avgMmPerDayInMonth: avg, maxDayInMonth: max };
  }, [dailySeries, navMonth, navYear]);

  const maxDayInMonthDateStr = useMemo(() => {
    if (maxDayInMonth.day <= 0 || maxDayInMonth.mm <= 0) return 'N/A';
    const startDayOfYear = Math.floor((Date.UTC(navYear, navMonth, 1) - Date.UTC(navYear, 0, 0)) / 86400000);
    const actualDay = maxDayInMonth.day - startDayOfYear;
    if (actualDay < 1 || actualDay > 31) return 'N/A';
    const date = new Date(Date.UTC(navYear, navMonth, actualDay));
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  }, [navYear, navMonth, maxDayInMonth]);

  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(Date.UTC(navYear, navMonth + 1, 0)).getUTCDate();
    const firstDayOfWeek = new Date(Date.UTC(navYear, navMonth, 1)).getUTCDay();
    const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const todayIso = toIsoDate(now);

    // Build a Set of dates that have any measurement (regardless of mm value)
    // This correctly distinguishes: user registered "no rain" (date in set, mm=0)
    // vs user didn't register at all (date not in set)
    const measurementDates = new Set<string>();
    measurements.forEach((m) => {
      const key = toIsoDate(new Date(m.measuredAt));
      measurementDates.add(key);
    });

// Build a date -> mm map directly from measurements for accurate lookup
    const dateToMm = new Map<string, number>();
    measurements.forEach((m) => {
      const key = toIsoDate(new Date(m.measuredAt));
      const current = dateToMm.get(key) ?? 0;
      dateToMm.set(key, current + m.rainfallMm);
    });

    const cells: CalendarCell[] = [];

    for (let i = 0; i < adjustedFirstDay; i++) {
      cells.push({ day: null, mm: 0, isToday: false, noRain: false, hasRecord: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const mm = dateToMm.get(toIsoDate(new Date(Date.UTC(navYear, navMonth, d)))) ?? 0;
      const dateIso = toIsoDate(new Date(Date.UTC(navYear, navMonth, d)));
      const isToday = dateIso === todayIso;
      const hasRecord = measurementDates.has(dateIso);

      // noRain: there's a record but mm is 0 (user explicitly said "no rain")
      cells.push({
        day: d,
        mm,
        isToday,
        noRain: hasRecord && mm === 0,
        hasRecord,
      });
    }

    // Rellenar la última fila para que siempre tenga 7 columnas
    // Así el día 30 no queda flotando solo
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      for (let i = 0; i < 7 - remainder; i++) {
        cells.push({ day: null, mm: 0, isToday: false, noRain: false, hasRecord: false });
      }
    }

    return cells;
  }, [navMonth, navYear, now, measurements]);

  const getCellIcons = (cell: CalendarCell) => {
    // Sin registro ese día
    if (!cell.hasRecord) {
      return { count: 1, name: 'help-circle' as const, color: COLORS.redSoft, size: 14 };
    }
    // Usuario registró que NO hubo lluvia
    if (cell.noRain) {
      return { count: 1, name: 'water' as const, color: '#E0E0E0', size: 14 };
    }
    // Hay registro de lluvia — cantidad según intensidad
    if (cell.mm > 20) {
      return { count: 3, name: 'water' as const, color: COLORS.primary, size: 12 };
    }
    if (cell.mm >= 10) {
      return { count: 2, name: 'water' as const, color: COLORS.primary, size: 12 };
    }
    if (cell.mm > 0) {
      return { count: 1, name: 'water' as const, color: COLORS.primary, size: 14 };
    }
    // Registro pero sin lluvia (no debería ocurrir si noRain cubre todo)
    return { count: 1, name: 'water' as const, color: '#E0E0E0', size: 14 };
  };

  const navigateMonth = (delta: number) => {
    let m = navMonth + delta;
    let y = navYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setNavMonth(m);
    setNavYear(y);
  };

  // ============================================================
  // ESTRUCTURA DEL CALENDARIO
  // ============================================================
  //
  // El calendario usa un Grid de 7 columnas (una por día de la semana).
  // Cada fila del grid contiene 7 celdas. El grid usa:
  //   - flexDirection: 'row' + flexWrap: 'wrap' para crear filas
  //   - gap: 4 para espaciado entre celdas
  //
  // CONTENEDOR PRINCIPAL: calendarContainer (gap: 16 entre elementos)
  //
  // ELEMENTOS DEL CALENDARIO (de arriba hacia abajo):
  // 1. monthNav: navegación del mes (←Mes Año→)
  // 2. monthMetricCard: barra azul con el total mensual en mm
  // 3. calendarGrid: grilla principal con encabezados y celdas de días
  // 4. legendRow: leyenda con los iconos y su significado
  // 5. monthStatsRow: 2 cards (días con lluvia, promedio/día)
  // 6. recordCard: record diario con fecha
  //
  // ============================================================

  return (
    <View style={styles.calendarContainer}>
      {/*
       * 1. NAVEGACIÓN DE MES
       * Flechas para ir al mes anterior/siguiente + nombre del mes
       */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.monthNavBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.monthNavTitle}>{MONTH_FULL_LABELS[navMonth]} {navYear}</Text>
        <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.monthNavBtn}>
          <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/*
       * 2. BARRA DE TOTAL MENSUAL
       * Fondo azul, muestra el total acumulado del mes en mm
       */}
      <View style={styles.monthMetricCard}>
        <Text style={styles.monthMetricLabel}>TOTAL MENSUAL</Text>
        <Text style={styles.monthMetricValue}>{monthTotalMm.toFixed(1)} mm</Text>
      </View>

      {/*
       * 3. GRILLA DEL CALENDARIO
       *
       * Esta es la parte más importante del diseño.
       *
       * El grid se arma con flexbox:
       *   - flexDirection: 'row' → los elementos se colocan en filas
       *   - flexWrap: 'wrap' → si no entran en la fila, pasan a la siguiente
       *   - backgroundColor: grayLight (fondo de toda la grilla)
       *   - gap: 4 → espaciado de 4px entre celdas
       *
       * ESTRUCTURA DEL GRID:
       * - Primero se renderizan los 7 encabezados de día (LUN...DOM)
       * - Luego se renderizan las celdas de los días del mes
       * - Los días vacíos (null) tienen backgroundColor transparente
       *
       * ANCHO DE CADA CELDA:
       *   width: (100 - 2) / 7 = 98/7 = 14%
       *   - El 2% restante es para el gap total (gap: 4px multiplicado por 7 columnas = 28px ~ 2% del contenedor)
       *   - aspectRatio: 1 → mantiene celdas cuadradas
       *   - borderRadius: 8 → esquinas redondeadas
       *
       * MAPEO DE DÍAS A CELDAS:
       * - calendarDays es un array que empieza con celdas vacías (null)
       *   para compensar el offset del primer día del mes
       * - adjustedFirstDay = qué día de la semana empieza el mes
       *   (lunes=0, domingo=6, ajustando para que lunes sea 0 y domingo 6)
       * - Ejemplo: si el mes empieza en miércoles, las primeras 2 celdas son null (lun, mar)
       */}
      <View style={styles.calendarGrid}>
        {/*
         * FILA DE ENCABEZADO (días de semana: LUN...DOM)
         * Cada celda usa flex: 1 → exactamente 1/7 del ancho
         */}
        <View style={styles.calendarRow}>
          {WEEKDAY_LABELS.map((d) => (
            <View key={d} style={styles.calendarWeekdayCell}>
              <Text style={styles.calendarWeekdayText}>{d}</Text>
            </View>
          ))}
        </View>

        {/*
         * FILAS DE DÍAS DEL MES
         * Cada fila tiene 7 celdas explícitamente
         * flex: 1 en cada celda = 1/7 del ancho sin cálculos de porcentajes
         */}
        {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, rowIndex) => (
          <View key={rowIndex} style={styles.calendarRow}>
            {calendarDays.slice(rowIndex * 7, rowIndex * 7 + 7).map((cell, i) => {
              const icon = getCellIcons(cell);
              return (
                <View
                  key={i}
                  style={[
                    styles.calendarCell,
                    cell.isToday && styles.calendarCellToday,
                    cell.day === null && styles.calendarCellEmpty,
                  ]}
                >
                  {cell.day !== null && (
                    <>
                      <Text style={[styles.calendarDayNum, cell.isToday && styles.calendarDayNumToday]}>
                        {cell.day}
                      </Text>
                      <View style={styles.iconRow}>
                        {Array.from({ length: icon.count }).map((_, idx) => (
                          <Ionicons
                            key={idx}
                            name={icon.name}
                            size={icon.size}
                            color={icon.color}
                          />
                        ))}
                      </View>
                    </>
                  )}
                </View>
              );
            })}
          </View>
))}
      </View>

      {/*
       * 4. LEYENDA
       * Muestra los iconos y qué significa cada uno
       */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={styles.iconRow}>
            <Ionicons name="water" size={12} color={COLORS.primary} />
          </View>
          <Text style={styles.legendText}>Lluvia suave ({'<'}10mm)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.iconRow}>
            <Ionicons name="water" size={12} color={COLORS.primary} />
            <Ionicons name="water" size={12} color={COLORS.primary} />
          </View>
          <Text style={styles.legendText}>Moderada (10-20mm)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.iconRow}>
            <Ionicons name="water" size={12} color={COLORS.primary} />
            <Ionicons name="water" size={12} color={COLORS.primary} />
            <Ionicons name="water" size={12} color={COLORS.primary} />
          </View>
          <Text style={styles.legendText}>Intensa ({'>'}20mm)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.iconRow}>
            <Ionicons name="water" size={12} color="#E0E0E0" />
          </View>
          <Text style={styles.legendText}>Sin lluvia</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="help-circle" size={14} color={COLORS.redSoft} />
          <Text style={styles.legendText}>Sin registro</Text>
        </View>
      </View>

      {/*
       * 5. ESTADÍSTICAS DEL MES
       * 2 cards: días con lluvia y promedio por día
       */}
      <View style={styles.monthStatsRow}>
        <Card style={[styles.monthStatCard, { backgroundColor: COLORS.grayLight }]}>
          <Card.Content>
            <Text style={[styles.monthStatLabel, { color: COLORS.textTertiary }]}>DÍAS CON LLUVIA</Text>
            <Text style={styles.monthStatValue}>{daysWithRainInMonth}</Text>
          </Card.Content>
        </Card>
        <Card style={[styles.monthStatCard, { backgroundColor: COLORS.grayLight }]}>
          <Card.Content>
            <Text style={styles.monthStatLabel}>PROMEDIO/DÍA</Text>
            <Text style={styles.monthStatValue}>{avgMmPerDayInMonth.toFixed(1)} mm</Text>
          </Card.Content>
        </Card>
      </View>

      {/*
       * 6. RÉCORD DIARIO
       * Barra azul con el día más llovioso del mes
       */}
      <View style={styles.recordCard}>
        <Text style={styles.recordLabel}>RÉCORD DIARIO</Text>
        <Text style={styles.recordValue}>{maxDayInMonth.mm.toFixed(1)} mm</Text>
        <View style={styles.recordRow}>
          <Ionicons name="rainy" size={16} color={COLORS.white} />
          <Text style={styles.recordDate}>{maxDayInMonthDateStr}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Contenedor principal del calendario
  calendarContainer: { gap: 16 },

  // Navegación de mes (flechas y título)
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
  monthMetricCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  monthMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    opacity: 0.8,
    letterSpacing: 1,
  },
  monthMetricValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 4,
  },
  // -------------------------------------------------------
  // GRILLA PRINCIPAL (CalendarGrid)
  // -------------------------------------------------------
  // backgroundColor: grayLight = fondo de toda la grilla
  // borderRadius: 12 = esquinas del contenedor redondeadas
  // padding: 8 = margen interno del contenedor
  // gap: 3 = espaciado vertical entre filas de días
  // Ya no usa flexWrap - ahora usa filas explícitas con calendarRow
  // -------------------------------------------------------
calendarGrid: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
    padding: 8,
    gap: 3,
  },

  // -------------------------------------------------------
  // FILA HORIZONTAL (encabezado y cada fila de días)
  // -------------------------------------------------------
  // flexDirection: 'row' → elementos en horizontal
  // gap: 3 → espaciado entre celdas de la misma fila
  // Esto reemplaza el viejo problema de (100-2)/7%
  // -------------------------------------------------------
  calendarRow: {
    flexDirection: 'row',
    gap: 3,
  },

  // -------------------------------------------------------
  // CELDAS DE ENCABEZADO (días de semana: LUN...DOM)
  // -------------------------------------------------------
  // flex: 1 → exactamente 1/7 del ancho disponible
  // No más cálculos de porcentaje, flex lo maneja solo
  // -------------------------------------------------------
  calendarWeekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },

  // -------------------------------------------------------
  // CELDAS DE DÍAS DEL MES
  // -------------------------------------------------------
  // Mismo ancho que encabezado: ~(100-2)/7 = ~14%
  // aspectRatio: 1 → celda cuadrada (importante para íconos)
  // borderRadius: 8 → esquinas redondeadas
  // backgroundColor: white → fondo blanco por celda
  // -------------------------------------------------------
  calendarWeekdayText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
// -------------------------------------------------------
  // CELDAS DE DÍAS DEL MES
  // -------------------------------------------------------
  // flex: 1 → exactamente 1/7 del ancho disponible
  // aspectRatio: 1 → celda cuadrada
  // -------------------------------------------------------
  calendarCell: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  calendarCellToday: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  calendarCellEmpty: {
    backgroundColor: 'transparent',
  },
  calendarDayNum: {
    fontSize: 10,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  calendarDayNumToday: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  // -------------------------------------------------------
  // FILA DE ICONOS (dentro de cada celda de día)
  // -------------------------------------------------------
  // flexDirection: 'row' → iconos uno al lado del otro
  // gap: 1 → espaciado mínimo entre los iconos (gotas)
  // alignItems/justifyContent: 'center' → iconos centrados
  // -------------------------------------------------------
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  calendarMm: {
    fontSize: 8,
    fontWeight: '600',
  },
  calendarCellDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  monthStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  monthStatCard: {
    flex: 1,
    borderRadius: 12,
  },
  monthStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  monthStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  recordCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  recordLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    opacity: 0.8,
    letterSpacing: 1,
  },
  recordValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    marginVertical: 4,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordDate: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.9,
  },
});