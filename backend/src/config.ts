import 'dotenv/config'

function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

export const config = {
  PORT: parseInt(process.env['PORT'] ?? '4000', 10),
  DATABASE_URL: required('DATABASE_URL'),
  CLERK_SECRET_KEY: required('CLERK_SECRET_KEY'),
  FRONTEND_URL: process.env['FRONTEND_URL'] ?? 'http://localhost:3000',
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env['CLOUDINARY_CLOUD_NAME'] ?? '',
  CLOUDINARY_API_KEY: process.env['CLOUDINARY_API_KEY'] ?? '',
  CLOUDINARY_API_SECRET: process.env['CLOUDINARY_API_SECRET'] ?? '',
  // NIC IRP (E-Invoice)
  NIC_IRP_ENVIRONMENT: process.env['NIC_IRP_ENVIRONMENT'] ?? 'sandbox',
  NIC_IRP_USERNAME: process.env['NIC_IRP_USERNAME'] ?? '',
  NIC_IRP_PASSWORD: process.env['NIC_IRP_PASSWORD'] ?? '',
  NIC_IRP_GSTIN: process.env['NIC_IRP_GSTIN'] ?? '',
  NIC_IRP_CLIENT_ID: process.env['NIC_IRP_CLIENT_ID'] ?? '',
  NIC_IRP_CLIENT_SECRET: process.env['NIC_IRP_CLIENT_SECRET'] ?? '',
  // Razorpay (Payment Gateway)
  RAZORPAY_KEY_ID: process.env['RAZORPAY_KEY_ID'] ?? '',
  RAZORPAY_KEY_SECRET: process.env['RAZORPAY_KEY_SECRET'] ?? '',
  RAZORPAY_WEBHOOK_SECRET: process.env['RAZORPAY_WEBHOOK_SECRET'] ?? '',
}
