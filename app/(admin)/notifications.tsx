import { FlatList, StyleSheet, View } from 'react-native';
import { Text, TouchableRipple } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import { useNotificationsCenter } from '@/hooks/useNotificationsCenter';
import type { AppNotification } from '@/hooks/useNotificationsCenter';

const COLORS = {
  primary: '#003D70',
  green: '#2DB87B',
  grayLight: '#F5F5F5',
  textPrimary: '#1A1A1A',
  textSecondary: '#888888',
  white: '#FFFFFF',
};

export default function NotificationsScreen() {
  const { notificationsQuery, markAsRead } = useNotificationsCenter();
  const { data: notifications = [], isLoading } = notificationsQuery;

  const handleMarkAsRead = async (id: string, read: boolean) => {
    if (read) return;
    await markAsRead.mutateAsync(id);
  };

  const renderItem = ({ item }: { item: AppNotification }) => (
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
            {new Date(item.created_at).toLocaleDateString('es-ES', {
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
        ListEmptyComponent={!isLoading ? renderEmpty() : null}
        contentContainerStyle={notifications.length === 0 && !isLoading ? styles.emptyList : styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshing={isLoading}
        onRefresh={notificationsQuery.refetch}
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