import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native'
import { useNotificationStore } from '@/stores/notificationStore'
import { TopBar } from '@/components/layout/TopBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Colors, Radius, Shadow } from '@/constants/theme'
import { Bell, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react-native'

const ICON_MAP = {
  success: CheckCircle,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
}
const COLOR_MAP = {
  success: Colors.ok600,
  error:   Colors.err600,
  warning: Colors.warn600,
  info:    Colors.blue600 ?? '#2563eb',
}

export default function NotificationsScreen() {
  const { notifications, markAsRead } = useNotificationStore() as any
  const sorted = [...notifications].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <View style={styles.root}>
      <TopBar title="Notifications" showBack />
      {sorted.length === 0 ? (
        <EmptyState icon={<Bell size={28} color={Colors.brand600} />} title="No notifications" description="You're all caught up!" />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: n }) => {
            const notif = n as any
            const ntype = (notif.type ?? 'info') as string
            const iconKey = ntype.includes('paid') || ntype.includes('payment') ? 'success'
              : ntype.includes('overdue') || ntype.includes('due') ? 'warning'
              : 'info'
            const Icon  = ICON_MAP[iconKey as keyof typeof ICON_MAP] ?? Info
            const color = COLOR_MAP[iconKey as keyof typeof COLOR_MAP] ?? Colors.brand600
            return (
              <Pressable
                style={({ pressed }) => [styles.card, !notif.isRead && styles.unread, pressed && styles.pressed]}
                onPress={() => markAsRead?.(notif.id)}
              >
                <View style={[styles.iconWrap, { backgroundColor: color + '20' }]}>
                  <Icon size={16} color={color} />
                </View>
                <View style={styles.body}>
                  <Text style={styles.title}>{notif.title}</Text>
                  <Text style={styles.message} numberOfLines={2}>{notif.message}</Text>
                  <Text style={styles.time}>{new Date(notif.createdAt).toLocaleDateString('en-IN')}</Text>
                </View>
                {!notif.isRead && <View style={styles.dot} />}
              </Pressable>
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgWarm },
  list: { padding: 16, gap: 8 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#ffffff', borderRadius: Radius.xl,
    padding: 14, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  unread:  { backgroundColor: Colors.bgTinted, borderColor: Colors.brand200 ?? Colors.border },
  pressed: { opacity: 0.85 },
  iconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  body:    { flex: 1 },
  title:   { fontSize: 14, fontWeight: '600', color: Colors.text },
  message: { fontSize: 13, color: Colors.text2, marginTop: 2 },
  time:    { fontSize: 11, color: Colors.textMuted, marginTop: 6 },
  dot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.brand600, marginTop: 4 },
})
