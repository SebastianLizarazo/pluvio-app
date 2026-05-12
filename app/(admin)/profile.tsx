import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Switch, Text } from 'react-native-paper';

import { supabase } from '@/lib/supabase';
import { useAppSession } from '@/hooks/useAppSession';

const COLORS = {
  primary: '#003D70',
  white: '#F8F9FA',
  grayLight: '#F5F5F5',
  textPrimary: '#1A1A1A',
  textSecondary: '#888888',
};

export default function ProfileScreen() {
  const { appUser } = useAppSession();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const onSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      Alert.alert('Error', 'No se pudo cerrar sesión.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Perfil</Text>
          <Text style={styles.userName}>{appUser?.fullName ?? 'Usuario'}</Text>
          <Text style={styles.userEmail}>{appUser?.email ?? ''}</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Configuración</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Notificaciones</Text>
            <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Ayuda</Text>
          <Text style={styles.helpText}>
            ¿Necesitas ayuda? Consulta la documentación o contacta al soporte.
          </Text>
        </Card.Content>
      </Card>

      <Button mode="outlined" onPress={onSignOut} style={styles.signOutButton}>
        Cerrar sesión
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 12,
    backgroundColor: COLORS.grayLight,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  helpText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  signOutButton: {
    marginTop: 8,
  },
});