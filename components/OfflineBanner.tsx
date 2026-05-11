import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useOffline } from '@/hooks/useOffline';

export const OfflineBanner = () => {
  const isOffline = useOffline();

  if (!isOffline) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text variant="bodyMedium" style={styles.text}>
        Estás sin conexión. Tus registros se guardarán localmente y se sincronizarán luego.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#C62828',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  text: {
    color: 'white',
    textAlign: 'center',
  },
});
