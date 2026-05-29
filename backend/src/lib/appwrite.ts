import { Client, Users, Messaging } from 'node-appwrite'
import { config } from '../config.js'

// Initialize Appwrite Client
const client = new Client()

const hasAppwrite = !!(config.APPWRITE_PROJECT_ID && config.APPWRITE_API_KEY)

if (hasAppwrite) {
  client
    .setEndpoint(config.APPWRITE_ENDPOINT)
    .setProject(config.APPWRITE_PROJECT_ID)
    .setKey(config.APPWRITE_API_KEY)
} else {
  console.warn('⚠️ Appwrite credentials not configured. Email features will run in Simulation Mode.')
}

export const appwriteClient = client
export const appwriteUsers = new Users(client)
export const appwriteMessaging = new Messaging(client)
export const isAppwriteConfigured = hasAppwrite
