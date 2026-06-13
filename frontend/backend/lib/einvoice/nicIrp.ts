import axios, { type AxiosError } from 'axios'
import { config } from '../../config'

interface IrnResponse {
  irnNumber: string
  ackNo: string
  ackDate: string
  signedInvoice: string
  signedQrCode: string
}

interface NicIrpError {
  error_cd: string
  message: string
}

/**
 * NIC IRP (Invoice Registration Portal) Service
 *
 * Handles e-invoice generation and cancellation with the GST e-invoice system.
 * Supports both sandbox (testing) and production environments.
 *
 * References:
 * - NIC IRP API Documentation: https://einvoice1.gst.gov.in/
 * - Sandbox URL: https://gsp.adaequare.com/test/enriched/ei/api
 * - Production URL: https://einvoice1.gst.gov.in
 */
export class NicIrpService {
  private baseUrl: string
  private username: string
  private password: string
  private gstin: string
  private clientId: string
  private clientSecret: string
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null

  constructor() {
    this.baseUrl =
      config.NIC_IRP_ENVIRONMENT === 'production'
        ? 'https://einvoice1.gst.gov.in'
        : 'https://gsp.adaequare.com/test/enriched/ei/api'
    this.username = config.NIC_IRP_USERNAME
    this.password = config.NIC_IRP_PASSWORD
    this.gstin = config.NIC_IRP_GSTIN
    this.clientId = config.NIC_IRP_CLIENT_ID
    this.clientSecret = config.NIC_IRP_CLIENT_SECRET
  }

