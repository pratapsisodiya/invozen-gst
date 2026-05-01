import { useEffect, useRef } from 'react'
import { Animated, View, Text, Pressable, StyleSheet, Dimensions, ScrollView, Modal } from 'react-native'
import { X } from 'lucide-react-native'
import { Colors, Radius, Shadow } from '@/constants/theme'

const SCREEN_HEIGHT = Dimensions.get('window').height

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: open ? 0 : SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [open])

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        {/* Drag handle */}
        <View style={styles.handle} />
        {title && (
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <X size={16} color={Colors.textMuted} />
            </Pressable>
          </View>
        )}
        <ScrollView showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '90%',
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    ...Shadow.xl,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.ink300,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  closeBtn: {
    padding: 4,
    borderRadius: Radius.sm,
  },
})
