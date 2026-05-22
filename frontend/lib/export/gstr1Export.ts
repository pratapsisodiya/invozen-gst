import type { GSTR1Summary } from '@/types/gst'
import { downloadCSV, downloadJSON } from './excelExport'

// Official GSTR-1 JSON format for GST portal upload
export function buildGSTR1PortalJSON(summary: GSTR1Summary) {
  const period = `${String(summary.period.month).padStart(2, '0')}${summary.period.year}`
  return {
    gstin: '',
    fp: period,
    b2b: summary.b2b.map((e) => ({
      ctin: e.customerGstin,
      inv: [{
        inum: e.invoiceNumber,
        idt: new Date(e.invoiceDate).toLocaleDateString('en-IN'),
        val: e.taxableValue + e.igst + e.cgst + e.sgst,
        pos: e.placeOfSupply.substring(0, 2),
        rchrg: e.reverseCharge ? 'Y' : 'N',
        inv_typ: 'R',
        itms: [{
          num: 1,
          itm_det: {
            txval: e.taxableValue,
            rt: 18,
            iamt: e.igst,
            camt: e.cgst,
            samt: e.sgst,
            csamt: e.cess,
          },
        }],
      }],
    })),
    b2cs: summary.b2cs.map((e) => ({
      sply_ty: 'INTRA',
      pos: e.placeOfSupply.substring(0, 2),
      typ: 'OE',
      rt: e.applicableTaxRate,
      txval: e.taxableValue,
      iamt: e.igst,
      camt: 0,
      samt: 0,
      csamt: e.cess,
    })),
    cdnr: summary.cdnr.map((e) => ({
      ctin: e.customerGstin,
      nt: [{
        ntty: 'C',
        nt_num: e.invoiceNumber,
        nt_dt: new Date(e.invoiceDate).toLocaleDateString('en-IN'),
        val: e.taxableValue + e.igst + e.cgst + e.sgst,
        pos: e.placeOfSupply.substring(0, 2),
        rchrg: 'N',
        itms: [{
          num: 1,
          itm_det: {
            rt: 18,
            txval: e.taxableValue,
            iamt: e.igst,
            camt: e.cgst,
            samt: e.sgst,
            csamt: 0,
          },
        }],
      }],
    })),
    hsn: {
      data: summary.hsn.map((h, i) => ({
        num: i + 1,
        hsn_sc: h.hsnCode,
        desc: h.description,
        uqc: h.uom.toUpperCase().substring(0, 3),
        qty: h.totalQuantity,
        txval: h.taxableValue,
        iamt: h.igst,
        camt: h.cgst,
        samt: h.sgst,
        csamt: 0,
      })),
    },
  }
}

export function exportGSTR1AsJSON(summary: GSTR1Summary): void {
  const data = buildGSTR1PortalJSON(summary)
  const month = String(summary.period.month).padStart(2, '0')
  downloadJSON(data, `GSTR1_${month}_${summary.period.year}.json`)
}

export function exportGSTR1AsCSV(summary: GSTR1Summary): void {
  const month = String(summary.period.month).padStart(2, '0')
  // Export B2B sheet
  const b2bRows = summary.b2b.map((e) => ({
    'GSTIN of Recipient': e.customerGstin,
    'Receiver Name': e.customerName,
    'Invoice Number': e.invoiceNumber,
    'Invoice Date': new Date(e.invoiceDate).toLocaleDateString('en-IN'),
    'Invoice Value': (e.taxableValue + e.igst + e.cgst + e.sgst).toFixed(2),
    'Place of Supply': e.placeOfSupply,
    'Reverse Charge': e.reverseCharge ? 'Y' : 'N',
    'Invoice Type': e.invoiceType,
    'Taxable Value': e.taxableValue.toFixed(2),
    'IGST': e.igst.toFixed(2),
    'CGST': e.cgst.toFixed(2),
    'SGST': e.sgst.toFixed(2),
    'Cess': '0.00',
  }))
  downloadCSV(b2bRows, `GSTR1_B2B_${month}_${summary.period.year}.csv`)
}

export function exportGSTR3BAsCSV(gstr3b: {
  section31: {
    outwardTaxableInterState: { taxableValue: number; igst: number }
    outwardTaxableIntraState: { taxableValue: number; cgst: number; sgst: number }
    zeroRated: { taxableValue: number }
    exempt: { taxableValue: number }
  }
  taxLiability: {
    outputIgst: number; outputCgst: number; outputSgst: number; totalOutput: number
    itcIgst: number; itcCgst: number; itcSgst: number
    netPayableIgst: number; netPayableCgst: number; netPayableSgst: number; netPayableTotal: number
  }
  period: { month: number; year: number }
}): void {
  const rows = [
    { 'Section': '3.1(a)', 'Nature': 'Outward taxable supplies (inter-state)', 'Taxable Value': gstr3b.section31.outwardTaxableInterState.taxableValue.toFixed(2), 'IGST': gstr3b.section31.outwardTaxableInterState.igst.toFixed(2), 'CGST': '0.00', 'SGST': '0.00' },
    { 'Section': '3.1(b)', 'Nature': 'Outward taxable supplies (intra-state)', 'Taxable Value': gstr3b.section31.outwardTaxableIntraState.taxableValue.toFixed(2), 'IGST': '0.00', 'CGST': gstr3b.section31.outwardTaxableIntraState.cgst.toFixed(2), 'SGST': gstr3b.section31.outwardTaxableIntraState.sgst.toFixed(2) },
    { 'Section': '3.1(c)', 'Nature': 'Zero-rated supplies', 'Taxable Value': gstr3b.section31.zeroRated.taxableValue.toFixed(2), 'IGST': '0.00', 'CGST': '0.00', 'SGST': '0.00' },
    { 'Section': '3.1(d)', 'Nature': 'Exempt/Nil-rated', 'Taxable Value': gstr3b.section31.exempt.taxableValue.toFixed(2), 'IGST': '0.00', 'CGST': '0.00', 'SGST': '0.00' },
    { 'Section': '4', 'Nature': 'Net ITC Available', 'Taxable Value': '', 'IGST': gstr3b.taxLiability.itcIgst.toFixed(2), 'CGST': gstr3b.taxLiability.itcCgst.toFixed(2), 'SGST': gstr3b.taxLiability.itcSgst.toFixed(2) },
    { 'Section': '6.1', 'Nature': 'Net Tax Payable', 'Taxable Value': '', 'IGST': gstr3b.taxLiability.netPayableIgst.toFixed(2), 'CGST': gstr3b.taxLiability.netPayableCgst.toFixed(2), 'SGST': gstr3b.taxLiability.netPayableSgst.toFixed(2) },
  ]
  const month = String(gstr3b.period.month).padStart(2, '0')
  downloadCSV(rows, `GSTR3B_${month}_${gstr3b.period.year}.csv`)
}
