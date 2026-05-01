import type { Invoice, LineItem, InvoiceStatus } from '../../types/invoice'
import { calculateLineItem } from '../gst/calculator'
import { formatAmountInWords } from '../gst/formatter'

function makeLineItem(
  id: string, itemId: string, description: string, hsnSac: string,
  quantity: number, unit: string, rate: number, discountPercent: number,
  gstRate: number, supplyType: 'intra' | 'inter'
): LineItem {
  const calc = calculateLineItem(quantity, rate, discountPercent, gstRate, supplyType)
  return {
    id, itemId, description, hsnSac, quantity, unit, rate, discountPercent,
    gstRate, ...calc
  }
}

function makeInvoice(
  id: string, num: string, status: InvoiceStatus,
  custId: string, custName: string, custGstin: string | null, custState: string, custStateCode: string,
  supplyType: 'intra' | 'inter', invoiceDate: string, dueDays: number,
  items: LineItem[], notes: string = ''
): Invoice {
  const dueDate = new Date(invoiceDate)
  dueDate.setDate(dueDate.getDate() + dueDays)

  const subtotal = items.reduce((s, i) => s + i.quantity * i.rate, 0)
  const discountAmount = items.reduce((s, i) => s + (i.quantity * i.rate * i.discountPercent / 100), 0)
  const taxableValue = Math.round(items.reduce((s, i) => s + i.taxableValue, 0) * 100) / 100
  const cgstTotal = Math.round(items.reduce((s, i) => s + i.cgst, 0) * 100) / 100
  const sgstTotal = Math.round(items.reduce((s, i) => s + i.sgst, 0) * 100) / 100
  const igstTotal = Math.round(items.reduce((s, i) => s + i.igst, 0) * 100) / 100
  const totalTax = Math.round((cgstTotal + sgstTotal + igstTotal) * 100) / 100
  const grandTotal = Math.round(taxableValue + totalTax)

  const amountPaid = status === 'paid' ? grandTotal : status === 'overdue' && Math.random() > 0.7 ? Math.round(grandTotal * 0.5) : 0
  const balanceDue = grandTotal - amountPaid

  return {
    id, invoiceNumber: num, invoiceType: 'tax_invoice', status,
    customerId: custId,
    customerSnapshot: { name: custName, gstin: custGstin, address: '123 Business St', state: custState, stateCode: custStateCode },
    supplyType, invoiceDate, dueDate: dueDate.toISOString().split('T')[0],
    lineItems: items,
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxableValue, cgstTotal, sgstTotal, igstTotal, totalTax, grandTotal,
    amountPaid, balanceDue,
    notes, terms: 'Payment due within 30 days.',
    placeOfSupply: custState,
    irnNumber: status === 'paid' ? `IRN${id.slice(-8).toUpperCase()}` : null,
    irnStatus: status === 'paid' ? 'generated' : null,
    createdAt: `${invoiceDate}T10:00:00Z`,
    updatedAt: `${invoiceDate}T10:00:00Z`,
  }
}

