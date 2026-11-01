export const SUPER_ADMIN_EMAIL = 'mode.bproduction@gmail.com';

export type BusinessRole = 'owner' | 'admin' | 'accountant' | 'viewer';

export interface BusinessMember {
  id: string; // `${businessId}_${userId}`
  businessId: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: BusinessRole;
  status: 'active' | 'invited';
  createdAt: string;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  bvnOrNinNote?: string;
}

export type SubscriptionPlanId = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trialing' | 'cancelled' | 'past_due';
export type BillingInterval = 'monthly' | '6months' | 'annual';

export interface BusinessSubscription {
  planId: SubscriptionPlanId;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  trialStartDate?: string;
  trialEndDate?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancellationReason?: string;
  autoRenew: boolean;
  paymentMethod?: 'paystack' | 'bank_transfer' | 'card';
  assignedBySuperAdmin?: boolean;
  customInvoiceLimit?: number;
  customCustomerLimit?: number;
  notes?: string;
}

export interface Business {
  id: string;
  name: string;
  rcNumber?: string; // CAC Registration number
  taxIdentificationNumber?: string; // FIRS TIN
  email: string;
  phone: string;
  address: string;
  state: string;
  currency: 'NGN' | 'USD' | 'EUR' | 'GBP';
  ownerId: string;
  defaultVatPercent: number; // e.g. 7.5
  defaultWhtPercent: number; // e.g. 5
  bankDetails: BankDetails;
  invoicePrefix: string; // e.g. "INV"
  quotationPrefix: string; // e.g. "QT"
  receiptPrefix: string; // e.g. "REC"
  expensePrefix: string; // e.g. "EXP"
  paymentTermsDefault: string; // "Due on Receipt"
  subscription?: BusinessSubscription;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  businessName?: string;
  phone: string;
  email: string;
  address: string;
  state: string;
  outstandingBalanceMinor: number; // in Kobo (integer)
  totalInvoicedMinor: number;
  totalPaidMinor: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductService {
  id: string;
  businessId: string;
  name: string;
  description: string;
  priceMinor: number; // in Kobo (integer)
  currency: string;
  type: 'product' | 'service';
  unit: string; // e.g., 'pcs', 'kg', 'hours', 'month', 'bags', 'service'
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPriceMinor: number; // Kobo
  discountPercent: number; // 0 - 100
  taxPercent: number; // 7.5 for standard VAT
  lineTotalMinor: number; // (qty * unitPrice - discount + tax) in Kobo
}

export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  businessId: string;
  invoiceNumber: string; // e.g. INV-2026-0001
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  paymentTerms: string;
  items: InvoiceItem[];
  subtotalMinor: number; // sum(qty * price)
  discountMinor: number; // total discount
  taxVatMinor: number; // 7.5% VAT in Kobo
  taxWhtMinor: number; // WHT deduction in Kobo
  totalMinor: number; // subtotal - discount + vat
  amountPaidMinor: number; // total allocated payments
  balanceDueMinor: number; // totalMinor - amountPaidMinor
  status: InvoiceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';

export interface Quotation {
  id: string;
  businessId: string;
  quotationNumber: string; // e.g. QT-2026-0001
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  issueDate: string;
  validityDate: string;
  items: InvoiceItem[];
  subtotalMinor: number;
  discountMinor: number;
  taxVatMinor: number;
  totalMinor: number;
  status: QuotationStatus;
  convertedInvoiceId?: string;
  convertedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'bank_transfer' | 'pos' | 'cash' | 'ussd' | 'online';

export interface PaymentAllocation {
  invoiceId: string;
  invoiceNumber: string;
  amountMinor: number;
}

export interface Payment {
  id: string;
  businessId: string;
  paymentNumber: string; // PAY-2026-0001
  customerId: string;
  customerName: string;
  invoiceId: string;
  invoiceNumber: string;
  amountMinor: number; // in Kobo
  paymentDate: string;
  paymentMethod: PaymentMethod;
  reference: string; // Bank NIP session ID, POS slip RRN, USSD ref
  notes?: string;
  receiptIssued: boolean;
  receiptId?: string;
  allocations: PaymentAllocation[];
  createdAt: string;
}

export interface Receipt {
  id: string;
  businessId: string;
  receiptNumber: string; // REC-2026-0001
  paymentId: string;
  paymentReference: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amountMinor: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  issuedAt: string;
  notes?: string;
}

export type ExpenseCategoryKey =
  | 'rent_office'
  | 'utilities_diesel'
  | 'salaries_wages'
  | 'logistics_fuel'
  | 'inventory_supplies'
  | 'marketing_ads'
  | 'maintenance'
  | 'bank_charges_taxes'
  | 'professional_fees'
  | 'miscellaneous';

export interface Expense {
  id: string;
  businessId: string;
  expenseNumber: string; // EXP-2026-0001
  category: ExpenseCategoryKey;
  categoryName: string;
  amountMinor: number;
  expenseDate: string;
  description: string;
  vendor: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  receiptNote?: string;
  supportingDocName?: string;
  supportingDocDataUrl?: string; // Data URL for receipt preview
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  businessId: string;
  entityType: 'business' | 'customer' | 'product' | 'invoice' | 'quotation' | 'payment' | 'receipt' | 'expense' | 'security_test';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'status_change' | 'allocate' | 'convert' | 'verify';
  description: string;
  userId: string;
  userName: string;
  previousState?: string;
  newState?: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
}
