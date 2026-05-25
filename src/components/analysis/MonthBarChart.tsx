import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

const COLORS = {
  chartBlue: '#2E5FA3',
  grayMedium: '#D0D5DD',
  textSecondary: '#888888',
  primary: '#1B3A6B',
  textPrimary: '#1A1A1A',
};

interface DataItem {
  label: string;
  totalMm: number;
}

interface Props {
  data: DataItem[];
  maxMonth: string;
}

export function MonthBarChart({ data, maxMonth }: Props) {
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

const styles = StyleSheet.create({
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
});
