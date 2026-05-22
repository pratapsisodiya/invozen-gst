import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { ok } from '../lib/response.js'

const router = Router()
router.use(requireAuth)

/**
 * Freelancer-Specific Features
 *
 * Tax calculator, expense insights, and simplified compliance tools
 * designed for individual freelancers and small service providers
 */

// GET /freelancer/tax-calculator - Calculate tax liability and savings
router.get('/tax-calculator', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const { period } = req.query as { period?: string } // YYYY-MM format

    // Get business profile to check registration type
    const business = await prisma.businessProfile.findUnique({ where: { userId } })
    if (!business) {
      return ok(res, { error: 'Business profile not found' })
    }

    const businessData = business.data as any
    const registrationType = businessData.gstRegistrationType || 'regular'
    const isComposition = registrationType === 'composition'

    // Calculate date range
    const currentDate = new Date()
    const startDate = period
      ? `${period}-01`
      : `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`
    const endDate = period
      ? `${period}-31`
      : new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0]

    // Get all invoices for the period
    const invoices = await prisma.invoice.findMany({
      where: {
        userId,
        invoiceDate: { gte: startDate, lte: endDate },
        status: { in: ['sent', 'paid'] }, // Don't count drafts
      },
    })

    // Calculate revenue and GST
    let totalRevenue = 0
    let totalGstCollected = 0

    for (const invoice of invoices) {
      const data = invoice.data as any
      totalRevenue += data.taxableValue || 0
      totalGstCollected += data.totalTax || 0
    }

    // Get all expenses for the period
    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
    })

    let totalExpenses = 0
    let totalItcAvailable = 0

    for (const expense of expenses) {
      const data = expense.data as any
      totalExpenses += data.amount || 0
      // ITC calculation (only for regular scheme)
      if (!isComposition && data.gstAmount) {
        totalItcAvailable += data.gstAmount
      }
    }

    // Tax calculations
    const netProfit = totalRevenue - totalExpenses
    const incomeTaxRate = 0.30 // 30% for simplicity (actual varies by slab)
    const estimatedIncomeTax = netProfit > 250000 ? (netProfit - 250000) * incomeTaxRate : 0

    // GST liability
    let gstLiability = 0
    if (isComposition) {
      // Composition scheme: 1-6% of revenue (average 2%)
      gstLiability = totalRevenue * 0.02
    } else {
      // Regular scheme: GST collected - ITC claimed
      gstLiability = totalGstCollected - totalItcAvailable
    }

    // Total tax liability
    const totalTaxLiability = estimatedIncomeTax + gstLiability

    // Monthly savings recommendation (for quarterly filing)
    const monthlySavings = totalTaxLiability / 3

    // Advance tax dates
    const advanceTaxDates = [
      { quarter: 'Q1', dueDate: '15-Jun', percentage: 15 },
      { quarter: 'Q2', dueDate: '15-Sep', percentage: 45 },
      { quarter: 'Q3', dueDate: '15-Dec', percentage: 75 },
      { quarter: 'Q4', dueDate: '15-Mar', percentage: 100 },
    ]

    ok(res, {
      period: period || `${startDate} to ${endDate}`,
      registrationType,
      revenue: {
        total: totalRevenue,
        invoiceCount: invoices.length,
      },
      expenses: {
        total: totalExpenses,
        expenseCount: expenses.length,
        itcAvailable: totalItcAvailable,
      },
      profitLoss: {
        grossProfit: totalRevenue,
        expenses: totalExpenses,
        netProfit,
      },
      taxLiability: {
        gst: {
          collected: totalGstCollected,
          itcClaimed: totalItcAvailable,
          netLiability: gstLiability,
        },
        incomeTax: {
          taxableIncome: netProfit,
          estimatedTax: estimatedIncomeTax,
          effectiveRate: netProfit > 0 ? (estimatedIncomeTax / netProfit) * 100 : 0,
        },
        total: totalTaxLiability,
      },
      savingsRecommendation: {
        monthly: monthlySavings,
        quarterly: totalTaxLiability,
        message: `Set aside ₹${monthlySavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })} per month for taxes`,
      },
      advanceTaxSchedule: advanceTaxDates.map(d => ({
        ...d,
        amount: (estimatedIncomeTax * d.percentage) / 100,
      })),
      tips: [
        isComposition
          ? 'Composition scheme: Pay flat 1-6% GST on revenue'
          : 'Regular scheme: Claim ITC on business expenses to reduce GST liability',
        'Set up recurring transfer to tax savings account',
        'File GSTR-3B and pay tax by 20th of next month',
        netProfit > 500000
          ? 'Consider hiring a CA for tax optimization'
          : 'Use Invozen\'s automated GST filing to stay compliant',
      ],
    })
  } catch (err) {
    next(err)
  }
})

