import { useEffect, useRef } from 'react'
import { Animated, View, Text, Pressable, StyleSheet } from 'react-native'
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react-native'
import { Colors, Radius, Shadow } from '@/constants/theme'
import { useUIStore } from '@/stores/uiStore'

interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const slideX = useRef(new Animated.Value(100)).current

  useEffect(() => {
    Animated.timing(slideX, { toValue: 0, duration: 200, useNativeDriver: true }).start()
  }, [])

  const colorMap = {
    success: { bg: Colors.ok50,   border: Colors.ok600,   icon: Colors.ok600 },
    error:   { bg: Colors.err50,  border: Colors.err600,  icon: Colors.err600 },
    info:    { bg: Colors.blue50, border: Colors.blue600, icon: Colors.blue600 },
    warning: { bg: Colors.warn50, border: Colors.warn600, icon: Colors.warn600 },
  }
  const IconMap = {
    success: CheckCircle,
    error:   AlertCircle,
    info:    Info,
    warning: AlertTriangle,
  }
  const c = colorMap[item.type]
  const Icon = IconMap[item.type]

  return (
    <Animated.View style={[
      styles.toast,
      { backgroundColor: c.bg, borderColor: c.border, transform: [{ translateX: slideX }] },
    ]}>
      <Icon size={16} color={c.icon} style={styles.icon} />
      <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <X size={14} color={Colors.textMuted} />
      </Pressable>
    </Animated.View>
  )
}

export function ToastContainer() {
  const { toasts, dismissToast } = useUIStore()

  if (toasts.length === 0) return null

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} item={t} onDismiss={() => dismissToast(t.id)} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 999,
    gap: 8,
    maxWidth: 340,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    minWidth: 260,
    ...Shadow.lg,
  },
  icon: { marginTop: 1, flexShrink: 0 },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
})
