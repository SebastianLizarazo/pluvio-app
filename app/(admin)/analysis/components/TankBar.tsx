import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

const COLORS = {
  chartBlue: '#2E5FA3',
  grayMedium: '#D0D5DD',
  textPrimary: '#1A1A1A',
  textSecondary: '#888888',
  primary: '#1B3A6B',
};

interface Props {
  label: string;
  valueMm: number;
  limitMm: number;
  subtext: string;
}

export function TankBar({ label, valueMm, limitMm, subtext }: Props) {
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

const styles = StyleSheet.create({
  tankCard: {
    backgroundColor: COLORS.grayMedium,
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
});
