import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { toJson } from '../lib/prisma.js'
import { ok, created, notFound, badRequest } from '../lib/response.js'
import {
  validateEWayBill,
  validateCancellation,
  validateExtension,
  validatePartB,
  calculateValidUpto,
  generateEWayBillNumber,
  isExpired,
  isExpiringSoon
} from '../lib/ewayBillValidation.js'

const router = Router()
router.use(requireAuth)

// Get all E-way bills with filters
router.get('/', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const { status, dateFrom, dateTo, search, expiringIn } = req.query as Record<string, string>

    const rows = await prisma.eWayBill.findMany({
      where: {
        userId,
        ...(status && status !== 'all' ? { status } : {}),
        ...(dateFrom || dateTo ? {
          docDate: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    let data = rows.map((r) => r.data)
    
    // Filter by search term
    if (search) {
      const q = search.toLowerCase()
      data = data.filter((ewb: any) => {
        return ewb.ewayBillNumber?.toLowerCase().includes(q) ||
          ewb.docNumber?.toLowerCase().includes(q) ||
          ewb.fromTradeName?.toLowerCase().includes(q) ||
          ewb.toTradeName?.toLowerCase().includes(q)
      })
    }
    
    // Filter by expiring soon
    if (expiringIn) {
      const hours = parseInt(expiringIn) * 24 // Convert days to hours
      data = data.filter((ewb: any) => isExpiringSoon(ewb.validUpto, hours))
    }
    
    ok(res, data)
  } catch (err) { next(err) }
})

// Create new E-way bill (draft)
router.post('/', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const body = req.body as Record<string, unknown>
    
    if (!body['id'] || !body['docNumber']) {
      return badRequest(res, 'id and docNumber are required')
    }

    // Validate E-way bill data
    const validation = validateEWayBill(body)
    if (!validation.isValid) {
      return badRequest(res, validation.errors.join(', '))
    }

    const row = await prisma.eWayBill.create({
      data: {
        id: body['id'] as string,
        userId,
        ewayBillNumber: body['ewayBillNumber'] as string | null,
        status: (body['status'] as string) || 'draft',
        generationType: (body['generationType'] as string) || 'manual',
        invoiceId: body['invoiceId'] as string | null,
        challanId: body['challanId'] as string | null,
        transactionType: body['transactionType'] as string,
        subType: body['subType'] as string,
        docType: body['docType'] as string,
        docNumber: body['docNumber'] as string,
        docDate: body['docDate'] as string,
        fromGstin: body['fromGstin'] as string,
        fromTradeName: body['fromTradeName'] as string,
        fromAddress: body['fromAddress'] as string,
        fromPlace: body['fromPlace'] as string,
        fromPincode: body['fromPincode'] as string,
        fromStateCode: body['fromStateCode'] as string,
        toGstin: body['toGstin'] as string | null,
        toTradeName: body['toTradeName'] as string,
        toAddress: body['toAddress'] as string,
        toPlace: body['toPlace'] as string,
        toPincode: body['toPincode'] as string,
        toStateCode: body['toStateCode'] as string,
        hsnCode: body['hsnCode'] as string,
        productName: body['productName'] as string,
        quantity: body['quantity'] as number,
        unit: body['unit'] as string,
        totalValue: body['totalValue'] as number,
        taxableAmount: body['taxableAmount'] as number,
        transportMode: body['transportMode'] as string,
        vehicleNumber: body['vehicleNumber'] as string | null,
        distance: body['distance'] as number,
        generatedDate: body['generatedDate'] as string | null,
        validUpto: body['validUpto'] as string | null,
        partBUpdated: false,
        cancelledDate: null,
        cancelReason: null,
        data: toJson(body),
      },
    })
    
    created(res, row.data)
  } catch (err) { next(err) }
})

// Get E-way bill by ID
router.get('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const row = await prisma.eWayBill.findFirst({ 
      where: { id: req.params['id'], userId } 
    })
    
    if (!row) return notFound(res)
    ok(res, row.data)
  } catch (err) { next(err) }
})

