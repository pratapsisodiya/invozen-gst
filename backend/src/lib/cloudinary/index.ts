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
