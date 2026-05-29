import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native'
import { useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Toggle } from '@/components/ui/Toggle'
import { Colors, Radius, Shadow } from '@/constants/theme'
import { ChevronRight } from 'lucide-react-native'

interface SettingRowProps {
  label: string
  description?: string
  value?: boolean
  onToggle?: (v: boolean) => void
  onPress?: () => void
  rightLabel?: string
}

function SettingRow({ label, description, value, onToggle, onPress, rightLabel }: SettingRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && onPress && styles.rowPressed]}
      onPress={onPress}
      disabled={!onPress && onToggle === undefined}
    >
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description && <Text style={styles.rowDesc}>{description}</Text>}
      </View>
      {onToggle !== undefined ? (
        <Toggle checked={value ?? false} onChange={onToggle} />
      ) : rightLabel ? (
        <Text style={styles.rightLabel}>{rightLabel}</Text>
      ) : onPress ? (
        <ChevronRight size={16} color={Colors.textMuted} />
      ) : null}
    </Pressable>
  )
}

export default function SettingsScreen() {
  const [biometric, setBiometric]   = useState(false)
  const [autoBackup, setAutoBackup] = useState(true)
  const [darkMode, setDarkMode]     = useState(false)

  return (
    <View style={styles.root}>
      <TopBar title="Settings" showBack />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.sectionLabel}>Business</Text>
        <View style={styles.card}>
          <SettingRow label="Business Profile"   onPress={() => {}} />
          <SettingRow label="GSTIN Settings"     onPress={() => {}} />
          <SettingRow label="Invoice Template"   onPress={() => {}} />
          <SettingRow label="Default GST Rates"  onPress={() => {}} />
        </View>

        <Text style={styles.sectionLabel}>Security</Text>
        <View style={styles.card}>
          <SettingRow
            label="Biometric Login"
            description="Use fingerprint or face ID"
            value={biometric}
            onToggle={setBiometric}
          />
          <SettingRow label="Change PIN" onPress={() => {}} />
        </View>

        <Text style={styles.sectionLabel}>Data</Text>
        <View style={styles.card}>
          <SettingRow
            label="Auto Backup"
            description="Daily backup to cloud"
            value={autoBackup}
            onToggle={setAutoBackup}
          />
          <SettingRow label="Export Data"   onPress={() => {}} />
          <SettingRow label="Import Data"   onPress={() => {}} />
        </View>

        <Text style={styles.sectionLabel}>Appearance</Text>
        <View style={styles.card}>
          <SettingRow
            label="Dark Mode"
            description="Coming soon"
            value={darkMode}
            onToggle={setDarkMode}
          />
          <SettingRow label="Language" rightLabel="English" onPress={() => {}} />
        </View>

        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.card}>
          <SettingRow label="Version" rightLabel="1.0.0" />
          <SettingRow label="Privacy Policy"    onPress={() => {}} />
          <SettingRow label="Terms of Service"  onPress={() => {}} />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bgWarm },
  scroll: { padding: 16, paddingBottom: 32 },

  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 8, marginTop: 20, paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#ffffff', borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Shadow.sm,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: Colors.borderSoft,
  },
  rowPressed: { backgroundColor: Colors.ink50 },
  rowInfo:    { flex: 1 },
  rowLabel:   { fontSize: 14, fontWeight: '500', color: Colors.text },
  rowDesc:    { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  rightLabel: { fontSize: 13, color: Colors.textMuted },
})