// Update E-way bill
router.put('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.eWayBill.findFirst({ 
      where: { id: req.params['id'], userId } 
    })
    
    if (!existing) return notFound(res)

    // Only allow updates to draft E-way bills
    const existingData = existing.data as Record<string, unknown>
    if (existingData['status'] !== 'draft') {
      return badRequest(res, 'Only draft E-way bills can be updated')
    }

    const merged = { ...existingData, ...req.body, updatedAt: new Date().toISOString() }
    
    // Validate updated data
    const validation = validateEWayBill(merged)
    if (!validation.isValid) {
      return badRequest(res, validation.errors.join(', '))
    }

    const m = merged as Record<string, unknown>
    const row = await prisma.eWayBill.update({
      where: { id: req.params['id'] },
      data: {
        ewayBillNumber: (m['ewayBillNumber'] as string) || existing.ewayBillNumber,
        status: (m['status'] as string) || existing.status,
        docNumber: (m['docNumber'] as string) || existing.docNumber,
        docDate: (m['docDate'] as string) || existing.docDate,
        fromGstin: (m['fromGstin'] as string) || existing.fromGstin,
        fromTradeName: (m['fromTradeName'] as string) || existing.fromTradeName,
        fromAddress: (m['fromAddress'] as string) || existing.fromAddress,
        fromPlace: (m['fromPlace'] as string) || existing.fromPlace,
        fromPincode: (m['fromPincode'] as string) || existing.fromPincode,
        fromStateCode: (m['fromStateCode'] as string) || existing.fromStateCode,
        toGstin: (m['toGstin'] as string | null) ?? existing.toGstin,
        toTradeName: (m['toTradeName'] as string) || existing.toTradeName,
        toAddress: (m['toAddress'] as string) || existing.toAddress,
        toPlace: (m['toPlace'] as string) || existing.toPlace,
        toPincode: (m['toPincode'] as string) || existing.toPincode,
        toStateCode: (m['toStateCode'] as string) || existing.toStateCode,
        hsnCode: (m['hsnCode'] as string) || existing.hsnCode,
        productName: (m['productName'] as string) || existing.productName,
        quantity: (m['quantity'] as number) || existing.quantity,
        unit: (m['unit'] as string) || existing.unit,
        totalValue: (m['totalValue'] as number) || existing.totalValue,
        taxableAmount: (m['taxableAmount'] as number) || existing.taxableAmount,
        transportMode: (m['transportMode'] as string) || existing.transportMode,
        vehicleNumber: (m['vehicleNumber'] as string | null) ?? existing.vehicleNumber,
        distance: (m['distance'] as number) || existing.distance,
        data: toJson(merged),
        updatedAt: new Date(),
      },
    })
    
    ok(res, row.data)
  } catch (err) { next(err) }
})

// Delete E-way bill (draft only)
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.eWayBill.findFirst({ 
      where: { id: req.params['id'], userId } 
    })
    
    if (!existing) return notFound(res)

    const existingData = existing.data as Record<string, unknown>
    if (existingData['status'] !== 'draft') {
      return badRequest(res, 'Only draft E-way bills can be deleted')
    }

    await prisma.eWayBill.delete({ where: { id: req.params['id'] } })
    ok(res, { message: 'E-way bill deleted successfully' })
  } catch (err) { next(err) }
})

// Generate E-way bill number (submit to GST portal)
router.post('/:id/generate', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const existing = await prisma.eWayBill.findFirst({ 
      where: { id: req.params['id'], userId } 
    })
    
    if (!existing) return notFound(res)

    const existingData = existing.data as Record<string, unknown>
    if (existingData['status'] !== 'draft') {
      return badRequest(res, 'E-way bill already generated')
    }

    // Validate before generation
    const validation = validateEWayBill(existingData)
    if (!validation.isValid) {
      return badRequest(res, validation.errors.join(', '))
    }

    // Generate E-way bill number (mock - in production, call GST API)
    const ewayBillNumber = generateEWayBillNumber()
    const generatedDate = new Date().toISOString()
    const vehicleType = (existingData['vehicleType'] as string) || 'regular'
    const validUpto = calculateValidUpto(
      generatedDate, 
      existing.distance,
      vehicleType as 'regular' | 'over_dimensional'
    )

    const updated = {
      ...existingData,
      ewayBillNumber,
      status: 'active',
      generatedDate,
      validUpto,
      updatedAt: new Date().toISOString()
    }

    const row = await prisma.eWayBill.update({
      where: { id: req.params['id'] },
      data: {
        ewayBillNumber,
        status: 'active',
        generatedDate,
        validUpto,
        data: toJson(updated),
        updatedAt: new Date(),
      },
    })

    // Create notification
    await prisma.notification.create({
      data: {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'eway_bill_generated',
        isRead: false,
        data: toJson({
          ewayBillId: req.params['id'],
          ewayBillNumber,
          message: `E-way bill ${ewayBillNumber} generated successfully`,
          validUpto
        })
      }
    })
    
    ok(res, row.data)
  } catch (err) { next(err) }
})

