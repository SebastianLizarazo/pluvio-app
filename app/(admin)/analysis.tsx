import { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, Dimensions, FlatList } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import { useUserMeasurements } from '@/hooks/useUserMeasurements';
import { useAnalytics } from '@/hooks/useAnalytics';
import { TANK_DEFAULT_LIMITS, ANALYTICS_DEFAULTS } from '@/constants/app';
import { mmToLiters } from '@/utils';
import { toIsoDate, getYearMonth } from '@/utils/date';
import type { Measurement } from '@/types/domain';

const TABS = ['Panel', 'Anual', 'Historial'] as const;
type Tab = (typeof TABS)[number];

const HISTORIAL_TABS = ['Calendario', 'Lista'] as const;
type HistorialTab = (typeof HISTORIAL_TABS)[number];

const COLORS = {
  primary: '#1B3A6B',
  chartBlue: '#2E5FA3',
  green: '#2DB87B',
  grayLight: '#F5F5F5',
  textPrimary: '#1A1A1A',
  textSecondary: '#888888',
  white: '#FFFFFF',
  grayMedium: '#D0D5DD',
  orange: '#F57C00',
};

const MONTH_FULL_LABELS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTH_SHORT_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const WEEKDAY_LABELS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <View style={styles.tabBar}>
      {TABS.map((t) => (
        <TouchableOpacity key={t} style={[styles.tab, active === t && styles.tabActive]} onPress={() => onChange(t)}>
          <Text style={[styles.tabText, active === t && styles.tabTextActive]}>{t}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function HistorialSubTabBar({ active, onChange }: { active: HistorialTab; onChange: (t: HistorialTab) => void }) {
  return (
    <View style={styles.subTabBar}>
      {HISTORIAL_TABS.map((t) => (
        <TouchableOpacity key={t} style={[styles.subTab, active === t && styles.subTabActive]} onPress={() => onChange(t)}>
          <Text style={[styles.subTabText, active === t && styles.subTabTextActive]}>
            {t === 'Calendario' ? '📅 Calendario' : '≡ Lista'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Reusable Components ───────────────────────────────────────────────────────

function TankBar({ label, valueMm, limitMm, subtext }: { label: string; valueMm: number; limitMm: number; subtext: string }) {
  const pct = Math.min((valueMm / limitMm) * 100, 100);
  return (
    <View style={styles.tankCard}>
      <View style={styles.tankHeader}>
        <Text style={styles.tankLabel}>{label}</Text>
        <Text style={styles.tankValue}>
          {valueMm.toFixed(1)} mm <Text style={styles.tankSubtext}>/ {limitMm} mm</Text>
        </Text>
      </View>
      <View style={styles.tankBarOuter}>
        <View style={styles.tankBarMarks}>
          {[25, 50, 75, 100].map((mark) => (
            <View key={mark} style={[styles.tankMark, { left: `${mark}%` }]} />
          ))}
        </View>
        <View style={[styles.tankBarFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.tankSubtextBottom}>{subtext}</Text>
    </View>
  );
}

function MonthBarChart({ data, maxMonth }: { data: { label: string; totalMm: number }[]; maxMonth: string }) {
  const maxMm = Math.max(...data.map((d) => d.totalMm), 1);
  return (
    <View style={styles.barChartContainer}>
      <View style={styles.barChart}>
        {data.map((item, i) => {
          const isTop = item.label === maxMonth;
          const height = (item.totalMm / maxMm) * 120;
          return (
            <View key={i} style={styles.barWrapper}>
              <View style={styles.barInner}>
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: isTop ? COLORS.chartBlue : COLORS.grayMedium,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, isTop && styles.barLabelActive]}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ProgressBar({ pct, color = COLORS.chartBlue }: { pct: number; color?: string }) {
  return (
    <View style={styles.progressBarOuter}>
      <View style={[styles.progressBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

// ─── Panel Content ─────────────────────────────────────────────────────────────

function PanelContent() {
  const currentYear = new Date().getFullYear();
  const { data: measurements = [] } = useUserMeasurements();
  const { monthTotals, topWet, maxRainDay, bestDryStreak, wetSeason, drySeason } = useAnalytics(currentYear, ANALYTICS_DEFAULTS.drySeasonThresholdMm);
  const { todayTotalMm, monthTotalMm, semesterTotalMm } = useUserMeasurements();

  const litersDay = mmToLiters(todayTotalMm, 20);
  const litersMonth = mmToLiters(monthTotalMm, 20);
  const litersSemester = mmToLiters(semesterTotalMm, 20);

  const totalAnnualMm = useMemo(() => {
    return monthTotals.reduce((acc, m) => acc + m.totalMm, 0);
  }, [monthTotals]);

  const prevYearAnalytics = useAnalytics(currentYear - 1, ANALYTICS_DEFAULTS.drySeasonThresholdMm);
  const prevYearTotal = useMemo(() => {
    return prevYearAnalytics.monthTotals.reduce((acc, m) => acc + m.totalMm, 0);
  }, [prevYearAnalytics]);

  const pctChange = prevYearTotal > 0 ? ((totalAnnualMm - prevYearTotal) / prevYearTotal) * 100 : 0;

  const maxWetMonthMm = topWet.length > 0 ? topWet[0].totalMm : 1;

  const maxRainDayDateStr = useMemo(() => {
    if (maxRainDay.day <= 0 || maxRainDay.mm <= 0) return 'N/A';
    const date = new Date(Date.UTC(currentYear, 0, maxRainDay.day));
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  }, [currentYear, maxRainDay]);

  return (
    <View style={styles.panelContainer}>
      {/* Hero Métrica Anual */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>ANÁLISIS ANUAL {currentYear}</Text>
        <Text style={styles.heroValue}>{totalAnnualMm.toFixed(1)} mm</Text>
        {pctChange !== 0 && (
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>
              {pctChange > 0 ? '↑' : '↓'} {pctChange > 0 ? '+' : ''}{pctChange.toFixed(1)}% vs {currentYear - 1}
            </Text>
          </View>
        )}
      </View>

      {/* 3 Tarjetas de periodo */}
      <TankBar
        label="HOY"
        valueMm={todayTotalMm}
        limitMm={TANK_DEFAULT_LIMITS.day}
        subtext={`${litersDay.toFixed(1)} L / M²`}
      />
      <TankBar
        label="ESTE MES"
        valueMm={monthTotalMm}
        limitMm={TANK_DEFAULT_LIMITS.month}
        subtext={`${litersMonth.toFixed(1)} L / M²`}
      />
      <TankBar
        label="SEMESTRE"
        valueMm={semesterTotalMm}
        limitMm={TANK_DEFAULT_LIMITS.semester}
        subtext={`${litersSemester.toFixed(1)} L / M²`}
      />

      {/* Registros Extremos */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Registros Extremos</Text>
          <View style={styles.extremeRow}>
            <View style={styles.extremeItem}>
              <Ionicons name="rainy" size={24} color={COLORS.chartBlue} />
              <View style={styles.extremeText}>
                <View style={styles.badge}>
                  <Text style={styles.badgeTextBlue}>MÁXIMO HISTÓRICO DIARIO</Text>
                </View>
                <Text style={styles.extremeValue}>{maxRainDay.mm.toFixed(1)} mm</Text>
                <Text style={styles.extremeSubtext}>{maxRainDayDateStr}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.extremeRow, { marginTop: 12 }]}>
            <View style={styles.extremeItem}>
              <Ionicons name="sunny" size={24} color={COLORS.orange} />
              <View style={styles.extremeText}>
                <View style={styles.badge}>
                  <Text style={styles.badgeTextOrange}>PERIODO DE SEQUÍA</Text>
                </View>
                <Text style={styles.extremeValue}>{bestDryStreak} Días</Text>
                <Text style={styles.extremeSubtext}>Sin precipitación registrable</Text>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Meses con Mayor Pluviosidad */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>MESES CON MAYOR PLUVIOSIDAD</Text>
          {topWet.map((m, i) => (
            <View key={m.key} style={styles.wetMonthRow}>
              <Text style={styles.wetMonthLabel}>
                {i + 1}. {MONTH_FULL_LABELS[monthTotals.findIndex((mt) => mt.key === m.key)] ?? m.label}
              </Text>
              <Text style={styles.wetMonthValue}>{m.totalMm.toFixed(1)} mm</Text>
              <View style={styles.wetMonthBarWrapper}>
                <View
                  style={[
                    styles.wetMonthBarFill,
                    { width: `${(m.totalMm / maxWetMonthMm) * 100}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Ciclos Estacionales */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Ciclos Estacionales</Text>
          <Text style={styles.seasonDesc}>Distribución de humedad por temporada actual.</Text>
          <View style={styles.seasonRow}>
            <View style={[styles.badge, { backgroundColor: COLORS.green + '20' }]}>
              <Text style={styles.badgeTextGreen}>TEMPORADA HÚMEDA</Text>
            </View>
            <Text style={styles.seasonList}>{wetSeason.join(' – ') || 'N/A'}</Text>
          </View>
          <View style={styles.seasonRow}>
            <View style={[styles.badge, { backgroundColor: COLORS.orange + '20' }]}>
              <Text style={styles.badgeTextOrange}>TEMPORADA SECA</Text>
            </View>
            <Text style={styles.seasonList}>{drySeason.join(' – ') || 'N/A'}</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Chips de navegación rápida */}
      <View style={styles.chipsRow}>
        <TouchableOpacity style={styles.chip}>
          <Text style={styles.chipText}>🕐 Histórico</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chip}>
          <Text style={styles.chipText}>📊 Predictivo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chip}>
          <Text style={styles.chipText}>💧 Hidrología</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Anual Content ─────────────────────────────────────────────────────────────

function AnualContent() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { monthTotals, maxRainDay, wetSeason, drySeason } = useAnalytics(selectedYear, ANALYTICS_DEFAULTS.drySeasonThresholdMm);
  const { data: measurements = [] } = useUserMeasurements();

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    measurements.forEach((m) => {
      years.add(new Date(m.measuredAt).getUTCFullYear());
    });
    years.add(currentYear);
    const sorted = Array.from(years).sort((a, b) => a - b);
    return sorted.slice(-3);
  }, [measurements, currentYear]);

  const totalYearMm = useMemo(() => {
    return monthTotals.reduce((acc, m) => acc + m.totalMm, 0);
  }, [monthTotals]);

  const litersPerHa = (totalYearMm * 10).toFixed(1);

  const daysWithRain = useMemo(() => {
    const days = new Set<string>();
    measurements
      .filter((m) => new Date(m.measuredAt).getUTCFullYear() === selectedYear && m.rainfallMm > 0)
      .forEach((m) => {
        days.add(toIsoDate(new Date(m.measuredAt)));
      });
    return days.size;
  }, [measurements, selectedYear]);

  const topMonth = useMemo(() => {
    return monthTotals.reduce((acc, m) => (m.totalMm > acc.totalMm ? m : acc), monthTotals[0]);
  }, [monthTotals]);

  const topMonthIndex = monthTotals.findIndex((m) => m.key === topMonth.key);
  const topMonthLabel = MONTH_FULL_LABELS[topMonthIndex] ?? topMonth.label;

  const avgMmPerDay = daysWithRain > 0 ? totalYearMm / daysWithRain : 0;

  const maxRainDayDateStr = useMemo(() => {
    if (maxRainDay.day <= 0 || maxRainDay.mm <= 0) return 'N/A';
    const date = new Date(Date.UTC(selectedYear, 0, maxRainDay.day));
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  }, [selectedYear, maxRainDay]);

  const prevYearAnalytics = useAnalytics(selectedYear - 1, ANALYTICS_DEFAULTS.drySeasonThresholdMm);
  const prevYearTotal = useMemo(() => {
    return prevYearAnalytics.monthTotals.reduce((acc, m) => acc + m.totalMm, 0);
  }, [prevYearAnalytics]);

  const pctChange = prevYearTotal > 0 ? ((totalYearMm - prevYearTotal) / prevYearTotal) * 100 : 0;

  const rainPct = (() => {
    const isLeapYear = (selectedYear % 4 === 0 && selectedYear % 100 !== 0) || selectedYear % 400 === 0;
    const daysInYear = isLeapYear ? 366 : 365;
    return ((daysWithRain / daysInYear) * 100).toFixed(1);
  })();

  const semesterMm = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getUTCMonth();
    let semesterTotal = 0;
    for (let i = Math.max(0, currentMonth - 5); i <= currentMonth; i++) {
      semesterTotal += monthTotals[i]?.totalMm ?? 0;
    }
    return semesterTotal;
  }, [monthTotals]);

  const soilStatus = semesterMm > 300 ? 'Óptimo' : 'En observación';
  const soilStatusColor = semesterMm > 300 ? COLORS.green : COLORS.orange;

  return (
    <ScrollView style={styles.anualContainer} contentContainerStyle={styles.anualContent}>
      {/* Encabezado */}
      <View style={styles.anualHeader}>
        <Text style={styles.anualTitle}>RESUMEN DE DATOS</Text>
        <Text style={styles.anualSubtitle}>Análisis Anual</Text>
      </View>

      {/* Selector de año */}
      <View style={styles.yearSelector}>
        {availableYears.length === 0 && (
          <Text style={styles.yearPlaceholder}>Sin datos disponibles</Text>
        )}
        {availableYears.map((year) => (
          <TouchableOpacity
            key={year}
            style={[styles.yearPill, selectedYear === year && styles.yearPillActive]}
            onPress={() => setSelectedYear(year)}
          >
            <Text style={[styles.yearPillText, selectedYear === year && styles.yearPillTextActive]}>
              {year}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Gráfica de barras */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.chartTitle}>Precipitación Mensual</Text>
          <Text style={styles.chartSubtitle}>Distribución de mm acumulados por mes</Text>
          <MonthBarChart data={monthTotals} maxMonth={topMonth.label} />
        </Card.Content>
      </Card>

      {/* Total Anual */}
      <View style={styles.totalAnnualCard}>
        <Text style={styles.totalAnnualLabel}>TOTAL ANUAL</Text>
        <Text style={styles.totalAnnualValue}>{totalYearMm.toFixed(1)} mm</Text>
        <Text style={styles.totalAnnualSubtext}>Equivalente a {litersPerHa} millones de litros por hectárea.</Text>
      </View>

      {/* Estadísticas secundarias */}
      <View style={styles.statsGrid}>
        <Card style={[styles.statCard, { backgroundColor: COLORS.green + '15' }]}>
          <Card.Content>
            <Ionicons name="rainy" size={20} color={COLORS.green} />
            <Text style={styles.statLabel}>DÍA MÁS LLUVIOSO</Text>
            <Text style={styles.statValue}>{maxRainDay.mm.toFixed(1)} mm</Text>
            <Text style={styles.statSubtext}>{maxRainDayDateStr}</Text>
          </Card.Content>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: COLORS.grayLight }]}>
          <Card.Content>
            <Ionicons name="water" size={20} color={COLORS.chartBlue} />
            <Text style={styles.statLabel}>DÍAS CON LLUVIA</Text>
            <Text style={styles.statValue}>{daysWithRain} días</Text>
          </Card.Content>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: COLORS.grayLight }]}>
          <Card.Content>
            <Ionicons name="stats-chart" size={20} color={COLORS.chartBlue} />
            <Text style={styles.statLabel}>PROMEDIO/DÍA</Text>
            <Text style={styles.statValue}>{avgMmPerDay.toFixed(1)} mm</Text>
          </Card.Content>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: COLORS.grayLight }]}>
          <Card.Content>
            <Ionicons name="calendar" size={20} color={COLORS.chartBlue} />
            <Text style={styles.statLabel}>MES MÁS LLUVIOSO</Text>
            <Text style={styles.statValue}>{topMonthLabel}</Text>
            <Text style={styles.statSubtext}>{topMonth.totalMm.toFixed(1)} mm</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Comparativa vs año anterior */}
      {prevYearTotal > 0 && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Vs. Año anterior</Text>
            <View style={styles.comparisonRow}>
              <Text style={[styles.comparisonPct, { color: pctChange >= 0 ? COLORS.green : '#C62828' }]}>
                {pctChange >= 0 ? '↑ +' : '↘ -'}{Math.abs(pctChange).toFixed(1)}%
              </Text>
              <View style={styles.comparisonBars}>
                <View style={styles.comparisonBarWrapper}>
                  <Text style={styles.comparisonBarLabel}>{selectedYear - 1}</Text>
                  <View style={styles.comparisonBarOuter}>
                    <View
                      style={[
                        styles.comparisonBarFill,
                        { width: `${Math.min((prevYearTotal / Math.max(totalYearMm, prevYearTotal)) * 100, 100)}%` },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.comparisonBarWrapper}>
                  <Text style={styles.comparisonBarLabel}>{selectedYear}</Text>
                  <View style={styles.comparisonBarOuter}>
                    <View
                      style={[
                        styles.comparisonBarFill,
                        { width: `${Math.min((totalYearMm / Math.max(totalYearMm, prevYearTotal)) * 100, 100)}%` },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Frecuencia de Lluvia */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Frecuencia de Lluvia</Text>
          <Text style={styles.frequencyDesc}>{daysWithRain} días con precipitación registrada.</Text>
          <Text style={styles.frequencyPct}>{rainPct}%</Text>
        </Card.Content>
      </Card>

      {/* Estado de Suelo */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Estado de Suelo</Text>
          <Text style={styles.soilDesc}>Basado en rainfall del semestre.</Text>
          <View style={[styles.badge, { alignSelf: 'flex-start', backgroundColor: soilStatusColor + '20' }]}>
            <Text style={[styles.badgeText, { color: soilStatusColor }]}>{soilStatus}</Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

// ─── Historial Content ─────────────────────────────────────────────────────────

function HistorialContent() {
  const [historialTab, setHistorialTab] = useState<HistorialTab>('Calendario');

  return (
    <View style={styles.historialContainer}>
      <HistorialSubTabBar active={historialTab} onChange={setHistorialTab} />
      <ScrollView style={styles.historialScroll} contentContainerStyle={styles.historialScrollContent}>
        {historialTab === 'Calendario' ? <HistorialCalendar /> : <HistorialList />}
      </ScrollView>
    </View>
  );
}

function HistorialCalendar() {
  const now = new Date();
  const [navYear, setNavYear] = useState(now.getUTCFullYear());
  const [navMonth, setNavMonth] = useState(now.getUTCMonth()); // 0-indexed

  const { monthTotals, maxRainDay, dailySeries } = useAnalytics(navYear, ANALYTICS_DEFAULTS.drySeasonThresholdMm);

  const monthTotalMm = monthTotals[navMonth]?.totalMm ?? 0;

  const { daysWithRainInMonth, avgMmPerDayInMonth, maxDayInMonth } = useMemo(() => {
    const daysInMonth = new Date(Date.UTC(navYear, navMonth + 1, 0)).getUTCDate();
    const startDayOfYear = Math.floor((Date.UTC(navYear, navMonth, 1) - Date.UTC(navYear, 0, 0)) / 86400000);

    const days: Measurement[] = [];
    const dayMap = new Map<number, number>();
    dailySeries.forEach((d, i) => {
      const dayOfYear = i + 1;
      if (dayOfYear > startDayOfYear && dayOfYear <= startDayOfYear + daysInMonth) {
        if (d.mm > 0) days.push({ rainfallMm: d.mm } as Measurement);
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
    const dayOfYear = maxDayInMonth.day;
    const date = new Date(Date.UTC(navYear, navMonth, 1));
    const startDayOfYear = Math.floor((Date.UTC(navYear, navMonth, 1) - Date.UTC(navYear, 0, 0)) / 86400000);
    const actualDay = dayOfYear - startDayOfYear;
    if (actualDay < 1 || actualDay > 31) return 'N/A';
    date.setUTCDate(actualDay);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  }, [navYear, navMonth, maxDayInMonth]);

  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(Date.UTC(navYear, navMonth + 1, 0)).getUTCDate();
    const firstDayOfWeek = new Date(Date.UTC(navYear, navMonth, 1)).getUTCDay(); // 0=Sun
    const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Mon=0

    const startDayOfYear = Math.floor((Date.UTC(navYear, navMonth, 1) - Date.UTC(navYear, 0, 0)) / 86400000);

    const cells: Array<{ day: number | null; mm: number; isToday: boolean }> = [];

    // Empty cells before first day
    for (let i = 0; i < adjustedFirstDay; i++) {
      cells.push({ day: null, mm: 0, isToday: false });
    }

    const todayIso = toIsoDate(now);

    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfYear = startDayOfYear + d;
      const mm = dailySeries[dayOfYear - 1]?.mm ?? 0;
      const dateIso = toIsoDate(new Date(Date.UTC(navYear, navMonth, d)));
      const isToday = dateIso === todayIso;
      cells.push({ day: d, mm, isToday });
    }

    return cells;
  }, [dailySeries, navMonth, navYear, now]);

  const getCellColor = (mm: number) => {
    if (mm === 0) return '#E0E0E0';
    if (mm < 10) return '#90CAF9';
    if (mm <= 20) return '#2E5FA3';
    return '#1B3A6B';
  };

  const navigateMonth = (delta: number) => {
    let m = navMonth + delta;
    let y = navYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setNavMonth(m);
    setNavYear(y);
  };

  const maxMonthMm = Math.max(...monthTotals.map((m) => m.totalMm), 1);

  return (
    <View style={styles.calendarContainer}>
      {/* Navegador de mes */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.monthNavBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.monthNavTitle}>{MONTH_FULL_LABELS[navMonth]} {navYear}</Text>
        <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.monthNavBtn}>
          <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Métrica destacada */}
      <View style={styles.monthMetricCard}>
        <Text style={styles.monthMetricLabel}>TOTAL MENSUAL</Text>
        <Text style={styles.monthMetricValue}>{monthTotalMm.toFixed(1)} mm</Text>
      </View>

      {/* Calendario */}
      <View style={styles.calendarGrid}>
        {WEEKDAY_LABELS.map((d) => (
          <View key={d} style={styles.calendarWeekdayCell}>
            <Text style={styles.calendarWeekdayText}>{d}</Text>
          </View>
        ))}
        {calendarDays.map((cell, i) => (
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
                <Text style={[styles.calendarMm, { color: cell.mm > 0 ? COLORS.white : COLORS.textSecondary }]}>
                  {cell.mm > 0 ? `${cell.mm.toFixed(1)}` : '⊘'}
                </Text>
                <View style={[styles.calendarCellDot, { backgroundColor: getCellColor(cell.mm) }]} />
              </>
            )}
          </View>
        ))}
      </View>

      {/* Leyenda */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#1B3A6B' }]} />
          <Text style={styles.legendText}>Lluvia Intensa ({'>'}20mm)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#2E5FA3' }]} />
          <Text style={styles.legendText}>Moderada (10-20mm)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#90CAF9' }]} />
          <Text style={styles.legendText}>Ligera ({'<'}10mm)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E0E0E0' }]} />
          <Text style={styles.legendText}>Sin lluvia (0mm)</Text>
        </View>
      </View>

      {/* Stats resumen del mes */}
      <View style={styles.monthStatsRow}>
        <Card style={[styles.monthStatCard, { backgroundColor: COLORS.green + '15' }]}>
          <Card.Content>
            <Text style={styles.monthStatLabel}>DÍAS CON LLUVIA</Text>
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

      {/* Récord diario */}
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

function HistorialList() {
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
      {/* Navegador de mes */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.monthNavBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.monthNavTitle}>{MONTH_FULL_LABELS[navMonth]} {navYear}</Text>
        <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.monthNavBtn}>
          <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Tarjeta resumen mensual */}
      <View style={styles.totalAnnualCard}>
        <Text style={styles.totalAnnualLabel}>ACUMULADO MENSUAL</Text>
        <Text style={styles.totalAnnualValue}>{totalMm.toFixed(1)} mm</Text>
        <Text style={styles.totalAnnualSubtext}>
          Días con lluvia: {daysWithRain} días
        </Text>
      </View>

      {/* Intensidad Máxima */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Intensidad Máxima</Text>
          <Text style={styles.intensityValue}>{maxDayInMonth.mm.toFixed(1)} mm/h</Text>
          <Text style={styles.intensitySubtext}>Registrado el {maxDayDateStr}</Text>
        </Card.Content>
      </Card>

      {/* Buscador */}
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

      {/* Lista de registros */}
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

// ─── Main Layout ───────────────────────────────────────────────────────────────

export default function AnalysisLayout() {
  const [activeTab, setActiveTab] = useState<Tab>('Panel');

  return (
    <View style={styles.container}>
      <TabBar active={activeTab} onChange={setActiveTab} />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {activeTab === 'Panel' && <PanelContent />}
        {activeTab === 'Anual' && <AnualContent />}
        {activeTab === 'Historial' && <HistorialContent />}
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.grayLight,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  content: { flex: 1 },
  contentInner: { padding: 16, gap: 16 },

  // Panel
  panelContainer: { gap: 16 },
  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
    opacity: 0.8,
    letterSpacing: 1,
  },
  heroValue: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.white,
    marginVertical: 8,
  },
  heroBadge: {
    backgroundColor: COLORS.green,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  heroBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  tankCard: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
    padding: 16,
  },
  tankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tankLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  tankValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  tankSubtext: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  tankBarOuter: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'visible',
    position: 'relative',
  },
  tankBarMarks: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tankMark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  tankBarFill: {
    height: '100%',
    backgroundColor: COLORS.chartBlue,
    borderRadius: 6,
  },
  tankSubtextBottom: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
  sectionCard: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  extremeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  extremeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  extremeText: {
    flex: 1,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeTextBlue: {
    color: COLORS.chartBlue,
    backgroundColor: COLORS.chartBlue + '20',
    fontSize: 10,
    fontWeight: '700',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeTextOrange: {
    color: COLORS.orange,
    backgroundColor: COLORS.orange + '20',
    fontSize: 10,
    fontWeight: '700',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeTextGreen: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '700',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  extremeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  extremeSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  wetMonthRow: {
    marginBottom: 12,
  },
  wetMonthLabel: {
    fontSize: 13,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  wetMonthValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  wetMonthBarWrapper: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  wetMonthBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  seasonDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  seasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  seasonList: {
    fontSize: 13,
    color: COLORS.textPrimary,
    flex: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },

  // Anual
  anualContainer: { flex: 1 },
  anualContent: { padding: 16, gap: 16, paddingBottom: 32 },
  anualHeader: {
    alignItems: 'center',
  },
  anualTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  anualSubtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 4,
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  yearPlaceholder: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  yearPill: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  yearPillActive: {
    backgroundColor: COLORS.primary,
  },
  yearPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  yearPillTextActive: {
    color: COLORS.white,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  chartSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  barChartContainer: {
    marginTop: 8,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    gap: 4,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  barInner: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: 2,
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  barLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    borderRadius: 12,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statSubtext: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  comparisonRow: {
    gap: 12,
  },
  comparisonPct: {
    fontSize: 20,
    fontWeight: '700',
  },
  comparisonBars: {
    gap: 8,
  },
  comparisonBarWrapper: {
    gap: 4,
  },
  comparisonBarLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  comparisonBarOuter: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  comparisonBarFill: {
    height: '100%',
    backgroundColor: COLORS.chartBlue,
    borderRadius: 4,
  },
  frequencyDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  frequencyPct: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.primary,
  },
  soilDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },

  // Historial
  historialContainer: { flex: 1 },
  historialScroll: { flex: 1 },
  historialScrollContent: { padding: 16, gap: 16, paddingBottom: 32 },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.grayLight,
    padding: 4,
    gap: 4,
  },
  subTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  subTabActive: {
    backgroundColor: COLORS.primary,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  subTabTextActive: {
    color: COLORS.white,
  },

  // Calendar
  calendarContainer: { gap: 16 },
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
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
    padding: 8,
    gap: 4,
  },
  calendarWeekdayCell: {
    width: `${(100 - 2) / 7}%`,
    alignItems: 'center',
    paddingVertical: 4,
  },
  calendarWeekdayText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  calendarCell: {
    width: `${(100 - 2) / 7}%`,
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

  // List
  listContainer: { gap: 16 },
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
});
