import { PrismaClient as SqlitePrismaClient } from '@prisma/client'
import { PrismaClient as PostgresPrismaClient } from '@prisma/client'

/**
 * Migration script: SQLite → PostgreSQL
 *
 * This script exports all data from the SQLite database and imports it into PostgreSQL.
 * It handles data transformation for PostgreSQL compatibility.
 *
 * Usage:
 * 1. Set SQLITE_DATABASE_URL environment variable to SQLite connection
 * 2. Set DATABASE_URL environment variable to PostgreSQL connection
 * 3. Run: tsx scripts/migrate-to-postgres.ts
 */

const BATCH_SIZE = 500

async function migrate() {
  console.log('🚀 Starting migration from SQLite to PostgreSQL...\n')

  // Connect to SQLite (source)
  const sqlite = new SqlitePrismaClient({
    datasources: {
      db: {
        url: process.env.SQLITE_DATABASE_URL || 'file:../prisma/invozen.db',
      },
    },
  })

  // Connect to PostgreSQL (destination)
  const postgres = new PostgresPrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

  try {
    await sqlite.$connect()
    await postgres.$connect()

    console.log('✅ Connected to both databases\n')

    // Migrate BusinessProfile
    console.log('📦 Migrating BusinessProfile...')
    const businessProfiles = await sqlite.businessProfile.findMany()
    for (const profile of businessProfiles) {
      await postgres.businessProfile.upsert({
        where: { userId: profile.userId },
        create: profile,
        update: profile,
      })
    }
    console.log(`✅ Migrated ${businessProfiles.length} business profiles\n`)

    // Migrate Customers
    console.log('📦 Migrating Customers...')
    const customers = await sqlite.customer.findMany()
    for (let i = 0; i < customers.length; i += BATCH_SIZE) {
      const batch = customers.slice(i, i + BATCH_SIZE)
      await postgres.$transaction(
        batch.map(customer =>
          postgres.customer.upsert({
            where: { id: customer.id },
            create: customer,
            update: customer,
          })
        )
      )
    }
    console.log(`✅ Migrated ${customers.length} customers\n`)

    // Migrate Items
    console.log('📦 Migrating Items...')
    const items = await sqlite.item.findMany()
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE)
      await postgres.$transaction(
        batch.map(item =>
          postgres.item.upsert({
            where: { id: item.id },
            create: item,
            update: item,
          })
        )
      )
    }
    console.log(`✅ Migrated ${items.length} items\n`)

    // Migrate Invoices
    console.log('📦 Migrating Invoices...')
    const invoices = await sqlite.invoice.findMany()
    for (let i = 0; i < invoices.length; i += BATCH_SIZE) {
      const batch = invoices.slice(i, i + BATCH_SIZE)
      await postgres.$transaction(
        batch.map(invoice =>
          postgres.invoice.upsert({
            where: { id: invoice.id },
            create: invoice,
            update: invoice,
          })
        )
      )
    }
    console.log(`✅ Migrated ${invoices.length} invoices\n`)

    // Migrate Payments
    console.log('📦 Migrating Payments...')
    const payments = await sqlite.payment.findMany()
    for (let i = 0; i < payments.length; i += BATCH_SIZE) {
      const batch = payments.slice(i, i + BATCH_SIZE)
      await postgres.$transaction(
        batch.map(payment =>
          postgres.payment.upsert({
            where: { id: payment.id },
            create: payment,
            update: payment,
          })
        )
      )
    }
    console.log(`✅ Migrated ${payments.length} payments\n`)

    // Migrate Vendors
    console.log('📦 Migrating Vendors...')
    const vendors = await sqlite.vendor.findMany()
    for (let i = 0; i < vendors.length; i += BATCH_SIZE) {
      const batch = vendors.slice(i, i + BATCH_SIZE)
      await postgres.$transaction(
        batch.map(vendor =>
          postgres.vendor.upsert({
            where: { id: vendor.id },
            create: vendor,
            update: vendor,
          })
        )
      )
    }
    console.log(`✅ Migrated ${vendors.length} vendors\n`)

    // Migrate PurchaseInvoices
    console.log('📦 Migrating PurchaseInvoices...')
    const purchases = await sqlite.purchaseInvoice.findMany()
    for (let i = 0; i < purchases.length; i += BATCH_SIZE) {
      const batch = purchases.slice(i, i + BATCH_SIZE)
      await postgres.$transaction(
        batch.map(purchase =>
          postgres.purchaseInvoice.upsert({
            where: { id: purchase.id },
            create: purchase,
            update: purchase,
          })
        )
      )
    }
    console.log(`✅ Migrated ${purchases.length} purchase invoices\n`)

    // Migrate Expenses
    console.log('📦 Migrating Expenses...')
    const expenses = await sqlite.expense.findMany()
    for (let i = 0; i < expenses.length; i += BATCH_SIZE) {
      const batch = expenses.slice(i, i + BATCH_SIZE)
      await postgres.$transaction(
        batch.map(expense =>
          postgres.expense.upsert({
            where: { id: expense.id },
            create: expense,
            update: expense,
          })
        )
      )
    }
    console.log(`✅ Migrated ${expenses.length} expenses\n`)

    // Migrate Quotations
    console.log('📦 Migrating Quotations...')
    const quotations = await sqlite.quotation.findMany()
    for (let i = 0; i < quotations.length; i += BATCH_SIZE) {
      const batch = quotations.slice(i, i + BATCH_SIZE)
      await postgres.$transaction(
        batch.map(quotation =>
          postgres.quotation.upsert({
            where: { id: quotation.id },
            create: quotation,
            update: quotation,
          })
        )
      )
    }
    console.log(`✅ Migrated ${quotations.length} quotations\n`)

    // Migrate CreditNotes
    console.log('📦 Migrating CreditNotes...')
    const creditNotes = await sqlite.creditNote.findMany()
    for (let i = 0; i < creditNotes.length; i += BATCH_SIZE) {
      const batch = creditNotes.slice(i, i + BATCH_SIZE)
      await postgres.$transaction(
        batch.map(note =>
          postgres.creditNote.upsert({
            where: { id: note.id },
            create: note,
            update: note,
          })
        )
      )
    }
    console.log(`✅ Migrated ${creditNotes.length} credit notes\n`)

    // Migrate DebitNotes
    console.log('📦 Migrating DebitNotes...')
    const debitNotes = await sqlite.debitNote.findMany()
    for (let i = 0; i < debitNotes.length; i += BATCH_SIZE) {
      const batch = debitNotes.slice(i, i + BATCH_SIZE)
      await postgres.$transaction(
        batch.map(note =>
          postgres.debitNote.upsert({
            where: { id: note.id },
            create: note,
            update: note,
          })
        )
      )
    }
    console.log(`✅ Migrated ${debitNotes.length} debit notes\n`)

    // Migrate RecurringTemplates
    console.log('📦 Migrating RecurringTemplates...')
    const templates = await sqlite.recurringTemplate.findMany()
    for (let i = 0; i < templates.length; i += BATCH_SIZE) {
      const batch = templates.slice(i, i + BATCH_SIZE)
      await postgres.$transaction(
        batch.map(template =>
          postgres.recurringTemplate.upsert({
            where: { id: template.id },
            create: template,
            update: template,
          })
        )
      )
    }
    console.log(`✅ Migrated ${templates.length} recurring templates\n`)

    // Migrate RecurringLogs
    console.log('📦 Migrating RecurringLogs...')
    const logs = await sqlite.recurringLog.findMany()
    for (let i = 0; i < logs.length; i += BATCH_SIZE) {
      const batch = logs.slice(i, i + BATCH_SIZE)
      await postgres.$transaction(
        batch.map(log =>
          postgres.recurringLog.upsert({
            where: { id: log.id },
            create: log,
            update: log,
          })
        )
      )
    }
    console.log(`✅ Migrated ${logs.length} recurring logs\n`)

    // Migrate Notifications
    console.log('📦 Migrating Notifications...')
    const notifications = await sqlite.notification.findMany()
    for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
      const batch = notifications.slice(i, i + BATCH_SIZE)
      await postgres.$transaction(
        batch.map(notification =>
          postgres.notification.upsert({
            where: { id: notification.id },
            create: notification,
            update: notification,
          })
        )
      )
    }
    console.log(`✅ Migrated ${notifications.length} notifications\n`)

    // Migrate FilingRecords
    console.log('📦 Migrating FilingRecords...')
    const filings = await sqlite.filingRecord.findMany()
    for (let i = 0; i < filings.length; i += BATCH_SIZE) {
      const batch = filings.slice(i, i + BATCH_SIZE)
      await postgres.$transaction(
        batch.map(filing =>
          postgres.filingRecord.upsert({
            where: { id: filing.id },
            create: filing,
            update: filing,
          })
        )
      )
    }
    console.log(`✅ Migrated ${filings.length} filing records\n`)

    // Migrate AuditEntries
    console.log('📦 Migrating AuditEntries...')
    const audits = await sqlite.auditEntry.findMany()
    for (let i = 0; i < audits.length; i += BATCH_SIZE) {
      const batch = audits.slice(i, i + BATCH_SIZE)
      await postgres.$transaction(
        batch.map(audit =>
          postgres.auditEntry.upsert({
            where: { id: audit.id },
            create: audit,
            update: audit,
          })
        )
      )
    }
    console.log(`✅ Migrated ${audits.length} audit entries\n`)

    // Migrate Attachments
    console.log('📦 Migrating Attachments...')
    const attachments = await sqlite.attachment.findMany()
    for (let i = 0; i < attachments.length; i += BATCH_SIZE) {
      const batch = attachments.slice(i, i + BATCH_SIZE)
      await postgres.$transaction(
        batch.map(attachment =>
          postgres.attachment.upsert({
            where: { id: attachment.id },
            create: attachment,
            update: attachment,
          })
        )
      )
    }
    console.log(`✅ Migrated ${attachments.length} attachments\n`)

    // Migrate InventoryMovements
    console.log('📦 Migrating InventoryMovements...')
    const movements = await sqlite.inventoryMovement.findMany()
    for (let i = 0; i < movements.length; i += BATCH_SIZE) {
      const batch = movements.slice(i, i + BATCH_SIZE)
      await postgres.$transaction(
        batch.map(movement =>
          postgres.inventoryMovement.upsert({
            where: { id: movement.id },
            create: movement,
            update: movement,
          })
        )
      )
    }
    console.log(`✅ Migrated ${movements.length} inventory movements\n`)

    // Migrate InventorySnapshots
    console.log('📦 Migrating InventorySnapshots...')
    const snapshots = await sqlite.inventorySnapshot.findMany()
    for (const snapshot of snapshots) {
      await postgres.inventorySnapshot.upsert({
        where: { userId_itemId: { userId: snapshot.userId, itemId: snapshot.itemId } },
        create: snapshot,
        update: snapshot,
      })
    }
    console.log(`✅ Migrated ${snapshots.length} inventory snapshots\n`)

    // Migrate CAClients
    console.log('📦 Migrating CAClients...')
    const caClients = await sqlite.cAClient.findMany()
    for (let i = 0; i < caClients.length; i += BATCH_SIZE) {
      const batch = caClients.slice(i, i + BATCH_SIZE)
      await postgres.$transaction(
        batch.map(client =>
          postgres.cAClient.upsert({
            where: { id: client.id },
            create: client,
            update: client,
          })
        )
      )
    }
    console.log(`✅ Migrated ${caClients.length} CA clients\n`)

    // Migrate EWayBills
    console.log('📦 Migrating EWayBills...')
    const ewayBills = await sqlite.eWayBill.findMany()
    for (let i = 0; i < ewayBills.length; i += BATCH_SIZE) {
      const batch = ewayBills.slice(i, i + BATCH_SIZE)
      await postgres.$transaction(
        batch.map(bill =>
          postgres.eWayBill.upsert({
            where: { id: bill.id },
            create: bill,
            update: bill,
          })
        )
      )
    }
    console.log(`✅ Migrated ${ewayBills.length} e-way bills\n`)

    // Migrate ConsolidatedEWayBills
    console.log('📦 Migrating ConsolidatedEWayBills...')
    const consolidatedBills = await sqlite.consolidatedEWayBill.findMany()
    for (let i = 0; i < consolidatedBills.length; i += BATCH_SIZE) {
      const batch = consolidatedBills.slice(i, i + BATCH_SIZE)
      await postgres.$transaction(
        batch.map(bill =>
          postgres.consolidatedEWayBill.upsert({
            where: { id: bill.id },
            create: bill,
            update: bill,
          })
        )
      )
    }
    console.log(`✅ Migrated ${consolidatedBills.length} consolidated e-way bills\n`)

    // Verification
    console.log('🔍 Verifying migration...\n')
    const sqliteCounts = {
      businessProfiles: await sqlite.businessProfile.count(),
      customers: await sqlite.customer.count(),
      items: await sqlite.item.count(),
      invoices: await sqlite.invoice.count(),
      payments: await sqlite.payment.count(),
      vendors: await sqlite.vendor.count(),
      purchases: await sqlite.purchaseInvoice.count(),
      expenses: await sqlite.expense.count(),
      quotations: await sqlite.quotation.count(),
      creditNotes: await sqlite.creditNote.count(),
      debitNotes: await sqlite.debitNote.count(),
      templates: await sqlite.recurringTemplate.count(),
      logs: await sqlite.recurringLog.count(),
      notifications: await sqlite.notification.count(),
      filings: await sqlite.filingRecord.count(),
      audits: await sqlite.auditEntry.count(),
      attachments: await sqlite.attachment.count(),
      movements: await sqlite.inventoryMovement.count(),
      snapshots: await sqlite.inventorySnapshot.count(),
      caClients: await sqlite.cAClient.count(),
      ewayBills: await sqlite.eWayBill.count(),
      consolidated: await sqlite.consolidatedEWayBill.count(),
    }

    const postgresCounts = {
      businessProfiles: await postgres.businessProfile.count(),
      customers: await postgres.customer.count(),
      items: await postgres.item.count(),
      invoices: await postgres.invoice.count(),
      payments: await postgres.payment.count(),
      vendors: await postgres.vendor.count(),
      purchases: await postgres.purchaseInvoice.count(),
      expenses: await postgres.expense.count(),
      quotations: await postgres.quotation.count(),
      creditNotes: await postgres.creditNote.count(),
      debitNotes: await postgres.debitNote.count(),
      templates: await postgres.recurringTemplate.count(),
      logs: await postgres.recurringLog.count(),
      notifications: await postgres.notification.count(),
      filings: await postgres.filingRecord.count(),
      audits: await postgres.auditEntry.count(),
      attachments: await postgres.attachment.count(),
      movements: await postgres.inventoryMovement.count(),
      snapshots: await postgres.inventorySnapshot.count(),
      caClients: await postgres.cAClient.count(),
      ewayBills: await postgres.eWayBill.count(),
      consolidated: await postgres.consolidatedEWayBill.count(),
    }

    let allMatch = true
    for (const [key, sqliteCount] of Object.entries(sqliteCounts)) {
      const postgresCount = postgresCounts[key as keyof typeof postgresCounts]
      const match = sqliteCount === postgresCount
      console.log(
        `${match ? '✅' : '❌'} ${key}: SQLite=${sqliteCount}, PostgreSQL=${postgresCount}`
      )
      if (!match) allMatch = false
    }

    if (allMatch) {
      console.log('\n✅ Migration completed successfully! All record counts match.')
    } else {
      console.log('\n⚠️  Migration completed but some counts do not match. Please review.')
    }

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await sqlite.$disconnect()
    await postgres.$disconnect()
  }
}

migrate()
  .then(() => {
    console.log('\n✨ Migration script finished')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration script failed:', error)
    process.exit(1)
  })
