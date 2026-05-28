import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface TankIndicatorProps {
  currentMm: number;
  maxMm: number;
  title: string;
}

export const TankIndicator = ({ currentMm, maxMm, title }: TankIndicatorProps) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    const normalized = Math.min(1, Math.max(0, currentMm / maxMm));
    progress.value = withTiming(normalized, { duration: 700 });
  }, [currentMm, maxMm, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    height: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.wrapper}>
      <Text variant="titleMedium">{title}</Text>

      <View style={styles.tank}>
        <Animated.View style={[styles.waterFill, fillStyle]} />
      </View>

      <Text variant="bodyMedium">{currentMm.toFixed(1)} mm</Text>
      <Text variant="bodySmall">{(currentMm * 10).toFixed(1)} litros</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 8,
  },
  tank: {
    width: 82,
    height: 130,
    borderWidth: 2,
    borderColor: '#0E6BA8',
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#E3F2FD',
  },
  waterFill: {
    width: '100%',
    backgroundColor: '#56B4D3',
  },
});
