import { Stack } from 'expo-router'
import { View, StyleSheet } from 'react-native'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { Colors } from '@/constants/theme'

export default function AppLayout() {
  return (
    <View style={styles.root}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bgWarm },
          animation: 'slide_from_right',
        }}
      />
      <MobileTabBar />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgWarm },
})
