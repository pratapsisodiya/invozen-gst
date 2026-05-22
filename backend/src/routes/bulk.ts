import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { toJson } from '../lib/prisma.js'
import { ok, badRequest } from '../lib/response.js'
import { generateId } from '../lib/id.js'
import { z } from 'zod'

const router = Router()
router.use(requireAuth)

/**
 * Bulk Operations API
 *
 * Designed for CA firms managing multiple clients
 * Enables batch processing of invoices, payments, filings across clients
 */

const bulkInvoiceGenerateSchema = z.object({
  clientIds: z.array(z.string().uuid()).min(1, 'At least one client required'),
  templateId: z.string().uuid(),
  invoiceDate: z.string().datetime().optional(),
})

const bulkEmailSchema = z.object({
  invoiceIds: z.array(z.string().uuid()).min(1, 'At least one invoice required'),
  subject: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(1000).optional(),
})

const bulkFilingSchema = z.object({
  clientIds: z.array(z.string().uuid()).min(1, 'At least one client required'),
  filingType: z.enum(['gstr1', 'gstr3b', 'gstr9']),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM format'),
})

// POST /bulk/invoices/generate - Bulk generate invoices from template
router.post('/invoices/generate', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const validated = bulkInvoiceGenerateSchema.parse(req.body)

    const results = []
    const errors = []

    for (const clientId of validated.clientIds) {
      try {
        // Get recurring template
        const template = await prisma.recurringTemplate.findFirst({
          where: { id: validated.templateId, userId },
        })

        if (!template) {
          errors.push({ clientId, error: 'Template not found' })
          continue
        }

        const templateData = template.data as any

        // Create invoice from template
        const invoiceId = generateId()
        const invoiceData = {
          ...templateData,
          id: invoiceId,
          invoiceDate: validated.invoiceDate || new Date().toISOString(),
          status: 'draft',
          createdAt: new Date().toISOString(),
        }

        await prisma.invoice.create({
          data: {
            id: invoiceId,
            userId,
            invoiceNumber: invoiceData.invoiceNumber,
            customerId: templateData.customerId,
            status: 'draft',
            invoiceDate: invoiceData.invoiceDate,
            data: toJson(invoiceData),
          },
        })

        // Log recurring generation
        await prisma.recurringLog.create({
          data: {
            id: generateId(),
            userId,
            templateId: validated.templateId,
            invoiceId,
            data: toJson({ generatedVia: 'bulk_operation' }),
          },
        })

        results.push({ clientId, invoiceId, status: 'success' })
      } catch (error) {
        errors.push({ clientId, error: (error as Error).message })
      }
    }

    ok(res, {
      total: validated.clientIds.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return badRequest(res, err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '))
    }
    next(err)
  }
})

// POST /bulk/invoices/email - Bulk send invoices via email
router.post('/invoices/email', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const validated = bulkEmailSchema.parse(req.body)

    const results = []
    const errors = []

    for (const invoiceId of validated.invoiceIds) {
      try {
        // Get invoice
        const invoice = await prisma.invoice.findFirst({
          where: { id: invoiceId, userId },
        })

        if (!invoice) {
          errors.push({ invoiceId, error: 'Invoice not found' })
          continue
        }

        // In production, send email here
        // await sendInvoiceEmail(invoice, validated.subject, validated.message)

        // Update invoice status
        const invoiceData = invoice.data as any
        const updated = { ...invoiceData, status: 'sent', sentAt: new Date().toISOString() }

        await prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: 'sent', data: toJson(updated), updatedAt: new Date() },
        })

        // Audit log
        await prisma.auditEntry.create({
          data: {
            id: generateId(),
            userId,
            entity: 'invoice',
            entityId: invoiceId,
            action: 'bulk_email',
            data: toJson({ via: 'bulk_operation' }),
          },
        })

        results.push({ invoiceId, status: 'sent' })
      } catch (error) {
        errors.push({ invoiceId, error: (error as Error).message })
      }
    }

    ok(res, {
      total: validated.invoiceIds.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return badRequest(res, err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '))
    }
    next(err)
  }
})

// POST /bulk/filings/status - Bulk update filing status across clients
router.post('/filings/status', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const validated = bulkFilingSchema.parse(req.body)

    const results = []
    const errors = []

    for (const clientId of validated.clientIds) {
      try {
        // Check if filing record exists
        const existing = await prisma.filingRecord.findFirst({
          where: {
            userId: clientId,
            type: validated.filingType,
            period: validated.period,
          },
        })

        const filingId = existing?.id || generateId()
        const filingData = {
          type: validated.filingType,
          period: validated.period,
          status: 'in_progress',
          filedBy: userId, // CA's userId
          filedAt: new Date().toISOString(),
        }

        if (existing) {
          await prisma.filingRecord.update({
            where: { id: filingId },
            data: { status: 'filed', data: toJson(filingData), updatedAt: new Date() },
          })
        } else {
          await prisma.filingRecord.create({
            data: {
              id: filingId,
              userId: clientId,
              type: validated.filingType,
              period: validated.period,
              status: 'filed',
              data: toJson(filingData),
            },
          })
        }

        results.push({ clientId, filingId, status: 'updated' })
      } catch (error) {
        errors.push({ clientId, error: (error as Error).message })
      }
    }

    ok(res, {
      total: validated.clientIds.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return badRequest(res, err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '))
    }
    next(err)
  }
})

// GET /bulk/reports/consolidated - Get consolidated report across clients
router.get('/reports/consolidated', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const { period, type } = req.query as { period?: string; type?: string }

    // Get all CA clients
    const clients = await prisma.cAClient.findMany({
      where: { userId },
      select: { id: true, userId: true, data: true },
    })

    const consolidatedData = []

    for (const client of clients) {
      const clientData = client.data as any

      // Get client's invoices for the period
      const invoices = await prisma.invoice.findMany({
        where: {
          userId: client.userId,
          ...(period ? {
            invoiceDate: {
              gte: `${period}-01`,
              lte: `${period}-31`,
            },
          } : {}),
        },
      })

      const totalRevenue = invoices.reduce((sum, inv) => {
        const data = inv.data as any
        return sum + (data.grandTotal || 0)
      }, 0)

      const totalGstCollected = invoices.reduce((sum, inv) => {
        const data = inv.data as any
        return sum + (data.totalTax || 0)
      }, 0)

      // Get filing status
      const filings = await prisma.filingRecord.findMany({
        where: {
          userId: client.userId,
          ...(period ? { period } : {}),
        },
      })

      consolidatedData.push({
        clientId: client.id,
        clientName: clientData.businessName || 'Unknown',
        clientGstin: clientData.gstin,
        revenue: totalRevenue,
        gstCollected: totalGstCollected,
        invoiceCount: invoices.length,
        filings: filings.map(f => ({
          type: f.type,
          period: f.period,
          status: f.status,
        })),
      })
    }

    ok(res, {
      period,
      clientCount: clients.length,
      totalRevenue: consolidatedData.reduce((sum, c) => sum + c.revenue, 0),
      totalGstCollected: consolidatedData.reduce((sum, c) => sum + c.gstCollected, 0),
      clients: consolidatedData,
    })
  } catch (err) {
    next(err)
  }
})

export default router
