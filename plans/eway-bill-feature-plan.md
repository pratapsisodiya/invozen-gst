# E-way Bill Generation and Management Feature Plan

## Overview
This document outlines the architecture and implementation plan for adding E-way Bill generation and management capabilities to the Invozen GST application. E-way Bills are mandatory documents for movement of goods worth more than ₹50,000 in India under GST regulations.

## Feature Scope

### Core Functionality
1. **E-way Bill Generation**: Create E-way bills from invoices or standalone
2. **E-way Bill Management**: View, update, cancel, and extend E-way bills
3. **Validation**: Ensure compliance with GST E-way bill rules
4. **Integration**: Link E-way bills with invoices and delivery challans
5. **Tracking**: Monitor E-way bill status, validity, and expiry
6. **Notifications**: Alert users about expiring E-way bills
7. **Reports**: Generate E-way bill reports and analytics

### E-way Bill Types
- **Regular E-way Bill**: For taxable supply of goods
- **Bill-to-Ship-to**: Different billing and shipping addresses
- **Consolidated E-way Bill**: Multiple E-way bills for a transporter

## Architecture Design

### 1. Database Schema

#### New Table: EWayBill

```prisma
model EWayBill {
  id                    String   @id
  userId                String
  ewayBillNumber        String?  // Generated after submission to GST portal
  status                String   // draft, active, cancelled, expired, extended
  generationType        String   // invoice, challan, manual
  
  // Reference IDs
  invoiceId             String?
  challanId             String?
  
  // Transaction Details
  transactionType       String   // outward, inward
  subType               String   // supply, export, job_work, etc.
  docType               String   // tax_invoice, bill_of_supply, delivery_challan
  docNumber             String
  docDate               String
  
  // Supplier Details
  fromGstin             String
  fromTradeName         String
  fromAddress           String
  fromPlace             String
  fromPincode           String
  fromStateCode         String
  
  // Recipient Details
  toGstin               String?
  toTradeName           String
  toAddress             String
  toPlace               String
  toPincode             String
  toStateCode           String
  
  // Product Details
  hsnCode               String
  productName           String
  productDesc           String?
  quantity              Float
  unit                  String
  cgstValue             Float
  sgstValue             Float
  igstValue             Float
  cessValue             Float
  cessNonAdvolValue     Float
  otherValue            Float
  totalValue            Float
  taxableAmount         Float
  
  // Transportation Details
  transportMode         String   // road, rail, air, ship
  transportDocNo        String?
  transportDocDate      String?
  vehicleNumber         String?
  vehicleType           String?  // regular, over_dimensional
  transporter           Json?    // {id, name, gstin}
  distance              Int      // in KM
  
  // Validity
  generatedDate         String?
  validUpto             String?
  extendedTimes         Int      @default(0)
  
  // Part-B (Transporter fills)
  partBUpdated          Boolean  @default(false)
  partBData             Json?
  
  // Cancellation
  cancelledDate         String?
  cancelReason          String?
  cancelRemarks         String?
  
  // Additional Info
  data                  Json     // Store complete E-way bill data
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@index([userId, status])
  @@index([userId, ewayBillNumber])
  @@index([userId, invoiceId])
  @@index([userId, validUpto])
  @@index([userId, generatedDate])
}

model ConsolidatedEWayBill {
  id                String   @id
  userId            String
  consEwayBillNo    String?
  generatedDate     String?
  validUpto         String?
  status            String   // draft, active, cancelled
  vehicleNumber     String
  transporterGstin  String?
  transporterName   String?
  fromPlace         String
  fromState         String
  ewayBillIds       Json     // Array of E-way bill IDs
  data              Json
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([userId, status])
  @@index([userId, consEwayBillNo])
}
```

### 2. TypeScript Type Definitions

**File**: [`frontend/types/ewayBill.ts`](frontend/types/ewayBill.ts)