  /**
   * Authenticate with NIC IRP and get access token
   * Token validity: 6 hours
   */
  async authenticate(): Promise<string> {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/eivital/v1.03/auth`,
        {
          UserName: this.username,
          Password: this.password,
        },
        {
          headers: {
            'client_id': this.clientId,
            'client_secret': this.clientSecret,
            'Gstin': this.gstin,
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.data.Status === '1') {
        this.accessToken = response.data.Data.AccessToken as string
        this.tokenExpiry = new Date(Date.now() + 6 * 60 * 60 * 1000) // 6 hours
        return this.accessToken!
      } else {
        throw new Error(response.data.ErrorDetails || 'Authentication failed')
      }
    } catch (error) {
      this.handleError(error, 'Authentication failed')
      throw error
    }
  }

  /**
   * Generate IRN for an invoice
   */
  async generateIrn(invoice: any): Promise<IrnResponse> {
    const token = await this.authenticate()

    // Transform invoice to NIC IRP format
    const payload = this.transformToIrpFormat(invoice)

    try {
      const response = await axios.post(
        `${this.baseUrl}/eicore/v1.03/Invoice`,
        payload,
        {
          headers: {
            'client_id': this.clientId,
            'client_secret': this.clientSecret,
            'Gstin': this.gstin,
            'user_name': this.username,
            'AuthToken': token,
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.data.Status === '1') {
        return {
          irnNumber: response.data.Data.Irn,
          ackNo: response.data.Data.AckNo.toString(),
          ackDate: response.data.Data.AckDt,
          signedInvoice: response.data.Data.SignedInvoice,
          signedQrCode: response.data.Data.SignedQRCode,
        }
      } else {
        const errors = response.data.ErrorDetails as NicIrpError[] || []
        const errorMsg = errors.map(e => `${e.error_cd}: ${e.message}`).join(', ')
        throw new Error(errorMsg || 'IRN generation failed')
      }
    } catch (error) {
      this.handleError(error, 'IRN generation failed')
      throw error
    }
  }

  /**
   * Cancel an IRN
   */
  async cancelIrn(irn: string, reason: string, remarks: string): Promise<void> {
    const token = await this.authenticate()

    try {
      const response = await axios.post(
        `${this.baseUrl}/eicore/v1.03/Invoice/Cancel`,
        {
          Irn: irn,
          CnlRsn: reason, // '1' = Duplicate, '2' = Data Entry Mistake, '3' = Order Cancelled, '4' = Other
          CnlRem: remarks,
        },
        {
          headers: {
            'client_id': this.clientId,
            'client_secret': this.clientSecret,
            'Gstin': this.gstin,
            'user_name': this.username,
            'AuthToken': token,
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.data.Status !== '1') {
        const errors = response.data.ErrorDetails as NicIrpError[] || []
        const errorMsg = errors.map(e => `${e.error_cd}: ${e.message}`).join(', ')
        throw new Error(errorMsg || 'IRN cancellation failed')
      }
    } catch (error) {
      this.handleError(error, 'IRN cancellation failed')
      throw error
    }
  }

  /**
   * Transform Invozen invoice format to NIC IRP JSON schema
   */
  private transformToIrpFormat(invoice: any) {
    // Extract state code from place of supply (format: "29-Karnataka")
    const stateCode = invoice.placeOfSupply.split('-')[0]

    return {
      Version: '1.1',
      TranDtls: {
        TaxSch: 'GST',
        SupTyp: 'B2B',
        RegRev: 'N',
        IgstOnIntra: invoice.supplyType === 'inter' ? 'Y' : 'N',
      },
      DocDtls: {
        Typ: 'INV',
        No: invoice.invoiceNumber,
        Dt: this.formatDate(invoice.invoiceDate),
      },
      SellerDtls: {
        Gstin: this.gstin,
        LglNm: invoice.sellerSnapshot?.legalName || invoice.sellerSnapshot?.name || '',
        TrdNm: invoice.sellerSnapshot?.businessName || '',
        Addr1: invoice.sellerSnapshot?.address?.line1 || '',
        Addr2: invoice.sellerSnapshot?.address?.line2 || '',
        Loc: invoice.sellerSnapshot?.address?.city || '',
        Pin: parseInt(invoice.sellerSnapshot?.address?.pincode || '0', 10),
        Stcd: invoice.sellerSnapshot?.stateCode || this.gstin.substring(0, 2),
        Ph: invoice.sellerSnapshot?.phone || '',
        Em: invoice.sellerSnapshot?.email || '',
      },
      BuyerDtls: {
        Gstin: invoice.customerSnapshot.gstin || '',
        LglNm: invoice.customerSnapshot.name,
        TrdNm: invoice.customerSnapshot.name,
        Pos: stateCode,
        Addr1: invoice.customerSnapshot.address || '',
        Addr2: '',
        Loc: invoice.customerSnapshot.state || '',
        Pin: parseInt(invoice.customerSnapshot.pincode || '0', 10),
        Stcd: invoice.customerSnapshot.stateCode,
      },
      ItemList: invoice.lineItems.map((item: any, idx: number) => ({
        SlNo: String(idx + 1),
        PrdDesc: item.description,
        IsServc: item.hsnSac.length === 6 ? 'Y' : 'N',
        HsnCd: item.hsnSac,
        Qty: item.quantity,
        Unit: item.unit,
        UnitPrice: item.rate,
        TotAmt: item.taxableValue,
        Discount: item.discountAmount || 0,
        AssAmt: item.taxableValue,
        GstRt: item.gstRate,
        IgstAmt: item.igst || 0,
        CgstAmt: item.cgst || 0,
        SgstAmt: item.sgst || 0,
        CesRt: item.cessRate || 0,
        CesAmt: item.cessAmount || 0,
        TotItemVal: item.totalAmount,
      })),
      ValDtls: {
        AssVal: invoice.taxableValue,
        CgstVal: invoice.cgstTotal || 0,
        SgstVal: invoice.sgstTotal || 0,
        IgstVal: invoice.igstTotal || 0,
        CesVal: invoice.cessTotal || 0,
        Discount: invoice.discountAmount || 0,
        TotInvVal: invoice.grandTotal,
      },
    }
  }

  /**
   * Format date for NIC IRP (DD/MM/YYYY)
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  /**
   * Handle and log errors
   */
  private handleError(error: unknown, context: string): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError
      console.error(`${context}:`, {
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        message: axiosError.message,
      })
    } else {
      console.error(`${context}:`, error)
    }
  }
}
