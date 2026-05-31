import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { mmToLiters, TANK_DIAMETER_CM } from '@/utils';
import { TANK_MAX_MM } from '@/constants/app';

interface TankIndicatorProps {
  currentMm: number;
  title: string;
  subtitle?: string;
}

export const TankIndicator = ({ currentMm, title, subtitle }: TankIndicatorProps) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    const normalized = Math.min(1, Math.max(0, currentMm / TANK_MAX_MM));
    progress.value = withTiming(normalized, { duration: 700 });
  }, [currentMm, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    height: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.wrapper}>
      <Text variant="titleMedium">{title}</Text>

      <View style={styles.tank}>
        <Animated.View style={[styles.waterFill, fillStyle]} />
      </View>

      <Text variant="bodyMedium">{currentMm.toFixed(2)} mm</Text>
      <Text variant="bodySmall">{mmToLiters(currentMm, TANK_DIAMETER_CM).toFixed(2)} L</Text>
      {subtitle && <Text variant="bodySmall" style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const COLORS = {
  chartBlue: '#2E5FA3',
  grayLight: '#F5F5F5',
  textSecondary: '#888888',
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  tank: {
    width: 82,
    height: 130,
    borderWidth: 2,
    borderColor: COLORS.chartBlue,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#E3F2FD',
  },
  waterFill: {
    width: '100%',
    backgroundColor: '#56B4D3',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
});