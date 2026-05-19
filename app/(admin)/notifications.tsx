import { useState, useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Card, Text, TouchableRipple } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { useAppSession } from '@/hooks/useAppSession';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';
import type { NotificationItem } from '@/types/domain';

const COLORS = {
  primary: '#003D70',
  green: '#2DB87B',
  grayLight: '#F5F5F5',
  textPrimary: '#1A1A1A',
  textSecondary: '#888888',
  white: '#FFFFFF',
};

export default function NotificationsScreen() {
  const { userId } = useAppSession();
  const supabaseClient = useSupabaseClient();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications((data as NotificationItem[]) ?? []);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [userId, supabaseClient]);

  useFocusEffect(
    useCallback(() => {
      void fetchNotifications();
    }, [fetchNotifications]),
  );

  const handleMarkAsRead = async (id: string, read: boolean) => {
    if (read) return; // already read

    try {
      await supabaseClient
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch {
      // silent fail
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableRipple
      onPress={() => handleMarkAsRead(item.id, item.read)}
      style={[styles.notificationItem, !item.read && styles.notificationUnread]}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationIcon}>
          <Ionicons
            name={item.read ? 'notifications-outline' : 'notifications'}
            size={22}
            color={item.read ? COLORS.textSecondary : COLORS.primary}
          />
        </View>
        <View style={styles.notificationText}>
          <Text style={[styles.notificationTitle, !item.read && styles.titleUnread]}>
            {item.title}
          </Text>
          <Text style={styles.notificationBody}>{item.body}</Text>
          <Text style={styles.notificationTime}>
            {new Date(item.createdAt).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </View>
    </TouchableRipple>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={56} color={COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>Sin notificaciones</Text>
      <Text style={styles.emptySubtitle}>
        Aquí aparecerán tus recordatorios y alertas.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={!loading ? renderEmpty() : null}
        contentContainerStyle={notifications.length === 0 && !loading ? styles.emptyList : styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  list: {
    padding: 16,
    gap: 8,
  },
  emptyList: {
    flex: 1,
  },
  notificationItem: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
    padding: 12,
  },
  notificationUnread: {
    backgroundColor: `${COLORS.primary}08`,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notificationIcon: {
    marginTop: 2,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  titleUnread: {
    fontWeight: '700',
  },
  notificationBody: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.green,
    marginTop: 4,
  },
  separator: {
    height: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});