```typescript
export type EWayBillStatus = 'draft' | 'active' | 'cancelled' | 'expired' | 'extended'
export type TransactionType = 'outward' | 'inward'
export type SubType = 'supply' | 'export' | 'job_work' | 'skd_ckd' | 'recipient_not_known' | 'for_own_use' | 'exhibition' | 'line_sales' | 'others'
export type TransportMode = 'road' | 'rail' | 'air' | 'ship'
export type VehicleType = 'regular' | 'over_dimensional'
export type DocType = 'tax_invoice' | 'bill_of_supply' | 'delivery_challan' | 'bill_of_entry' | 'credit_note' | 'others'

export interface TransporterInfo {
  id?: string
  name: string
  gstin?: string
}

export interface EWayBillPartB {
  vehicleNumber: string
  transportMode: TransportMode
  transportDocNo?: string
  transportDocDate?: string
  vehicleType: VehicleType
  transporter?: TransporterInfo
  updatedBy: string
  updatedDate: string
}

export interface EWayBill {
  id: string
  ewayBillNumber: string | null
  status: EWayBillStatus
  generationType: 'invoice' | 'challan' | 'manual'
  
  // References
  invoiceId: string | null
  challanId: string | null
  
  // Transaction
  transactionType: TransactionType
  subType: SubType
  docType: DocType
  docNumber: string
  docDate: string
  
  // Supplier
  fromGstin: string
  fromTradeName: string
  fromAddress: string
  fromPlace: string
  fromPincode: string
  fromStateCode: string
  
  // Recipient
  toGstin: string | null
  toTradeName: string
  toAddress: string
  toPlace: string
  toPincode: string
  toStateCode: string
  
  // Product
  hsnCode: string
  productName: string
  productDesc: string | null
  quantity: number
  unit: string
  cgstValue: number
  sgstValue: number
  igstValue: number
  cessValue: number
  cessNonAdvolValue: number
  otherValue: number
  totalValue: number
  taxableAmount: number
  
  // Transportation
  transportMode: TransportMode
  transportDocNo: string | null
  transportDocDate: string | null
  vehicleNumber: string | null
  vehicleType: VehicleType | null
  transporter: TransporterInfo | null
  distance: number
  
  // Validity
  generatedDate: string | null
  validUpto: string | null
  extendedTimes: number
  
  // Part-B
  partBUpdated: boolean
  partBData: EWayBillPartB | null
  
  // Cancellation
  cancelledDate: string | null
  cancelReason: string | null
  cancelRemarks: string | null
  
  createdAt: string
  updatedAt: string
}

export interface ConsolidatedEWayBill {
  id: string
  consEwayBillNo: string | null
  generatedDate: string | null
  validUpto: string | null
  status: 'draft' | 'active' | 'cancelled'
  vehicleNumber: string
  transporterGstin: string | null
  transporterName: string | null
  fromPlace: string
  fromState: string
  ewayBillIds: string[]
  ewayBills?: EWayBill[]
  createdAt: string
  updatedAt: string
}

export interface EWayBillFilter {
  status: EWayBillStatus | 'all'
  dateFrom: string | null
  dateTo: string | null
  search: string
  expiringIn: number | null // days
}

export interface EWayBillValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}
```

### 3. Backend API Routes

**File**: [`backend/src/routes/ewayBills.ts`](backend/src/routes/ewayBills.ts)

#### Endpoints

```
GET    /api/eway-bills              - List all E-way bills with filters
POST   /api/eway-bills              - Create new E-way bill (draft)
GET    /api/eway-bills/:id          - Get E-way bill details
PUT    /api/eway-bills/:id          - Update E-way bill
DELETE /api/eway-bills/:id          - Delete E-way bill (draft only)

POST   /api/eway-bills/:id/generate - Generate E-way bill number (submit to GST portal)
POST   /api/eway-bills/:id/cancel   - Cancel E-way bill
POST   /api/eway-bills/:id/extend   - Extend E-way bill validity
PUT    /api/eway-bills/:id/part-b   - Update Part-B (transporter details)

POST   /api/eway-bills/from-invoice/:invoiceId  - Create E-way bill from invoice
POST   /api/eway-bills/from-challan/:challanId  - Create E-way bill from challan
POST   /api/eway-bills/validate                 - Validate E-way bill data

GET    /api/eway-bills/expiring     - Get expiring E-way bills
GET    /api/eway-bills/stats        - Get E-way bill statistics

POST   /api/consolidated-eway-bills              - Create consolidated E-way bill
GET    /api/consolidated-eway-bills/:id          - Get consolidated E-way bill
POST   /api/consolidated-eway-bills/:id/generate - Generate consolidated E-way bill
```

### 4. Business Logic & Validation Rules

#### E-way Bill Generation Rules

1. **Mandatory Conditions**:
   - Required when goods value exceeds ₹50,000
   - Required for inter-state movement of goods
   - Required for intra-state movement (state-specific rules)

2. **Exemptions**:
   - Non-GST goods
   - Goods transported by non-motorized vehicles
   - Specific categories (live animals, fresh produce, etc.)

3. **Distance-based Validity**:
   - Up to 100 km: 1 day validity
   - For every additional 100 km: +1 day
   - Over-dimensional cargo: Different calculation

