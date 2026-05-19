import { Tabs } from 'expo-router';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAppSession } from '@/hooks/useAppSession';
import { usePushTokenRegistration } from '@/hooks/usePushTokenRegistration';

const COLORS = {
  primary: '#003D70',
  white: '#F8F9FA',
  chartBlue: '#2E5FA3',
  green: '#2DB87B',
  grayLight: '#F5F5F5',
  textPrimary: '#1A1A1A',
  textSecondary: '#888888',
};

function HeaderRight() {
  const router = useRouter();
  const unreadCount = 0; // TODO: connect to notifications hook

  return (
    <TouchableOpacity onPress={() => router.push('/(admin)/notifications' as any)} style={styles.headerButton}>
      <Ionicons name="notifications-outline" size={24} color={COLORS.primary} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const screenOptions = {
  headerShown: true,
  headerTitle: 'PluvioApp',
  headerLeft: () => null,
  headerRight: () => <HeaderRight />,
  headerStyle: { backgroundColor: COLORS.white },
  headerTitleStyle: { fontSize: 18, fontWeight: '700' as const, color: COLORS.primary },
  tabBarStyle: {
    height: 64,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarActiveTintColor: COLORS.primary,
  tabBarInactiveTintColor: COLORS.textSecondary,
  tabBarLabelStyle: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
};

export default function AdminLayout() {
  const { isAuthReady, isSignedIn, isLoading } = useAppSession();

  // Register push token and manage daily reminders
  usePushTokenRegistration();

  if (!isAuthReady || (isSignedIn && isLoading)) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
          tabBarItemStyle: undefined,
        }}
      />
      <Tabs.Screen
        name="register"
        options={{
          title: 'Registrar',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'water' : 'water-outline'} size={24} color={color} />
          ),
          tabBarItemStyle: undefined,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={24} color={color} />
          ),
          tabBarItemStyle: undefined,
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: 'Análisis',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={24} color={color} />
          ),
          tabBarItemStyle: undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
          tabBarItemStyle: undefined,
        }}
      />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    marginRight: 16,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#C62828',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});