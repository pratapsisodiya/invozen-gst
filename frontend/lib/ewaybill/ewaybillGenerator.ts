import type { Invoice } from '@/types/invoice'
import type { BusinessProfile } from '@/types/business'
import { downloadJSON } from '@/lib/export/excelExport'

export interface EWayBillDetails {
  transporterName: string
  transporterId: string
  vehicleNumber: string
  vehicleType: 'R' | 'O'  // R = Regular, O = Over Dimensional Cargo
  transportMode: '1' | '2' | '3' | '4'  // 1=Road, 2=Rail, 3=Air, 4=Ship
  distance: number
  transDocNumber: string | null
  transDocDate: string | null
}

export interface EWayBillPayload {
  supplyType: string
  subSupplyType: string
  docType: string
  docNo: string
  docDate: string
  fromGstin: string
  fromTrdName: string
  fromAddr1: string
  fromAddr2: string
  fromPlace: string
  fromPincode: number
  fromStateCode: number
  toGstin: string
  toTrdName: string
  toAddr1: string
  toAddr2: string
  toPlace: string
  toPincode: number
  toStateCode: number
  totInvVal: number
  totalValue: number
  cgstValue: number
  sgstValue: number
  igstValue: number
  cessValue: number
  transporterDetails: EWayBillDetails
  itemList: Array<{
    productName: string
    hsnCode: string
    quantity: number
    qtyUnit: string
    taxableAmount: number
    sgstRate: number
    cgstRate: number
    igstRate: number
  }>
}

export function generateEWayBillPayload(
  invoice: Invoice,
  profile: BusinessProfile,
  details: EWayBillDetails
): EWayBillPayload {
  const fromStateCode = parseInt(profile.stateCode, 10)
  const toStateCode = parseInt(invoice.customerSnapshot.stateCode || profile.stateCode, 10)

  return {
    supplyType: 'O',
    subSupplyType: '1',
    docType: 'INV',
    docNo: invoice.invoiceNumber,
    docDate: new Date(invoice.invoiceDate).toLocaleDateString('en-IN'),
    fromGstin: profile.gstin,
    fromTrdName: profile.businessName,
    fromAddr1: profile.billingAddress.line1,
    fromAddr2: profile.billingAddress.line2 || '',
    fromPlace: profile.billingAddress.city,
    fromPincode: parseInt(profile.billingAddress.pincode, 10) || 0,
    fromStateCode,
    toGstin: invoice.customerSnapshot.gstin || 'URP',
    toTrdName: invoice.customerSnapshot.name,
    toAddr1: invoice.customerSnapshot.address || '',
    toAddr2: '',
    toPlace: invoice.customerSnapshot.state,
    toPincode: 0,
    toStateCode,
    totInvVal: invoice.grandTotal,
    totalValue: invoice.taxableValue,
    cgstValue: invoice.cgstTotal,
    sgstValue: invoice.sgstTotal,
    igstValue: invoice.igstTotal,
    cessValue: 0,
    transporterDetails: details,
    itemList: invoice.lineItems.map((li) => ({
      productName: li.description,
      hsnCode: li.hsnSac,
      quantity: li.quantity,
      qtyUnit: li.unit.toUpperCase().substring(0, 3),
      taxableAmount: li.taxableValue,
      sgstRate: invoice.supplyType === 'intra' ? li.gstRate / 2 : 0,
      cgstRate: invoice.supplyType === 'intra' ? li.gstRate / 2 : 0,
      igstRate: invoice.supplyType === 'inter' ? li.gstRate : 0,
    })),
  }
}

export function downloadEWayBillJSON(
  invoice: Invoice,
  profile: BusinessProfile,
  details: EWayBillDetails
): void {
  const payload = generateEWayBillPayload(invoice, profile, details)
  downloadJSON(payload, `EWayBill_${invoice.invoiceNumber}.json`)
}
