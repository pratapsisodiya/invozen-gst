import type { Invoice } from '@/types/invoice'
import type { PurchaseInvoice } from '@/types/purchase'
import type { BusinessProfile } from '@/types/business'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function tallyDate(isoDate: string): string {
  const d = new Date(isoDate)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

export function buildTallyXML(
  invoices: Invoice[],
  purchases: PurchaseInvoice[],
  profile: BusinessProfile
): string {
  const salesVouchers = invoices
    .filter((inv) => inv.status !== 'void')
    .map((inv) => {
      const intra = inv.supplyType === 'intra'
      const cgst = intra ? inv.cgstTotal : 0
      const sgst = intra ? inv.sgstTotal : 0
      const igst = !intra ? inv.igstTotal : 0

      const lineEntries = inv.lineItems.map((li) => `
        <ALLEDGER NAME="${escapeXml(li.description)}" AMOUNT="-${li.taxableValue.toFixed(2)}" />
      `).join('')

      return `
  <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">
    <DATE>${tallyDate(inv.invoiceDate)}</DATE>
    <NARRATION>${escapeXml(inv.invoiceNumber)} - ${escapeXml(inv.customerSnapshot.name)}</NARRATION>
    <VOUCHERNUMBER>${escapeXml(inv.invoiceNumber)}</VOUCHERNUMBER>
    <PARTYLEDGERNAME>${escapeXml(inv.customerSnapshot.name)}</PARTYLEDGERNAME>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>${escapeXml(inv.customerSnapshot.name)}</LEDGERNAME>
      <AMOUNT>-${inv.grandTotal.toFixed(2)}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
    ${lineEntries}
    ${cgst > 0 ? `<ALLLEDGERENTRIES.LIST><LEDGERNAME>Output CGST</LEDGERNAME><AMOUNT>${cgst.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>` : ''}
    ${sgst > 0 ? `<ALLLEDGERENTRIES.LIST><LEDGERNAME>Output SGST</LEDGERNAME><AMOUNT>${sgst.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>` : ''}
    ${igst > 0 ? `<ALLLEDGERENTRIES.LIST><LEDGERNAME>Output IGST</LEDGERNAME><AMOUNT>${igst.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>` : ''}
  </VOUCHER>`
    }).join('\n')

  const purchaseVouchers = purchases
    .filter((p) => p.status !== 'draft')
    .map((p) => {
      const intra = p.supplyType === 'intra'
      const cgst = intra ? p.cgstTotal : 0
      const sgst = intra ? p.sgstTotal : 0
      const igst = !intra ? p.igstTotal : 0

      return `
  <VOUCHER VCHTYPE="Purchase" ACTION="Create" OBJVIEW="Invoice Voucher View">
    <DATE>${tallyDate(p.invoiceDate)}</DATE>
    <NARRATION>${escapeXml(p.vendorInvoiceNumber)} - ${escapeXml(p.vendorSnapshot.name)}</NARRATION>
    <VOUCHERNUMBER>${escapeXml(p.purchaseNumber)}</VOUCHERNUMBER>
    <PARTYLEDGERNAME>${escapeXml(p.vendorSnapshot.name)}</PARTYLEDGERNAME>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>${escapeXml(p.vendorSnapshot.name)}</LEDGERNAME>
      <AMOUNT>${p.grandTotal.toFixed(2)}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>Purchase Account</LEDGERNAME>
      <AMOUNT>-${p.taxableValue.toFixed(2)}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
    ${cgst > 0 ? `<ALLLEDGERENTRIES.LIST><LEDGERNAME>Input CGST</LEDGERNAME><AMOUNT>-${cgst.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>` : ''}
    ${sgst > 0 ? `<ALLLEDGERENTRIES.LIST><LEDGERNAME>Input SGST</LEDGERNAME><AMOUNT>-${sgst.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>` : ''}
    ${igst > 0 ? `<ALLLEDGERENTRIES.LIST><LEDGERNAME>Input IGST</LEDGERNAME><AMOUNT>-${igst.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>` : ''}
  </VOUCHER>`
    }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(profile.businessName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE>
          ${salesVouchers}
          ${purchaseVouchers}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`
}

export function downloadTallyXML(
  invoices: Invoice[],
  purchases: PurchaseInvoice[],
  profile: BusinessProfile
): void {
  const xml = buildTallyXML(invoices, purchases, profile)
  const blob = new Blob([xml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Tally_Export_${new Date().toISOString().split('T')[0]}.xml`
  a.click()
  URL.revokeObjectURL(url)
}
