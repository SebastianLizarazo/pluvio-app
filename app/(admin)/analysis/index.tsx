import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';

import { PanelContent } from './PanelContent';
import { AnualContent } from './AnualContent';
import { HistorialContent } from './HistorialContent';

const TABS = ['Panel', 'Anual', 'Historial'] as const;
type Tab = (typeof TABS)[number];

const COLORS = {
  primary: '#1B3A6B',
  chartBlue: '#2E5FA3',
  green: '#2DB87B',
  grayLight: '#F5F5F5',
  textPrimary: '#1A1A1A',
  textSecondary: '#888888',
  white: '#FFFFFF',
};

export default function AnalysisLayout() {
  const [activeTab, setActiveTab] = useState<Tab>('Panel');

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {activeTab === 'Panel' && <PanelContent />}
        {activeTab === 'Anual' && <AnualContent />}
        {activeTab === 'Historial' && <HistorialContent />}
      </ScrollView>
    </View>
  );
}

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
});