import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';

import { HistorialCalendar } from './HistorialCalendar';
import { HistorialList } from './HistorialList';

const HISTORIAL_TABS = ['Calendario', 'Lista'] as const;
type HistorialTab = (typeof HISTORIAL_TABS)[number];

const COLORS = {
  grayLight: '#F5F5F5',
  primary: '#1B3A6B',
  textSecondary: '#888888',
  white: '#FFFFFF',
};

export function HistorialContent() {
  const [historialTab, setHistorialTab] = useState<HistorialTab>('Calendario');

  return (
    <View style={styles.historialContainer}>
      <View style={styles.subTabBar}>
        {HISTORIAL_TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.subTab, historialTab === t && styles.subTabActive]}
            onPress={() => setHistorialTab(t)}
          >
            <Text style={[styles.subTabText, historialTab === t && styles.subTabTextActive]}>
              {t === 'Calendario' ? '📅 Calendario' : '≡ Lista'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={styles.historialScroll} contentContainerStyle={styles.historialScrollContent}>
        {historialTab === 'Calendario' ? <HistorialCalendar /> : <HistorialList />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
});