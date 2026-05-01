const fs = require('fs')
const path = require('path')

const FRONTEND_ROOT = path.join(__dirname, '../../frontend')
const MOBILE_ROOT = path.join(__dirname, '..')

const FILES_TO_SYNC = [
  // GST logic
  { from: 'lib/gst/constants.ts', to: 'src/lib/gst/constants.ts' },
  { from: 'lib/gst/calculator.ts', to: 'src/lib/gst/calculator.ts' },
  { from: 'lib/gst/validator.ts', to: 'src/lib/gst/validator.ts' },
  { from: 'lib/gst/formatter.ts', to: 'src/lib/gst/formatter.ts' },
  { from: 'lib/gst/gstr1.ts', to: 'src/lib/gst/gstr1.ts' },
  { from: 'lib/gst/gstr3b.ts', to: 'src/lib/gst/gstr3b.ts' },

  // Types
  { from: 'types/invoice.ts', to: 'src/lib/types/invoice.ts' },
  { from: 'types/customer.ts', to: 'src/lib/types/customer.ts' },
  { from: 'types/item.ts', to: 'src/lib/types/item.ts' },
  { from: 'types/payment.ts', to: 'src/lib/types/payment.ts' },
  { from: 'types/gst.ts', to: 'src/lib/types/gst.ts' },
  { from: 'types/business.ts', to: 'src/lib/types/business.ts' },
  { from: 'types/auth.ts', to: 'src/lib/types/auth.ts' },
  { from: 'types/notification.ts', to: 'src/lib/types/notification.ts' },
  { from: 'types/purchase.ts', to: 'src/lib/types/purchase.ts' },
  { from: 'types/creditNote.ts', to: 'src/lib/types/creditNote.ts' },
  { from: 'types/recurring.ts', to: 'src/lib/types/recurring.ts' },
  { from: 'types/quotation.ts', to: 'src/lib/types/quotation.ts' },

  // Utils
  { from: 'lib/utils/formatters.ts', to: 'src/lib/utils/formatters.ts' },
  { from: 'lib/utils/ids.ts', to: 'src/lib/utils/ids.ts' },
]

function syncFiles() {
  let syncedCount = 0
  let errorCount = 0

  console.log('🔄 Syncing shared code from frontend to mobile...\n')

  FILES_TO_SYNC.forEach(({ from, to }) => {
    const sourcePath = path.join(FRONTEND_ROOT, from)
    const destPath = path.join(MOBILE_ROOT, to)

    try {
      // Create destination directory if needed
      const destDir = path.dirname(destPath)
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true })
      }

      // Copy file
      fs.copyFileSync(sourcePath, destPath)
      console.log(`✓ Synced: ${from} → ${to}`)
      syncedCount++
    } catch (error) {
      console.error(`✗ Error syncing ${from}:`, error.message)
      errorCount++
    }
  })

  console.log(`\n📊 Summary: ${syncedCount} files synced, ${errorCount} errors`)

  if (errorCount === 0) {
    console.log('✅ All files synced successfully!')
  } else {
    console.log('⚠️  Some files failed to sync. Please check errors above.')
    process.exit(1)
  }
}

syncFiles()