// Cancel E-way bill
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const { reason, remarks } = req.body as { reason: string; remarks?: string }
    
    if (!reason) {
      return badRequest(res, 'Cancellation reason is required')
    }

    const existing = await prisma.eWayBill.findFirst({ 
      where: { id: req.params['id'], userId } 
    })
    
    if (!existing) return notFound(res)

    const existingData = existing.data as Record<string, unknown>
    
    // Validate cancellation
    const validation = validateCancellation(existingData)
    if (!validation.isValid) {
      return badRequest(res, validation.errors.join(', '))
    }

    const cancelledDate = new Date().toISOString()
    const updated = {
      ...existingData,
      status: 'cancelled',
      cancelledDate,
      cancelReason: reason,
      cancelRemarks: remarks || null,
      updatedAt: new Date().toISOString()
    }

    const row = await prisma.eWayBill.update({
      where: { id: req.params['id'] },
      data: {
        status: 'cancelled',
        cancelledDate,
        cancelReason: reason,
        data: toJson(updated),
        updatedAt: new Date(),
      },
    })

    // Create notification
    await prisma.notification.create({
      data: {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'eway_bill_cancelled',
        isRead: false,
        data: toJson({
          ewayBillId: req.params['id'],
          ewayBillNumber: existing.ewayBillNumber,
          message: `E-way bill ${existing.ewayBillNumber} cancelled`,
          reason
        })
      }
    })
    
    ok(res, row.data)
  } catch (err) { next(err) }
})

// Extend E-way bill validity
router.post('/:id/extend', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const { remainingDistance, vehicleNumber, reason } = req.body as { 
      remainingDistance: number
      vehicleNumber?: string
      reason?: string
    }
    
    if (!remainingDistance || remainingDistance <= 0) {
      return badRequest(res, 'Valid remaining distance is required')
    }

    const existing = await prisma.eWayBill.findFirst({ 
      where: { id: req.params['id'], userId } 
    })
    
    if (!existing) return notFound(res)

    const existingData = existing.data as Record<string, unknown>
    
    // Validate extension
    const validation = validateExtension(existingData)
    if (!validation.isValid) {
      return badRequest(res, validation.errors.join(', '))
    }

    const extendedTimes = existing.extendedTimes + 1
    const vehicleType = (existingData['vehicleType'] as string) || 'regular'
    const newValidUpto = calculateValidUpto(
      new Date().toISOString(),
      remainingDistance,
      vehicleType as 'regular' | 'over_dimensional'
    )

    const updated = {
      ...existingData,
      status: 'extended',
      extendedTimes,
      validUpto: newValidUpto,
      vehicleNumber: vehicleNumber || existingData['vehicleNumber'],
      extensionReason: reason,
      updatedAt: new Date().toISOString()
    }

    const row = await prisma.eWayBill.update({
      where: { id: req.params['id'] },
      data: {
        status: 'extended',
        extendedTimes,
        validUpto: newValidUpto,
        vehicleNumber: vehicleNumber || existing.vehicleNumber,
        data: toJson(updated),
        updatedAt: new Date(),
      },
    })

    // Create notification
    await prisma.notification.create({
      data: {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'eway_bill_extended',
        isRead: false,
        data: toJson({
          ewayBillId: req.params['id'],
          ewayBillNumber: existing.ewayBillNumber,
          message: `E-way bill ${existing.ewayBillNumber} extended (${extendedTimes}/4)`,
          newValidUpto
        })
      }
    })
    
    ok(res, row.data)
  } catch (err) { next(err) }
})

// Update Part-B (transporter details)
router.put('/:id/part-b', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const partBData = req.body
    
    // Validate Part-B data
    const validation = validatePartB(partBData)
    if (!validation.isValid) {
      return badRequest(res, validation.errors.join(', '))
    }

    const existing = await prisma.eWayBill.findFirst({ 
      where: { id: req.params['id'], userId } 
    })
    
    if (!existing) return notFound(res)

    const existingData = existing.data as Record<string, unknown>
    if (existingData['status'] !== 'active' && existingData['status'] !== 'extended') {
      return badRequest(res, 'Part-B can only be updated for active E-way bills')
    }

    const updated = {
      ...existingData,
      partBUpdated: true,
      partBData: {
        ...partBData,
        updatedBy: userId,
        updatedDate: new Date().toISOString()
      },
      vehicleNumber: partBData.vehicleNumber,
      updatedAt: new Date().toISOString()
    }

    const row = await prisma.eWayBill.update({
      where: { id: req.params['id'] },
      data: {
        partBUpdated: true,
        vehicleNumber: partBData.vehicleNumber,
        data: toJson(updated),
        updatedAt: new Date(),
      },
    })
    
    ok(res, row.data)
  } catch (err) { next(err) }
})

