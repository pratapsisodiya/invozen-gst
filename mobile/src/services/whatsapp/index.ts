import { Linking, Platform, Alert } from 'react-native'
import Share from 'react-native-share'

export async function sendWhatsAppReminder(
  phone: string,
  message: string,
  invoiceId: string
): Promise<void> {
  try {
    const paymentLink = `https://invozen.app/pay/${invoiceId}`
    const fullMessage = `${message}\n\nPay here: ${paymentLink}`

    // Remove any non-digit characters from phone
    const cleanPhone = phone.replace(/\D/g, '')

    // Try WhatsApp deep link first
    const whatsappUrl = `whatsapp://send?phone=91${cleanPhone}&text=${encodeURIComponent(fullMessage)}`

    const canOpen = await Linking.canOpenURL(whatsappUrl)

    if (canOpen) {
      await Linking.openURL(whatsappUrl)
    } else {
      // Fallback to share sheet
      await Share.open({
        message: fullMessage,
        social: Share.Social.WHATSAPP,
      })
    }
  } catch (error) {
    console.error('WhatsApp share error:', error)
    Alert.alert(
      'WhatsApp Not Available',
      'Please install WhatsApp to send reminders.'
    )
    throw error
  }
}

export async function shareToWhatsApp(text: string): Promise<void> {
  try {
    await Share.open({
      message: text,
      social: Share.Social.WHATSAPP,
    })
  } catch (error) {
    console.error('WhatsApp share error:', error)
  }
}
