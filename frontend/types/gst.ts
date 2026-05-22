export interface GSTCalcResult {
  cgst: number
  sgst: number
  igst: number
  totalTax: number
  grandTotal: number
}

export interface InvoiceTotals {
  subtotal: number
  discountAmount: number
  taxableValue: number
  cgstTotal: number
  sgstTotal: number
  igstTotal: number
  cessTotal: number
  totalTax: number
  roundOff: number
  grandTotal: number
  amountInWords: string
}

export interface GSTR1B2BEntry {
  customerGstin: string
  customerName: string
  invoiceNumber: string
  invoiceDate: string
  invoiceType: string
  placeOfSupply: string
  reverseCharge: boolean
  taxableValue: number
  igst: number
  cgst: number
  sgst: number
  cess: number
  invoiceId: string
}

export interface GSTR1B2CSummary {
  type: string
  placeOfSupply: string
  applicableTaxRate: number
  taxableValue: number
  igst: number
  cess: number
}

export interface GSTR1Summary {
  period: { month: number; year: number }
  b2b: GSTR1B2BEntry[]
  b2cs: GSTR1B2CSummary[]
  cdnr: GSTR1B2BEntry[]
  nil: {
    nilRated: number
    exempted: number
    nonGst: number
  }
  hsn: Array<{
    hsnCode: string
    description: string
    uom: string
    totalQuantity: number
    taxableValue: number
    gstRate: number
    igst: number
    cgst: number
    sgst: number
  }>
  totals: {
    taxableValue: number
    igst: number
    cgst: number
    sgst: number
    cess: number
    totalTax: number
  }
  missingHsnCount: number
  skippedEmptyLineItems: number
}

export interface GSTR3BSection31 {
  outwardTaxableInterState: { taxableValue: number; igst: number }
  outwardTaxableIntraState: { taxableValue: number; cgst: number; sgst: number }
  zeroRated: { taxableValue: number }
  exempt: { taxableValue: number }
  nonGst: { taxableValue: number }
}

export interface GSTR3BSummary {
  period: { month: number; year: number }
  section31: GSTR3BSection31
  itcAvailable: {
    importGoods: number
    inwardB2B: number
    itcReversed: number
    netItc: number
  }
  nilExempt: {
    interState: number
    intraState: number
  }
  taxLiability: {
    outputIgst: number
    outputCgst: number
    outputSgst: number
    totalOutput: number
    itcIgst: number
    itcCgst: number
    itcSgst: number
    netPayableIgst: number
    netPayableCgst: number
    netPayableSgst: number
    netPayableTotal: number
  }
}