// Create E-way bill from invoice
router.post('/from-invoice/:invoiceId', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const invoiceId = req.params['invoiceId']
    
    // Fetch invoice
    const invoice = await prisma.invoice.findFirst({ 
      where: { id: invoiceId, userId } 
    })
    
    if (!invoice) return notFound(res)

    const invoiceData = invoice.data as any
    
    // Map invoice data to E-way bill
    const ewayBillData = {
      id: `ewb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      generationType: 'invoice',
      invoiceId,
      transactionType: 'outward',
      subType: 'supply',
      docType: 'tax_invoice',
      docNumber: invoiceData.invoiceNumber,
      docDate: invoiceData.invoiceDate,
      fromGstin: invoiceData.businessGstin || '',
      fromTradeName: invoiceData.businessName || '',
      fromAddress: invoiceData.businessAddress || '',
      fromPlace: invoiceData.businessPlace || '',
      fromPincode: invoiceData.businessPincode || '',
      fromStateCode: invoiceData.businessStateCode || '',
      toGstin: invoiceData.customerSnapshot?.gstin || null,
      toTradeName: invoiceData.customerSnapshot?.name || '',
      toAddress: invoiceData.customerSnapshot?.address || '',
      toPlace: invoiceData.placeOfSupply || '',
      toPincode: invoiceData.customerSnapshot?.pincode || '',
      toStateCode: invoiceData.customerSnapshot?.stateCode || '',
      hsnCode: invoiceData.lineItems?.[0]?.hsnSac || '',
      productName: invoiceData.lineItems?.[0]?.description || 'Multiple Items',
      quantity: invoiceData.lineItems?.[0]?.quantity || 1,
      unit: invoiceData.lineItems?.[0]?.unit || 'NOS',
      cgstValue: invoiceData.cgstTotal || 0,
      sgstValue: invoiceData.sgstTotal || 0,
      igstValue: invoiceData.igstTotal || 0,
      cessValue: invoiceData.cessTotal || 0,
      cessNonAdvolValue: 0,
      otherValue: 0,
      totalValue: invoiceData.grandTotal || 0,
      taxableAmount: invoiceData.taxableValue || 0,
      transportMode: 'road',
      distance: 100, // Default, user should update
      status: 'draft',
      products: invoiceData.lineItems || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    ok(res, ewayBillData)
  } catch (err) { next(err) }
})

// Get expiring E-way bills
router.get('/expiring/soon', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const { hours = '24' } = req.query as Record<string, string>
    
    const rows = await prisma.eWayBill.findMany({
      where: {
        userId,
        status: { in: ['active', 'extended'] },
        validUpto: { not: null }
      },
      orderBy: { validUpto: 'asc' },
    })

    const hoursThreshold = parseInt(hours)
    const expiring = rows
      .map(r => r.data)
      .filter((ewb: any) => isExpiringSoon(ewb.validUpto, hoursThreshold))
    
    ok(res, expiring)
  } catch (err) { next(err) }
})

// Get E-way bill statistics
router.get('/stats/summary', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    
    const rows = await prisma.eWayBill.findMany({
      where: { userId },
    })

    const data = rows.map(r => r.data as any)
    
    const stats = {
      total: data.length,
      active: data.filter(e => e.status === 'active' || e.status === 'extended').length,
      expired: data.filter(e => e.status === 'expired' || isExpired(e.validUpto)).length,
      cancelled: data.filter(e => e.status === 'cancelled').length,
      draft: data.filter(e => e.status === 'draft').length,
      expiringToday: data.filter(e => isExpiringSoon(e.validUpto, 24)).length,
      expiringThisWeek: data.filter(e => isExpiringSoon(e.validUpto, 168)).length,
    }
    
    ok(res, stats)
  } catch (err) { next(err) }
})

// Validate E-way bill data
router.post('/validate', async (req, res, next) => {
  try {
    const validation = validateEWayBill(req.body)
    ok(res, validation)
  } catch (err) { next(err) }
})

export default router
