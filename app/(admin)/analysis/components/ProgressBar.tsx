import { View, StyleSheet } from 'react-native';

const COLORS = {
  chartBlue: '#2E5FA3',
};

interface Props {
  pct: number;
  color?: string;
}

export function ProgressBar({ pct, color = COLORS.chartBlue }: Props) {
  return (
    <View style={styles.progressBarOuter}>
      <View style={[styles.progressBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  progressBarOuter: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