4. **Extension Rules**:
   - Can be extended before expiry
   - Maximum extensions: 4 times (total 5 validity periods)
   - Each extension adds validity based on remaining distance

5. **Cancellation Rules**:
   - Can be cancelled within 24 hours of generation
   - Valid reason required
   - Cannot be cancelled after goods movement started

#### Validation Logic

```typescript
// Distance-based validity calculation
function calculateValidity(distance: number, vehicleType: VehicleType): number {
  if (vehicleType === 'over_dimensional') {
    return Math.ceil(distance / 20) // 1 day per 20 km
  }
  return Math.ceil(distance / 100) // 1 day per 100 km
}

// Check if E-way bill is required
function isEWayBillRequired(
  totalValue: number,
  supplyType: 'intra' | 'inter',
  stateRules: StateRules
): boolean {
  if (totalValue <= 50000) return false
  if (supplyType === 'inter') return true
  return stateRules.requiresIntraStateEWayBill
}

// Validate E-way bill data
function validateEWayBill(data: EWayBill): EWayBillValidation {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Mandatory field checks
  if (!data.fromGstin) errors.push('Supplier GSTIN is required')
  if (!data.toPlace) errors.push('Destination place is required')
  if (!data.hsnCode) errors.push('HSN code is required')
  if (data.distance <= 0) errors.push('Distance must be greater than 0')
  
  // Business rule checks
  if (data.totalValue <= 50000) {
    warnings.push('E-way bill may not be required for value ≤ ₹50,000')
  }
  
  // GSTIN validation
  if (data.fromGstin && !isValidGSTIN(data.fromGstin)) {
    errors.push('Invalid supplier GSTIN format')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}
```

### 5. Frontend Components

#### Component Structure

```
frontend/components/ewayBills/
├── EWayBillListClient.tsx          - List view with filters
├── EWayBillFormClient.tsx          - Create/Edit form
├── EWayBillDetailClient.tsx        - Detail view
├── EWayBillFromInvoiceModal.tsx    - Generate from invoice
├── EWayBillPartBModal.tsx          - Update Part-B
├── EWayBillCancelModal.tsx         - Cancel E-way bill
├── EWayBillExtendModal.tsx         - Extend validity
├── ConsolidatedEWayBillForm.tsx    - Consolidated E-way bill
└── EWayBillExpiryCard.tsx          - Dashboard widget
```

#### Key Features per Component

**EWayBillListClient.tsx**:
- Filterable table (status, date range, expiry)
- Search by E-way bill number, doc number
- Status badges (Active, Expired, Cancelled)
- Quick actions (View, Cancel, Extend, Update Part-B)
- Export to Excel/PDF
- Bulk operations

**EWayBillFormClient.tsx**:
- Multi-step form (Transaction → Parties → Products → Transport)
- Auto-populate from invoice/challan
- Real-time validation
- Distance calculator integration
- Validity calculation display
- Save as draft functionality
- Generate E-way bill number

**EWayBillDetailClient.tsx**:
- Complete E-way bill information
- QR code display
- Timeline (Created → Generated → Extended → Cancelled)
- Part-B update option
- Print/Download PDF
- Cancel/Extend actions
- Audit trail

### 6. Integration Points

#### With Invoices
```typescript
// Add E-way bill fields to Invoice type
interface Invoice {
  // ... existing fields
  ewayBillId: string | null
  ewayBillNumber: string | null
  ewayBillStatus: EWayBillStatus | null
  requiresEWayBill: boolean
}

// Auto-generate E-way bill option in invoice form
// Link E-way bill from invoice detail page
```

#### With Delivery Challans
```typescript
// Already has ewayBillNumber field in DeliveryChallan
// Add ewayBillId for proper linking
interface DeliveryChallan {
  // ... existing fields
  ewayBillId: string | null
  ewayBillNumber: string | null // Keep for display
}
```

### 7. Notifications & Alerts

#### Notification Types

1. **Expiry Alerts**:
   - 24 hours before expiry
   - 6 hours before expiry
   - On expiry

2. **Status Updates**:
   - E-way bill generated successfully
   - E-way bill cancelled
   - E-way bill extended

3. **Validation Warnings**:
   - Missing mandatory fields
   - Invalid data detected

#### Implementation

```typescript
// Notification service
interface EWayBillNotification {
  type: 'expiry_warning' | 'expired' | 'generated' | 'cancelled' | 'extended'
  ewayBillId: string
  ewayBillNumber: string
  message: string
  actionUrl: string
}

// Background job to check expiring E-way bills
async function checkExpiringEWayBills() {
  const tomorrow = addDays(new Date(), 1)
  const expiring = await getEWayBillsExpiringBefore(tomorrow)
  
  for (const ewb of expiring) {
    await createNotification({
      userId: ewb.userId,
      type: 'eway_bill_expiry',
      data: {
        ewayBillId: ewb.id,
        ewayBillNumber: ewb.ewayBillNumber,
        validUpto: ewb.validUpto
      }
    })
  }
}
```

