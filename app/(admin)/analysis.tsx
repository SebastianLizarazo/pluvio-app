import { Text, View, StyleSheet } from 'react-native';

const COLORS = {
  primary: '#1B3A6B',
  textSecondary: '#888888',
};

export default function AnalysisScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Análisis</Text>
      <Text style={styles.subtitle}>Pantalla de análisis (pendiente implementación)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});