// GET /freelancer/expense-insights - AI-powered expense categorization insights
router.get('/expense-insights', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId
    const { period } = req.query as { period?: string }

    // Calculate date range
    const currentDate = new Date()
    const startDate = period
      ? `${period}-01`
      : `${currentDate.getFullYear()}-${String(currentDate.getMonth() - 2).padStart(2, '0')}-01` // Last 3 months

    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
      orderBy: { date: 'desc' },
    })

    // Categorize expenses
    const categoryTotals: Record<string, number> = {}
    const categoryCount: Record<string, number> = {}
    const itcEligible: Record<string, number> = {}

    for (const expense of expenses) {
      const data = expense.data as any
      const category = expense.category || 'uncategorized'
      const amount = data.amount || 0
      const gstAmount = data.gstAmount || 0

      categoryTotals[category] = (categoryTotals[category] || 0) + amount
      categoryCount[category] = (categoryCount[category] || 0) + 1

      // ITC tracking
      if (gstAmount > 0 && data.itcEligible !== false) {
        itcEligible[category] = (itcEligible[category] || 0) + gstAmount
      }
    }

    // Calculate trends
    const totalExpenses = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0)
    const totalItc = Object.values(itcEligible).reduce((sum, val) => sum + val, 0)

    // Category insights
    const categoryInsights = Object.entries(categoryTotals).map(([category, total]) => ({
      category,
      total,
      count: categoryCount[category],
      percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
      itcAvailable: itcEligible[category] || 0,
      averagePerExpense: total / categoryCount[category],
    })).sort((a, b) => b.total - a.total)

    // Identify anomalies (expenses >3x average)
    const anomalies = []
    for (const expense of expenses) {
      const data = expense.data as any
      const category = expense.category || 'uncategorized'
      const amount = data.amount || 0
      const avgForCategory = categoryTotals[category] / categoryCount[category]

      if (amount > avgForCategory * 3) {
        anomalies.push({
          id: expense.id,
          category,
          amount,
          average: avgForCategory,
          multiplier: amount / avgForCategory,
          description: data.description || 'Unknown',
          flag: amount > avgForCategory * 5 ? 'high' : 'medium',
        })
      }
    }

    // Savings opportunities
    const savingsOpportunities = []
    for (const insight of categoryInsights) {
      if (insight.percentage > 30) {
        savingsOpportunities.push({
          category: insight.category,
          message: `${insight.category} is ${insight.percentage.toFixed(0)}% of expenses. Consider reviewing for optimization.`,
          potentialSaving: insight.total * 0.1, // Suggest 10% reduction
        })
      }
    }

    ok(res, {
      period: `${startDate} to present`,
      summary: {
        totalExpenses,
        expenseCount: expenses.length,
        totalItcAvailable: totalItc,
        averageExpense: totalExpenses / expenses.length,
      },
      byCategory: categoryInsights,
      anomalies: anomalies.slice(0, 5), // Top 5 anomalies
      savingsOpportunities,
      recommendations: [
        totalItc > 1000
          ? `You have ₹${totalItc.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ITC available. Ensure you claim it in GSTR-3B.`
          : 'Keep uploading GST bills to maximize ITC claims.',
        anomalies.length > 0
          ? `${anomalies.length} expense(s) flagged as unusual. Review for accuracy.`
          : 'All expenses look normal.',
        categoryInsights[0]?.category
          ? `Top expense category: ${categoryInsights[0].category} (${categoryInsights[0].percentage.toFixed(0)}%)`
          : 'Add more expenses to get insights.',
      ],
    })
  } catch (err) {
    next(err)
  }
})

// GET /freelancer/bill-payment-tracker - Track vendor bills due for payment
router.get('/bill-payment-tracker', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthRequest).userId

    // Get all purchase invoices
    const purchases = await prisma.purchaseInvoice.findMany({
      where: { userId },
      orderBy: { invoiceDate: 'desc' },
    })

    // Get all payments made
    const payments = await prisma.payment.findMany({
      where: { userId },
    })

    // Build payment tracking
    const billsWithPaymentStatus = []
    let totalDue = 0
    let totalOverdue = 0

    for (const purchase of purchases) {
      const data = purchase.data as any
      const dueDate = new Date(data.dueDate || data.invoiceDate)
      const today = new Date()
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      // Find payments for this purchase
      const relatedPayments = payments.filter(p => {
        const paymentData = p.data as any
        return paymentData.purchaseId === purchase.id
      })

      const amountPaid = relatedPayments.reduce((sum, p) => {
        const paymentData = p.data as any
        return sum + (paymentData.amount || 0)
      }, 0)

      const balance = (data.grandTotal || 0) - amountPaid

      if (balance > 0) {
        totalDue += balance
        if (daysUntilDue < 0) {
          totalOverdue += balance
        }

        billsWithPaymentStatus.push({
          purchaseId: purchase.id,
          vendorName: data.vendorSnapshot?.name || 'Unknown',
          billNumber: data.invoiceNumber,
          billDate: data.invoiceDate,
          dueDate: data.dueDate,
          amount: data.grandTotal,
          amountPaid,
          balance,
          status: daysUntilDue < 0 ? 'overdue' : daysUntilDue <= 7 ? 'due_soon' : 'pending',
          daysUntilDue,
        })
      }
    }

    // Sort by due date (overdue first)
    billsWithPaymentStatus.sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1
      if (a.status !== 'overdue' && b.status === 'overdue') return 1
      return a.daysUntilDue - b.daysUntilDue
    })

    ok(res, {
      summary: {
        totalDue,
        totalOverdue,
        billsPending: billsWithPaymentStatus.length,
        billsDueSoon: billsWithPaymentStatus.filter(b => b.status === 'due_soon').length,
      },
      bills: billsWithPaymentStatus,
      alerts: [
        totalOverdue > 0
          ? `⚠️ ${billsWithPaymentStatus.filter(b => b.status === 'overdue').length} overdue bills totaling ₹${totalOverdue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
          : null,
        billsWithPaymentStatus.filter(b => b.status === 'due_soon').length > 0
          ? `📅 ${billsWithPaymentStatus.filter(b => b.status === 'due_soon').length} bills due within 7 days`
          : null,
      ].filter(Boolean),
    })
  } catch (err) {
    next(err)
  }
})

export default router
