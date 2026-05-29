import { v2 as cloudinary } from 'cloudinary'
import { config } from '../../config.js'

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
})

/**
 * Upload business logo to Cloudinary
 *
 * @param buffer - Image file buffer
 * @param userId - User ID for organizing uploads
 * @returns Secure URL of uploaded image
 */
export async function uploadLogo(buffer: Buffer, userId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'invozen/logos',
        public_id: `logo_${userId}`,
        overwrite: true,
        invalidate: true, // Invalidate CDN cache
        transformation: [
          { width: 400, height: 200, crop: 'limit', quality: 'auto' }
        ],
        format: 'png', // Convert all to PNG for consistency
      },
      (error, result) => {
        if (error) {
          reject(error)
        } else if (result) {
          resolve(result.secure_url)
        } else {
          reject(new Error('Upload failed: No result returned'))
        }
      }
    )
    uploadStream.end(buffer)
  })
}

/**
 * Delete logo from Cloudinary
 *
 * @param userId - User ID
 */
export async function deleteLogo(userId: string): Promise<void> {
  await cloudinary.uploader.destroy(`invozen/logos/logo_${userId}`)
}

/**
 * Upload business signature to Cloudinary
 *
 * @param buffer - Image file buffer
 * @param userId - User ID for organizing uploads
 * @returns Secure URL of uploaded image
 */
export async function uploadSignature(buffer: Buffer, userId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'invozen/signatures',
        public_id: `signature_${userId}`,
        overwrite: true,
        invalidate: true, // Invalidate CDN cache
        transformation: [
          { width: 400, height: 200, crop: 'limit', quality: 'auto' }
        ],
        format: 'png', // Convert all to PNG for consistency
      },
      (error, result) => {
        if (error) {
          reject(error)
        } else if (result) {
          resolve(result.secure_url)
        } else {
          reject(new Error('Upload failed: No result returned'))
        }
      }
    )
    uploadStream.end(buffer)
  })
}

/**
 * Delete signature from Cloudinary
 *
 * @param userId - User ID
 */
export async function deleteSignature(userId: string): Promise<void> {
  await cloudinary.uploader.destroy(`invozen/signatures/signature_${userId}`)
}

/**
 * Upload a file attachment (base64 data URI or raw base64) to Cloudinary.
 * Returns the secure CDN URL.
 */
export async function uploadAttachment(
  base64Data: string,
  fileName: string,
  userId: string,
  entityId: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Accept either a data URI ("data:...;base64,...") or raw base64
    const dataUri = base64Data.startsWith('data:')
      ? base64Data
      : `data:application/octet-stream;base64,${base64Data}`

    const publicId = `invozen/attachments/${userId}/${entityId}/${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    cloudinary.uploader.upload(
      dataUri,
      {
        public_id: publicId,
        resource_type: 'auto',
        overwrite: false,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) reject(error)
        else if (result) resolve(result.secure_url)
        else reject(new Error('Cloudinary upload returned no result'))
      }
    )
  })
}

export const isCloudinaryConfigured = !!(
  config.CLOUDINARY_CLOUD_NAME &&
  config.CLOUDINARY_API_KEY &&
  config.CLOUDINARY_API_SECRET
)