### 8. Reports & Analytics

#### Report Types

1. **E-way Bill Register**:
   - All E-way bills with filters
   - Grouped by status, month, transporter
   - Export to Excel

2. **Expiry Report**:
   - Upcoming expiries
   - Expired E-way bills
   - Extension history

3. **Compliance Report**:
   - E-way bills vs Invoices
   - Missing E-way bills for eligible invoices
   - Cancellation statistics

4. **Transporter Report**:
   - E-way bills by transporter
   - Vehicle-wise summary
   - Distance analysis

### 9. Mobile App Support

#### Mobile Components

```
mobile/src/components/ewayBills/
├── EWayBillList.tsx
├── EWayBillCard.tsx
├── EWayBillDetail.tsx
├── QuickEWayBillForm.tsx
└── EWayBillScanner.tsx  // Scan QR code
```

#### Mobile-Specific Features

1. **Quick Generation**: Simplified form for on-the-go
2. **QR Code Scanner**: Scan E-way bill QR codes
3. **Offline Support**: Save drafts offline
4. **Push Notifications**: Expiry alerts
5. **Vehicle Number Input**: Camera-based OCR

### 10. PDF Generation

#### E-way Bill PDF Format

```typescript
interface EWayBillPDF {
  header: {
    ewayBillNumber: string
    generatedDate: string
    validUpto: string
    qrCode: string // Base64 QR code image
  }
  
  partA: {
    transaction: TransactionDetails
    supplier: PartyDetails
    recipient: PartyDetails
    product: ProductDetails
  }
  
  partB: {
    transporter: TransporterDetails
    vehicle: VehicleDetails
  }
  
  footer: {
    generatedBy: string
    disclaimer: string
  }
}
```

## Implementation Phases

### Phase 1: Foundation (Backend & Types)
- Database schema migration
- TypeScript type definitions
- Backend API routes
- Validation logic

### Phase 2: Core UI (Frontend)
- E-way bill list view
- E-way bill form
- E-way bill detail view
- Basic CRUD operations

### Phase 3: Integration
- Invoice integration
- Challan integration
- Auto-population logic
- Validation integration

### Phase 4: Advanced Features
- Part-B updates
- Cancellation workflow
- Extension workflow
- Consolidated E-way bills

### Phase 5: Notifications & Reports
- Expiry tracking
- Notification system
- Reports and analytics
- Dashboard widgets

### Phase 6: Mobile & Polish
- Mobile app components
- PDF generation
- QR code support
- Performance optimization

## Technical Considerations

### 1. GST Portal Integration (Future)
While this plan focuses on the application-side implementation, future integration with the GST E-way Bill portal would require:
- API authentication (username, password, OTP)
- E-way bill generation API
- E-way bill cancellation API
- E-way bill status check API
- Rate limiting and error handling

### 2. Data Security
- Encrypt sensitive transporter data
- Audit trail for all operations
- Role-based access control
- Secure PDF generation

### 3. Performance
- Index frequently queried fields
- Pagination for large lists
- Lazy loading for detail views
- Cache validity calculations

### 4. Compliance
- Follow GST E-way bill rules strictly
- Regular updates for rule changes
- State-specific rule handling
- Proper error messages for validation

## Testing Strategy

### Unit Tests
- Validation functions
- Validity calculation
- GSTIN validation
- Distance calculation

### Integration Tests
- API endpoints
- Database operations
- Invoice integration
- Notification triggers

### E2E Tests
- Complete E-way bill generation flow
- Cancellation workflow
- Extension workflow
- Report generation

## Documentation Requirements

1. **User Guide**: How to generate and manage E-way bills
2. **API Documentation**: Backend API reference
3. **Compliance Guide**: GST E-way bill rules and regulations
4. **Developer Guide**: Component usage and customization

## Success Metrics

1. **Adoption**: % of eligible invoices with E-way bills
2. **Compliance**: Zero expired E-way bills during transit
3. **Efficiency**: Time to generate E-way bill < 2 minutes
4. **Accuracy**: Validation error rate < 5%
5. **User Satisfaction**: Positive feedback on ease of use

## Conclusion

This comprehensive E-way Bill feature will significantly enhance the Invozen GST application's compliance capabilities. The phased approach ensures steady progress while maintaining code quality and user experience.
