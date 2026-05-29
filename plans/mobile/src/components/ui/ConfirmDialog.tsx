import { View, Text, StyleSheet } from 'react-native'
import { Modal } from './Modal'
import { Button } from './Button'
import { Colors } from '@/constants/theme'

type DialogVariant = 'default' | 'danger' | 'warning'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: DialogVariant
  loading?: boolean
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'default', loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onPress={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button
            variant="primary"
            onPress={onConfirm}
            loading={loading}
            style={variant === 'danger' ? styles.danger : variant === 'warning' ? styles.warning : undefined}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <View style={styles.body}>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  body:    { paddingHorizontal: 20, paddingVertical: 16 },
  message: { fontSize: 14, color: Colors.text2, lineHeight: 22 },
  danger:  { backgroundColor: Colors.err600 },
  warning: { backgroundColor: Colors.warn600 },
})
