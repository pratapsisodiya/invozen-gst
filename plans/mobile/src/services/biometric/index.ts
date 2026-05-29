import * as LocalAuthentication from 'expo-local-authentication'

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync()
    const isEnrolled = await LocalAuthentication.isEnrolledAsync()
    return hasHardware && isEnrolled
  } catch (error) {
    console.error('Biometric availability check error:', error)
    return false
  }
}

export async function authenticateWithBiometric(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Invozen GST',
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false,
    })

    return result.success
  } catch (error) {
    console.error('Biometric authentication error:', error)
    return false
  }
}

export async function getBiometricType(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID'
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Fingerprint'
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris'
    }
    return 'Biometric'
  } catch (error) {
    return 'Biometric'
  }
}