export const mockInvoices: Invoice[] = [
  // PAID invoices - intra state (Maharashtra)
  makeInvoice('inv-001', 'PE-2025-001', 'paid', 'cust-01', 'Ravi Sharma', '27AABCS1234A1Z5', 'Maharashtra', '27', 'intra', '2024-11-05', 30,
    [makeLineItem('li-001a', 'item-01', 'Laptop - Core i5', '8471', 2, 'NOS', 55000, 0, 18, 'intra'),
     makeLineItem('li-001b', 'item-03', 'Printer - Laser', '8443', 1, 'NOS', 12000, 5, 18, 'intra')]),

  makeInvoice('inv-002', 'PE-2025-002', 'paid', 'cust-04', 'Sunita Patel', '24AABCP3456D1Z8', 'Gujarat', '24', 'inter', '2024-11-08', 30,
    [makeLineItem('li-002a', 'item-07', 'Pharmaceutical Tablet', '3004', 100, 'PKT', 120, 0, 12, 'inter'),
     makeLineItem('li-002b', 'item-07', 'Pharmaceutical Tablet 250mg', '3004', 50, 'PKT', 95, 0, 12, 'inter')]),

  makeInvoice('inv-003', 'PE-2025-003', 'paid', 'cust-06', 'Deepa Iyer', '33AABCI2345F1Z4', 'Tamil Nadu', '33', 'inter', '2024-11-12', 15,
    [makeLineItem('li-003a', 'item-19', 'CA / Accounting Services', '998221', 1, 'NOS', 15000, 0, 18, 'inter'),
     makeLineItem('li-003b', 'item-20', 'GST Filing Service', '998221', 3, 'NOS', 2500, 0, 18, 'inter')]),

  makeInvoice('inv-004', 'PE-2025-004', 'paid', 'cust-08', 'Ananya Das', '19AABCD8901H1Z9', 'West Bengal', '19', 'inter', '2024-11-15', 30,
    [makeLineItem('li-004a', 'item-17', 'Software Development', '998313', 40, 'HRS', 2500, 0, 18, 'inter')]),

  makeInvoice('inv-005', 'PE-2025-005', 'paid', 'cust-10', 'Kavitha Reddy', '36AABCR3456J1Z5', 'Telangana', '36', 'inter', '2024-11-20', 30,
    [makeLineItem('li-005a', 'item-11', 'Rice (Basmati)', '1006', 50, 'BAG', 2200, 0, 0, 'inter'),
     makeLineItem('li-005b', 'item-14', 'Cooking Oil 1L', '1512', 200, 'LTR', 180, 0, 5, 'inter')]),

  makeInvoice('inv-006', 'PE-2025-006', 'paid', 'cust-09', 'Mohammed Iqbal', '27AABCI0123I1Z7', 'Maharashtra', '27', 'intra', '2024-11-22', 30,
    [makeLineItem('li-006a', 'item-04', "Men's Shirt", '6205', 20, 'NOS', 1200, 10, 5, 'intra'),
     makeLineItem('li-006b', 'item-05', "Women's Kurti", '6204', 15, 'NOS', 850, 0, 5, 'intra')]),

  makeInvoice('inv-007', 'PE-2025-007', 'paid', 'cust-02', 'Priya Nair', '32AACPN5678B1Z3', 'Kerala', '32', 'inter', '2024-12-01', 30,
    [makeLineItem('li-007a', 'item-05', "Women's Kurti", '6204', 50, 'NOS', 850, 5, 5, 'inter'),
     makeLineItem('li-007b', 'item-04', "Men's Shirt", '6205', 30, 'NOS', 1200, 5, 5, 'inter')]),

  makeInvoice('inv-008', 'PE-2025-008', 'paid', 'cust-05', 'Rajesh Menon', '29AABCM7890E1Z6', 'Karnataka', '29', 'inter', '2024-12-05', 60,
    [makeLineItem('li-008a', 'item-12', 'Auto Parts - Brake Pad', '8708', 10, 'SET', 1800, 0, 28, 'inter'),
     makeLineItem('li-008b', 'item-08', 'Steel Pipes', '7306', 100, 'MTR', 450, 0, 18, 'inter')]),

  makeInvoice('inv-009', 'PE-2025-009', 'paid', 'cust-11', 'Rahul Verma', null, 'Maharashtra', '27', 'intra', '2024-12-08', 0,
    [makeLineItem('li-009a', 'item-06', 'Mobile Phone', '8517', 1, 'NOS', 18000, 0, 12, 'intra')]),

  makeInvoice('inv-010', 'PE-2025-010', 'paid', 'cust-03', 'Amit Kumar', '07AADCK9012C1Z1', 'Delhi', '07', 'inter', '2024-12-10', 30,
    [makeLineItem('li-010a', 'item-16', 'IT Consulting', '998314', 20, 'HRS', 3500, 0, 18, 'inter'),
     makeLineItem('li-010b', 'item-30', 'Annual Maintenance Contract', '998711', 1, 'NOS', 20000, 0, 18, 'inter')]),

  makeInvoice('inv-011', 'PE-2025-011', 'paid', 'cust-07', 'Vikram Singh', '08AABCS4567G1Z2', 'Rajasthan', '08', 'inter', '2024-12-15', 45,
    [makeLineItem('li-011a', 'item-09', 'Cement Bags', '2523', 100, 'BAG', 420, 0, 28, 'inter'),
     makeLineItem('li-011b', 'item-08', 'Steel Pipes', '7306', 50, 'MTR', 450, 0, 18, 'inter')]),

  makeInvoice('inv-012', 'PE-2025-012', 'paid', 'cust-12', 'Sneha Joshi', null, 'Maharashtra', '27', 'intra', '2024-12-18', 0,
    [makeLineItem('li-012a', 'item-10', 'LED Bulb 9W', '8539', 20, 'NOS', 180, 0, 12, 'intra'),
     makeLineItem('li-012b', 'item-10', 'LED Bulb 12W', '8539', 10, 'NOS', 250, 0, 12, 'intra')]),

  makeInvoice('inv-013', 'PE-2025-013', 'paid', 'cust-14', 'Meena Krishnan', null, 'Tamil Nadu', '33', 'inter', '2024-12-20', 0,
    [makeLineItem('li-013a', 'item-21', 'Digital Marketing', '998361', 1, 'NOS', 18000, 0, 18, 'inter')]),

  makeInvoice('inv-014', 'PE-2025-014', 'paid', 'cust-01', 'Ravi Sharma', '27AABCS1234A1Z5', 'Maharashtra', '27', 'intra', '2025-01-03', 30,
    [makeLineItem('li-014a', 'item-02', 'Desktop Computer', '8471', 3, 'NOS', 45000, 5, 18, 'intra')]),

  makeInvoice('inv-015', 'PE-2025-015', 'paid', 'cust-05', 'Rajesh Menon', '29AABCM7890E1Z6', 'Karnataka', '29', 'inter', '2025-01-07', 60,
    [makeLineItem('li-015a', 'item-13', 'Air Conditioner 1.5T', '8415', 3, 'NOS', 38000, 0, 28, 'inter')]),

  // SENT invoices
  makeInvoice('inv-016', 'PE-2025-016', 'sent', 'cust-03', 'Amit Kumar', '07AADCK9012C1Z1', 'Delhi', '07', 'inter', '2025-01-10', 30,
    [makeLineItem('li-016a', 'item-16', 'IT Consulting', '998314', 15, 'HRS', 3500, 0, 18, 'inter'),
     makeLineItem('li-016b', 'item-17', 'Software Development', '998313', 10, 'HRS', 2500, 0, 18, 'inter')]),

  makeInvoice('inv-017', 'PE-2025-017', 'sent', 'cust-07', 'Vikram Singh', '08AABCS4567G1Z2', 'Rajasthan', '08', 'inter', '2025-01-12', 45,
    [makeLineItem('li-017a', 'item-09', 'Cement Bags', '2523', 200, 'BAG', 420, 0, 28, 'inter')]),

  makeInvoice('inv-018', 'PE-2025-018', 'sent', 'cust-04', 'Sunita Patel', '24AABCP3456D1Z8', 'Gujarat', '24', 'inter', '2025-01-14', 30,
    [makeLineItem('li-018a', 'item-07', 'Pharmaceutical Tablet', '3004', 200, 'PKT', 120, 0, 12, 'inter'),
     makeLineItem('li-018b', 'item-14', 'Cooking Oil 1L', '1512', 100, 'LTR', 180, 5, 5, 'inter')]),

  makeInvoice('inv-019', 'PE-2025-019', 'sent', 'cust-09', 'Mohammed Iqbal', '27AABCI0123I1Z7', 'Maharashtra', '27', 'intra', '2025-01-18', 30,
    [makeLineItem('li-019a', 'item-04', "Men's Shirt", '6205', 30, 'NOS', 1200, 0, 5, 'intra'),
     makeLineItem('li-019b', 'item-05', "Women's Kurti", '6204', 25, 'NOS', 850, 0, 5, 'intra')]),

  makeInvoice('inv-020', 'PE-2025-020', 'sent', 'cust-15', 'Rohan Gupta', null, 'Delhi', '07', 'inter', '2025-01-20', 0,
    [makeLineItem('li-020a', 'item-18', 'Web Design', '998313', 1, 'NOS', 25000, 0, 18, 'inter')]),

  makeInvoice('inv-021', 'PE-2025-021', 'sent', 'cust-05', 'Rajesh Menon', '29AABCM7890E1Z6', 'Karnataka', '29', 'inter', '2025-01-22', 60,
    [makeLineItem('li-021a', 'item-23', 'Security Services', '998525', 1, 'NOS', 22000, 0, 18, 'inter')]),

  makeInvoice('inv-022', 'PE-2025-022', 'sent', 'cust-02', 'Priya Nair', '32AACPN5678B1Z3', 'Kerala', '32', 'inter', '2025-01-25', 30,
    [makeLineItem('li-022a', 'item-05', "Women's Kurti", '6204', 100, 'NOS', 850, 10, 5, 'inter')]),

  makeInvoice('inv-023', 'PE-2025-023', 'sent', 'cust-08', 'Ananya Das', '19AABCD8901H1Z9', 'West Bengal', '19', 'inter', '2025-02-01', 30,
    [makeLineItem('li-023a', 'item-25', 'Training & Development', '999293', 2, 'DAYS', 12000, 0, 18, 'inter')]),

  makeInvoice('inv-024', 'PE-2025-024', 'sent', 'cust-16', 'Pooja Desai', null, 'Gujarat', '24', 'inter', '2025-02-03', 0,
    [makeLineItem('li-024a', 'item-10', 'LED Bulb 9W', '8539', 50, 'NOS', 180, 5, 12, 'inter')]),

  makeInvoice('inv-025', 'PE-2025-025', 'sent', 'cust-06', 'Deepa Iyer', '33AABCI2345F1Z4', 'Tamil Nadu', '33', 'inter', '2025-02-05', 15,
    [makeLineItem('li-025a', 'item-19', 'CA / Accounting Services', '998221', 1, 'NOS', 15000, 0, 18, 'inter'),
     makeLineItem('li-025b', 'item-26', 'Legal Services', '998211', 3, 'HRS', 5000, 0, 18, 'inter')]),

  // OVERDUE invoices
  makeInvoice('inv-026', 'PE-2025-026', 'overdue', 'cust-03', 'Amit Kumar', '07AADCK9012C1Z1', 'Delhi', '07', 'inter', '2024-11-01', 30,
    [makeLineItem('li-026a', 'item-01', 'Laptop - Core i5', '8471', 1, 'NOS', 55000, 0, 18, 'inter')]),

  makeInvoice('inv-027', 'PE-2025-027', 'overdue', 'cust-07', 'Vikram Singh', '08AABCS4567G1Z2', 'Rajasthan', '08', 'inter', '2024-11-15', 45,
    [makeLineItem('li-027a', 'item-09', 'Cement Bags', '2523', 150, 'BAG', 420, 0, 28, 'inter'),
     makeLineItem('li-027b', 'item-08', 'Steel Pipes', '7306', 80, 'MTR', 450, 0, 18, 'inter')]),

  makeInvoice('inv-028', 'PE-2025-028', 'overdue', 'cust-13', 'Arjun Pillai', null, 'Karnataka', '29', 'inter', '2024-12-05', 30,
    [makeLineItem('li-028a', 'item-17', 'Software Development', '998313', 20, 'HRS', 2500, 0, 18, 'inter')]),

  makeInvoice('inv-029', 'PE-2025-029', 'overdue', 'cust-17', 'Kiran Shah', null, 'Rajasthan', '08', 'inter', '2024-12-10', 30,
    [makeLineItem('li-029a', 'item-06', 'Mobile Phone', '8517', 2, 'NOS', 18000, 0, 12, 'inter')]),

  makeInvoice('inv-030', 'PE-2025-030', 'overdue', 'cust-09', 'Mohammed Iqbal', '27AABCI0123I1Z7', 'Maharashtra', '27', 'intra', '2024-12-20', 30,
    [makeLineItem('li-030a', 'item-21', 'Digital Marketing', '998361', 1, 'NOS', 18000, 0, 18, 'intra')]),

  makeInvoice('inv-031', 'PE-2025-031', 'overdue', 'cust-15', 'Rohan Gupta', null, 'Delhi', '07', 'inter', '2025-01-05', 30,
    [makeLineItem('li-031a', 'item-22', 'Freight Charges', '996511', 3, 'NOS', 5000, 0, 5, 'inter'),
     makeLineItem('li-031b', 'item-24', 'Cleaning Services', '998533', 1, 'NOS', 8000, 0, 18, 'inter')]),

  makeInvoice('inv-032', 'PE-2025-032', 'overdue', 'cust-05', 'Rajesh Menon', '29AABCM7890E1Z6', 'Karnataka', '29', 'inter', '2024-12-28', 60,
    [makeLineItem('li-032a', 'item-12', 'Auto Parts - Brake Pad', '8708', 20, 'SET', 1800, 0, 28, 'inter')]),

  makeInvoice('inv-033', 'PE-2025-033', 'overdue', 'cust-18', 'Nisha Kulkarni', null, 'Maharashtra', '27', 'intra', '2025-01-02', 15,
    [makeLineItem('li-033a', 'item-04', "Men's Shirt", '6205', 10, 'NOS', 1200, 0, 5, 'intra')]),

  // DRAFT invoices
  makeInvoice('inv-034', 'PE-2025-034', 'draft', 'cust-01', 'Ravi Sharma', '27AABCS1234A1Z5', 'Maharashtra', '27', 'intra', '2025-02-10', 30,
    [makeLineItem('li-034a', 'item-01', 'Laptop - Core i5', '8471', 5, 'NOS', 55000, 5, 18, 'intra')]),

  makeInvoice('inv-035', 'PE-2025-035', 'draft', 'cust-05', 'Rajesh Menon', '29AABCM7890E1Z6', 'Karnataka', '29', 'inter', '2025-02-10', 60,
    [makeLineItem('li-035a', 'item-13', 'Air Conditioner 1.5T', '8415', 5, 'NOS', 38000, 0, 28, 'inter'),
     makeLineItem('li-035b', 'item-10', 'LED Bulb 9W', '8539', 100, 'NOS', 180, 0, 12, 'inter')]),

  makeInvoice('inv-036', 'PE-2025-036', 'draft', 'cust-03', 'Amit Kumar', '07AADCK9012C1Z1', 'Delhi', '07', 'inter', '2025-02-11', 30,
    [makeLineItem('li-036a', 'item-16', 'IT Consulting', '998314', 30, 'HRS', 3500, 0, 18, 'inter')]),

  makeInvoice('inv-037', 'PE-2025-037', 'draft', 'cust-06', 'Deepa Iyer', '33AABCI2345F1Z4', 'Tamil Nadu', '33', 'inter', '2025-02-12', 15,
    [makeLineItem('li-037a', 'item-28', 'Architecture Consultancy', '998314', 1, 'NOS', 75000, 0, 18, 'inter')]),

  makeInvoice('inv-038', 'PE-2025-038', 'draft', 'cust-10', 'Kavitha Reddy', '36AABCR3456J1Z5', 'Telangana', '36', 'inter', '2025-02-12', 30,
    [makeLineItem('li-038a', 'item-11', 'Rice (Basmati)', '1006', 100, 'BAG', 2200, 0, 0, 'inter'),
     makeLineItem('li-038b', 'item-15', 'Fertilizer NPK', '3105', 500, 'KGS', 28, 0, 5, 'inter')]),

  makeInvoice('inv-039', 'PE-2025-039', 'draft', 'cust-04', 'Sunita Patel', '24AABCP3456D1Z8', 'Gujarat', '24', 'inter', '2025-02-13', 30,
    [makeLineItem('li-039a', 'item-07', 'Pharmaceutical Tablet', '3004', 500, 'PKT', 120, 5, 12, 'inter')]),

  makeInvoice('inv-040', 'PE-2025-040', 'draft', 'cust-08', 'Ananya Das', '19AABCD8901H1Z9', 'West Bengal', '19', 'inter', '2025-02-13', 30,
    [makeLineItem('li-040a', 'item-29', 'Event Management', '998554', 1, 'NOS', 50000, 0, 18, 'inter')]),

  makeInvoice('inv-041', 'PE-2025-041', 'draft', 'cust-09', 'Mohammed Iqbal', '27AABCI0123I1Z7', 'Maharashtra', '27', 'intra', '2025-02-14', 30,
    [makeLineItem('li-041a', 'item-04', "Men's Shirt", '6205', 50, 'NOS', 1200, 10, 5, 'intra'),
     makeLineItem('li-041b', 'item-05', "Women's Kurti", '6204', 40, 'NOS', 850, 10, 5, 'intra')]),

  makeInvoice('inv-042', 'PE-2025-042', 'draft', 'cust-02', 'Priya Nair', '32AACPN5678B1Z3', 'Kerala', '32', 'inter', '2025-02-14', 30,
    [makeLineItem('li-042a', 'item-05', "Women's Kurti", '6204', 200, 'NOS', 850, 15, 5, 'inter')]),

  makeInvoice('inv-043', 'PE-2025-043', 'draft', 'cust-07', 'Vikram Singh', '08AABCS4567G1Z2', 'Rajasthan', '08', 'inter', '2025-02-14', 45,
    [makeLineItem('li-043a', 'item-09', 'Cement Bags', '2523', 300, 'BAG', 420, 0, 28, 'inter'),
     makeLineItem('li-043b', 'item-08', 'Steel Pipes', '7306', 150, 'MTR', 450, 0, 18, 'inter')]),

  makeInvoice('inv-044', 'PE-2025-044', 'draft', 'cust-13', 'Arjun Pillai', null, 'Karnataka', '29', 'inter', '2025-02-15', 0,
    [makeLineItem('li-044a', 'item-27', 'Photography Services', '998392', 1, 'DAYS', 15000, 0, 18, 'inter')]),

  makeInvoice('inv-045', 'PE-2025-045', 'draft', 'cust-16', 'Pooja Desai', null, 'Gujarat', '24', 'inter', '2025-02-15', 0,
    [makeLineItem('li-045a', 'item-06', 'Mobile Phone', '8517', 3, 'NOS', 18000, 5, 12, 'inter')]),

  // VOID invoices
  makeInvoice('inv-046', 'PE-2025-046', 'void', 'cust-01', 'Ravi Sharma', '27AABCS1234A1Z5', 'Maharashtra', '27', 'intra', '2024-10-05', 30,
    [makeLineItem('li-046a', 'item-02', 'Desktop Computer', '8471', 2, 'NOS', 45000, 0, 18, 'intra')]),

  makeInvoice('inv-047', 'PE-2025-047', 'void', 'cust-03', 'Amit Kumar', '07AADCK9012C1Z1', 'Delhi', '07', 'inter', '2024-10-12', 30,
    [makeLineItem('li-047a', 'item-16', 'IT Consulting', '998314', 10, 'HRS', 3500, 0, 18, 'inter')]),

  makeInvoice('inv-048', 'PE-2025-048', 'void', 'cust-11', 'Rahul Verma', null, 'Maharashtra', '27', 'intra', '2024-10-20', 0,
    [makeLineItem('li-048a', 'item-06', 'Mobile Phone', '8517', 1, 'NOS', 18000, 0, 12, 'intra')]),

  makeInvoice('inv-049', 'PE-2025-049', 'void', 'cust-05', 'Rajesh Menon', '29AABCM7890E1Z6', 'Karnataka', '29', 'inter', '2024-10-25', 60,
    [makeLineItem('li-049a', 'item-12', 'Auto Parts - Brake Pad', '8708', 5, 'SET', 1800, 0, 28, 'inter')]),

  makeInvoice('inv-050', 'PE-2025-050', 'void', 'cust-07', 'Vikram Singh', '08AABCS4567G1Z2', 'Rajasthan', '08', 'inter', '2024-11-02', 45,
    [makeLineItem('li-050a', 'item-09', 'Cement Bags', '2523', 50, 'BAG', 420, 0, 28, 'inter')]),
]
