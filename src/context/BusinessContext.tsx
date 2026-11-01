import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';
import { 
  Business, 
  BusinessMember, 
  Customer, 
  ProductService, 
  Invoice, 
  Quotation, 
  Payment, 
  Receipt, 
  Expense, 
  AuditLog,
  InvoiceItem,
  BusinessSubscription,
  SubscriptionPlanId,
  SubscriptionStatus,
  BillingInterval,
  SUPER_ADMIN_EMAIL
} from '../types';
import { 
  addMinor, 
  subtractMinor, 
  calculateLineTotalMinor, 
  calculateDiscountAmountMinor, 
  calculateVatAmountMinor, 
  calculateWhtAmountMinor 
} from '../lib/money';
import {
  createDefaultSubscription,
  startProTrial,
  checkInvoiceQuota,
  checkCustomerQuota
} from '../lib/subscriptions';

interface BusinessContextType {
  activeBusiness: Business | null;
  allBusinesses: Business[];
  currentMemberRole: 'owner' | 'admin' | 'accountant' | 'viewer';
  members: BusinessMember[];
  customers: Customer[];
  products: ProductService[];
  invoices: Invoice[];
  quotations: Quotation[];
  payments: Payment[];
  receipts: Receipt[];
  expenses: Expense[];
  auditLogs: AuditLog[];
  loading: boolean;
  
  // Super Admin & Subscriber Governance
  isSuperAdmin: boolean;
  allSubscribers: Business[];
  updateSubscriberSubscription: (
    businessId: string,
    planId: SubscriptionPlanId,
    interval: BillingInterval,
    status?: SubscriptionStatus,
    trialEndDate?: string,
    reason?: string
  ) => Promise<void>;
  extendSubscriberTrial: (businessId: string, additionalDays: number) => Promise<void>;
  cancelSubscriberSubscription: (businessId: string, reason?: string) => Promise<void>;
  resumeSubscriberSubscription: (businessId: string) => Promise<void>;
  createSubscriberBusiness: (data: Partial<Business>) => Promise<Business>;
  deleteSubscriberBusiness: (businessId: string) => Promise<void>;
  refreshSubscribers: () => Promise<void>;

  // Actions
  switchBusiness: (businessId: string) => void;
  createBusiness: (data: Partial<Business>) => Promise<Business>;
  updateBusiness: (id: string, data: Partial<Business>) => Promise<void>;
  
  // Customers
  createCustomer: (data: Omit<Customer, 'id' | 'businessId' | 'outstandingBalanceMinor' | 'totalInvoicedMinor' | 'totalPaidMinor' | 'createdAt' | 'updatedAt'>) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  
  // Products
  createProduct: (data: Omit<ProductService, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>) => Promise<ProductService>;
  updateProduct: (id: string, data: Partial<ProductService>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  
  // Invoices
  createInvoice: (data: {
    customerId: string;
    issueDate: string;
    dueDate: string;
    paymentTerms: string;
    items: Omit<InvoiceItem, 'id' | 'lineTotalMinor'>[];
    discountMinor?: number;
    vatPercent?: number;
    whtPercent?: number;
    notes?: string;
  }) => Promise<Invoice>;
  updateInvoiceStatus: (id: string, status: Invoice['status']) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  
  // Quotations
  createQuotation: (data: {
    customerId: string;
    issueDate: string;
    validityDate: string;
    items: Omit<InvoiceItem, 'id' | 'lineTotalMinor'>[];
    discountMinor?: number;
    vatPercent?: number;
    notes?: string;
  }) => Promise<Quotation>;
  updateQuotationStatus: (id: string, status: Quotation['status']) => Promise<void>;
  convertQuotationToInvoice: (quotationId: string) => Promise<Invoice>;
  deleteQuotation: (id: string) => Promise<void>;
  
  // Payments & Receipts
  recordPayment: (data: {
    customerId: string;
    invoiceId: string;
    amountMinor: number;
    paymentDate: string;
    paymentMethod: Payment['paymentMethod'];
    reference: string;
    notes?: string;
    generateReceiptImmediately?: boolean;
  }) => Promise<{ payment: Payment; receipt?: Receipt }>;
  
  // Expenses
  createExpense: (data: Omit<Expense, 'id' | 'businessId' | 'expenseNumber' | 'createdBy' | 'createdAt' | 'updatedAt'>) => Promise<Expense>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  
  // Team Members
  inviteMember: (email: string, name: string, role: BusinessMember['role']) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  
  // Subscription & Pricing Strategy
  startProTrialSubscription: () => Promise<void>;
  updateSubscription: (planId: SubscriptionPlanId, interval: BillingInterval, paymentMethod?: 'paystack' | 'bank_transfer' | 'card') => Promise<void>;
  cancelSubscription: (reason?: string) => Promise<void>;
  resumeSubscription: () => Promise<void>;
  isUpgradeModalOpen: boolean;
  upgradeModalReason: string | null;
  openUpgradeModal: (reason?: string) => void;
  closeUpgradeModal: () => void;

  // Seeding / Resetting Sample Nigerian Data for quick evaluation
  seedNigerianBusinessData: () => Promise<void>;
  
  // Audit Trail
  logAuditAction: (entityType: AuditLog['entityType'], entityId: string, action: AuditLog['action'], description: string) => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

// Initial default Nigerian business generator
const createDefaultNigerianBusiness = (userId: string, userEmail: string = 'user@bizledger.ng'): Business => {
  const bizId = `biz_${Date.now().toString(36)}`;
  return {
    id: bizId,
    name: 'Kano & Lagos Agro-Allied Enterprises Ltd',
    rcNumber: 'RC-1849204',
    taxIdentificationNumber: 'TIN-29481029-0001',
    email: userEmail,
    phone: '+234 803 456 7890',
    address: 'Plot 14, Commercial Avenue, Victoria Island',
    state: 'Lagos',
    currency: 'NGN',
    ownerId: userId,
    defaultVatPercent: 7.5, // Standard Nigerian VAT
    defaultWhtPercent: 5.0, // Standard Nigerian WHT for contracts
    bankDetails: {
      bankName: 'Guaranty Trust Bank (GTBank)',
      accountNumber: '0129384756',
      accountName: 'Kano & Lagos Agro-Allied Enterprises Ltd',
      bvnOrNinNote: 'Verified Corporate NIBSS Account',
    },
    invoicePrefix: 'INV',
    quotationPrefix: 'QT',
    receiptPrefix: 'REC',
    expensePrefix: 'EXP',
    paymentTermsDefault: 'Due on Receipt',
    subscription: {
      planId: 'pro',
      status: 'active',
      billingInterval: '6months',
      currentPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      autoRenew: true,
      paymentMethod: 'paystack',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const getSamplePlatformSubscribers = (): Business[] => [
  {
    id: 'biz_kano_lagos_agro',
    name: 'Kano & Lagos Agro-Allied Enterprises Ltd',
    rcNumber: 'RC-1849204',
    taxIdentificationNumber: 'TIN-29481029-0001',
    email: SUPER_ADMIN_EMAIL, // Account Owner's flagship enterprise
    phone: '+234 803 456 7890',
    address: 'Plot 14, Commercial Avenue, Victoria Island',
    state: 'Lagos',
    currency: 'NGN',
    ownerId: 'super_admin_owner_001',
    defaultVatPercent: 7.5,
    defaultWhtPercent: 5.0,
    bankDetails: {
      bankName: 'Guaranty Trust Bank (GTBank)',
      accountNumber: '0129384756',
      accountName: 'Kano & Lagos Agro-Allied Enterprises Ltd',
      bvnOrNinNote: 'Verified Corporate NIBSS Account',
    },
    invoicePrefix: 'INV',
    quotationPrefix: 'QT',
    receiptPrefix: 'REC',
    expensePrefix: 'EXP',
    paymentTermsDefault: 'Due on Receipt',
    subscription: {
      planId: 'pro',
      status: 'active',
      billingInterval: '6months',
      currentPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      autoRenew: true,
      paymentMethod: 'paystack',
      assignedBySuperAdmin: true,
    },
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'biz_lekki_logistics',
    name: 'Lekki Haulage & Freight Logistics Ltd',
    rcNumber: 'RC-2401923',
    taxIdentificationNumber: 'TIN-89301924-0001',
    email: 'operations@lekkilogistics.ng',
    phone: '+234 802 334 5566',
    address: 'KM 18 Lekki-Epe Expressway, Chevron Roundabout',
    state: 'Lagos',
    currency: 'NGN',
    ownerId: 'usr_lekki_owner',
    defaultVatPercent: 7.5,
    defaultWhtPercent: 5.0,
    bankDetails: {
      bankName: 'Zenith Bank Plc',
      accountNumber: '1015694820',
      accountName: 'Lekki Haulage & Freight Logistics Ltd',
    },
    invoicePrefix: 'LHK',
    quotationPrefix: 'QT-LH',
    receiptPrefix: 'REC-LH',
    expensePrefix: 'EXP-LH',
    paymentTermsDefault: 'Net 15 Days',
    subscription: {
      planId: 'pro',
      status: 'trialing',
      billingInterval: 'monthly',
      trialStartDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      trialEndDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
      currentPeriodStart: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      autoRenew: true,
      paymentMethod: 'card',
    },
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'biz_abuja_consult',
    name: 'Aso Rock Advisory & Engineering Partners',
    rcNumber: 'RC-3194021',
    taxIdentificationNumber: 'TIN-44019283-0001',
    email: 'partners@asoadvisory.ng',
    phone: '+234 809 112 2334',
    address: 'Constitution Avenue, Central Business District',
    state: 'Abuja FCT',
    currency: 'NGN',
    ownerId: 'usr_abuja_owner',
    defaultVatPercent: 7.5,
    defaultWhtPercent: 10.0,
    bankDetails: {
      bankName: 'First Bank of Nigeria',
      accountNumber: '2034910283',
      accountName: 'Aso Rock Advisory Partners',
    },
    invoicePrefix: 'ASA',
    quotationPrefix: 'EST',
    receiptPrefix: 'REC',
    expensePrefix: 'EXP',
    paymentTermsDefault: 'Net 30 Days',
    subscription: {
      planId: 'enterprise',
      status: 'active',
      billingInterval: 'annual',
      currentPeriodStart: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 320 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      autoRenew: true,
      paymentMethod: 'bank_transfer',
    },
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'biz_ph_oilfields',
    name: 'Niger Delta Offshore & Valve Services Ltd',
    rcNumber: 'RC-1294801',
    taxIdentificationNumber: 'TIN-59012938-0001',
    email: 'procurement@nd-offshore.com.ng',
    phone: '+234 803 998 7766',
    address: 'Trans-Amadi Industrial Layout',
    state: 'Rivers',
    currency: 'NGN',
    ownerId: 'usr_ph_owner',
    defaultVatPercent: 7.5,
    defaultWhtPercent: 5.0,
    bankDetails: {
      bankName: 'United Bank for Africa (UBA)',
      accountNumber: '1029384756',
      accountName: 'Niger Delta Offshore Valve Services',
    },
    invoicePrefix: 'NDO',
    quotationPrefix: 'NDQ',
    receiptPrefix: 'NDR',
    expensePrefix: 'NDE',
    paymentTermsDefault: 'Net 45 Days',
    subscription: {
      planId: 'pro',
      status: 'active',
      billingInterval: 'annual',
      currentPeriodStart: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 245 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      autoRenew: true,
      paymentMethod: 'paystack',
    },
    createdAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'biz_ibadan_farms',
    name: 'Oyo Valley Poultry & Feedmills Cooperative',
    rcNumber: 'RC-4910293',
    taxIdentificationNumber: 'TIN-77192039-0001',
    email: 'accounts@oyovalleyfeeds.ng',
    phone: '+234 805 443 2211',
    address: 'Iwo Road Agro Corridor, Ibadan',
    state: 'Oyo',
    currency: 'NGN',
    ownerId: 'usr_ibadan_owner',
    defaultVatPercent: 7.5,
    defaultWhtPercent: 5.0,
    bankDetails: {
      bankName: 'Access Bank Plc',
      accountNumber: '0039281746',
      accountName: 'Oyo Valley Poultry & Feedmills',
    },
    invoicePrefix: 'OVP',
    quotationPrefix: 'QT',
    receiptPrefix: 'REC',
    expensePrefix: 'EXP',
    paymentTermsDefault: 'Due on Receipt',
    subscription: {
      planId: 'free',
      status: 'active',
      billingInterval: 'monthly',
      currentPeriodStart: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      autoRenew: true,
    },
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'biz_kano_textiles',
    name: 'Dawanau Grain & Textile Merchants Hub',
    rcNumber: 'RC-1092837',
    taxIdentificationNumber: 'TIN-33910283-0001',
    email: 'info@dawanauhubs.ng',
    phone: '+234 806 778 9900',
    address: 'Bompai Industrial Area, Kano',
    state: 'Kano',
    currency: 'NGN',
    ownerId: 'usr_kano_owner',
    defaultVatPercent: 7.5,
    defaultWhtPercent: 5.0,
    bankDetails: {
      bankName: 'Jaiz Bank Plc',
      accountNumber: '0019283746',
      accountName: 'Dawanau Grain & Textile Merchants',
    },
    invoicePrefix: 'DGM',
    quotationPrefix: 'QT',
    receiptPrefix: 'REC',
    expensePrefix: 'EXP',
    paymentTermsDefault: 'Due on Receipt',
    subscription: {
      planId: 'pro',
      status: 'past_due',
      billingInterval: 'monthly',
      currentPeriodStart: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      currentPeriodEnd: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      autoRenew: true,
      paymentMethod: 'card',
    },
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export const BusinessProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { success, error, warning, info } = useNotification();

  // Super Admin Check
  const isSuperAdmin = Boolean(
    user?.isSuperAdmin || (user?.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase())
  );

  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [allSubscribers, setAllSubscribers] = useState<Business[]>([]);
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<ProductService[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscription & Upgrade Prompt state
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalReason, setUpgradeModalReason] = useState<string | null>(null);

  const openUpgradeModal = useCallback((reason?: string) => {
    setUpgradeModalReason(reason || null);
    setIsUpgradeModalOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setIsUpgradeModalOpen(false);
    setUpgradeModalReason(null);
  }, []);

  // Sync to local storage for fast resilience
  const getStorageKey = (collectionName: string, bizId: string) => `bizledger_${bizId}_${collectionName}`;

  // Log Audit Action
  const logAuditAction = useCallback(async (
    entityType: AuditLog['entityType'],
    entityId: string,
    action: AuditLog['action'],
    description: string
  ) => {
    if (!activeBusiness || !user) return;
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newLog: AuditLog = {
      id: logId,
      businessId: activeBusiness.id,
      entityType,
      entityId,
      action,
      description,
      userId: user.uid,
      userName: user.displayName || user.email || 'BizLedger User',
      timestamp: new Date().toISOString(),
    };

    setAuditLogs(prev => [newLog, ...prev]);

    try {
      if (!user.isDemoUser) {
        await setDoc(doc(db, 'audit_logs', logId), newLog);
      }
    } catch (err) {
      console.warn('Failed to sync audit log to Firestore:', err);
    }
  }, [activeBusiness, user]);

  // Load user businesses on login
  useEffect(() => {
    if (!user) {
      setActiveBusiness(null);
      setAllBusinesses([]);
      setAllSubscribers([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadBusinesses = async () => {
      setLoading(true);
      try {
        let userBizList: Business[] = [];
        let allPlatformSubs: Business[] = [];

        // Check local storage first for subscribers
        const cachedSubscribers = localStorage.getItem('bizledger_all_platform_subscribers');
        if (cachedSubscribers) {
          try {
            allPlatformSubs = JSON.parse(cachedSubscribers);
          } catch (e) {
            console.warn('Cache parse error for platform subscribers');
          }
        }

        // Check local storage for user businesses
        const cachedBizList = localStorage.getItem(`bizledger_user_biz_${user.uid}`);
        if (cachedBizList) {
          try {
            userBizList = JSON.parse(cachedBizList);
          } catch (e) {
            console.warn('Cache parse error');
          }
        }

        // Fetch from Firestore if authenticated
        if (!user.isDemoUser) {
          try {
            const bizRef = collection(db, 'businesses');
            if (isSuperAdmin) {
              // Super admin has permission to fetch ALL businesses across the platform
              const snap = await getDocs(bizRef);
              const fetched = snap.docs.map(d => ({ ...d.data(), id: d.id } as Business));
              if (fetched.length > 0) {
                allPlatformSubs = fetched;
                userBizList = fetched;
              }
            } else {
              const q = query(bizRef, where('ownerId', '==', user.uid));
              const snap = await getDocs(q);
              const fetched = snap.docs.map(d => ({ ...d.data(), id: d.id } as Business));
              if (fetched.length > 0) {
                userBizList = fetched;
              }
            }
          } catch (err) {
            console.warn('Firestore business fetch fallback to local cache:', err);
          }
        }

        // If Super Admin has no platform subscribers yet, initialize with rich Nigerian sample
        if (allPlatformSubs.length === 0) {
          allPlatformSubs = getSamplePlatformSubscribers();
          localStorage.setItem('bizledger_all_platform_subscribers', JSON.stringify(allPlatformSubs));
        }

        // If user is super admin, their business list includes all platform subscribers
        if (isSuperAdmin) {
          userBizList = allPlatformSubs;
        } else if (userBizList.length === 0) {
          const defaultBiz = createDefaultNigerianBusiness(user.uid, user.email || undefined);
          userBizList = [defaultBiz];
          localStorage.setItem(`bizledger_user_biz_${user.uid}`, JSON.stringify(userBizList));
          
          if (!user.isDemoUser) {
            try {
              await setDoc(doc(db, 'businesses', defaultBiz.id), defaultBiz);
              const memberId = `${defaultBiz.id}_${user.uid}`;
              const memberDoc: BusinessMember = {
                id: memberId,
                businessId: defaultBiz.id,
                userId: user.uid,
                userEmail: user.email || '',
                userName: user.displayName || 'Owner',
                role: 'owner',
                status: 'active',
                createdAt: new Date().toISOString(),
              };
              await setDoc(doc(db, 'business_members', memberId), memberDoc);
            } catch (err) {
              console.warn('Init firestore doc write warning:', err);
            }
          }
        }

        if (isMounted) {
          setAllSubscribers(allPlatformSubs);
          setAllBusinesses(userBizList);
          const activeId = localStorage.getItem(`bizledger_active_biz_id_${user.uid}`);
          const found = userBizList.find(b => b.id === activeId) || userBizList[0];
          setActiveBusiness(found);
        }
      } catch (err) {
        console.error('Error loading businesses:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadBusinesses();

    return () => {
      isMounted = false;
    };
  }, [user, isSuperAdmin]);

  // Load business data whenever active business changes
  useEffect(() => {
    if (!activeBusiness || !user) return;

    const bizId = activeBusiness.id;

    // Load from local storage cache for immediate reactivity
    const loadCache = (key: string, setter: (val: any) => void) => {
      const cached = localStorage.getItem(getStorageKey(key, bizId));
      if (cached) {
        try {
          setter(JSON.parse(cached));
        } catch (e) {
          console.warn('Failed to parse cache for', key);
        }
      } else {
        setter([]);
      }
    };

    loadCache('customers', setCustomers);
    loadCache('products', setProducts);
    loadCache('invoices', setInvoices);
    loadCache('quotations', setQuotations);
    loadCache('payments', setPayments);
    loadCache('receipts', setReceipts);
    loadCache('expenses', setExpenses);
    loadCache('auditLogs', setAuditLogs);
    loadCache('members', setMembers);

    // If real Firebase user, attach Firestore onSnapshot listeners
    if (!user.isDemoUser) {
      const unsubscribers: (() => void)[] = [];

      const attachListener = (colName: string, setter: (val: any) => void) => {
        try {
          const colRef = collection(db, colName);
          const q = query(colRef, where('businessId', '==', bizId));
          const unsub = onSnapshot(
            q,
            snapshot => {
              const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
              setter(items);
              localStorage.setItem(getStorageKey(colName, bizId), JSON.stringify(items));
            },
            err => {
              console.warn(`Firestore listener notice for ${colName}:`, err.message);
            }
          );
          unsubscribers.push(unsub);
        } catch (e) {
          console.warn(`Could not attach listener for ${colName}`);
        }
      };

      attachListener('customers', setCustomers);
      attachListener('products_services', setProducts);
      attachListener('invoices', setInvoices);
      attachListener('quotations', setQuotations);
      attachListener('payments', setPayments);
      attachListener('receipts', setReceipts);
      attachListener('expenses', setExpenses);
      attachListener('audit_logs', setAuditLogs);
      attachListener('business_members', setMembers);

      return () => {
        unsubscribers.forEach(u => u());
      };
    }
  }, [activeBusiness, user]);

  // Sync state to local storage whenever collections change
  useEffect(() => {
    if (!activeBusiness) return;
    const bizId = activeBusiness.id;
    localStorage.setItem(getStorageKey('customers', bizId), JSON.stringify(customers));
  }, [customers, activeBusiness]);

  useEffect(() => {
    if (!activeBusiness) return;
    const bizId = activeBusiness.id;
    localStorage.setItem(getStorageKey('products', bizId), JSON.stringify(products));
  }, [products, activeBusiness]);

  useEffect(() => {
    if (!activeBusiness) return;
    const bizId = activeBusiness.id;
    localStorage.setItem(getStorageKey('invoices', bizId), JSON.stringify(invoices));
  }, [invoices, activeBusiness]);

  useEffect(() => {
    if (!activeBusiness) return;
    const bizId = activeBusiness.id;
    localStorage.setItem(getStorageKey('quotations', bizId), JSON.stringify(quotations));
  }, [quotations, activeBusiness]);

  useEffect(() => {
    if (!activeBusiness) return;
    const bizId = activeBusiness.id;
    localStorage.setItem(getStorageKey('payments', bizId), JSON.stringify(payments));
  }, [payments, activeBusiness]);

  useEffect(() => {
    if (!activeBusiness) return;
    const bizId = activeBusiness.id;
    localStorage.setItem(getStorageKey('receipts', bizId), JSON.stringify(receipts));
  }, [receipts, activeBusiness]);

  useEffect(() => {
    if (!activeBusiness) return;
    const bizId = activeBusiness.id;
    localStorage.setItem(getStorageKey('expenses', bizId), JSON.stringify(expenses));
  }, [expenses, activeBusiness]);

  useEffect(() => {
    if (!activeBusiness) return;
    const bizId = activeBusiness.id;
    localStorage.setItem(getStorageKey('auditLogs', bizId), JSON.stringify(auditLogs));
  }, [auditLogs, activeBusiness]);

  const switchBusiness = (businessId: string) => {
    const target = allBusinesses.find(b => b.id === businessId);
    if (target) {
      setActiveBusiness(target);
      if (user) {
        localStorage.setItem(`bizledger_active_biz_id_${user.uid}`, target.id);
      }
      info('Business Switched', `Now managing ${target.name}`);
    }
  };

  const createBusiness = async (data: Partial<Business>): Promise<Business> => {
    if (!user) throw new Error('Unauthenticated');
    const newBizId = `biz_${Date.now().toString(36)}`;
    const newBiz: Business = {
      id: newBizId,
      name: data.name || 'New Enterprise',
      rcNumber: data.rcNumber || '',
      taxIdentificationNumber: data.taxIdentificationNumber || '',
      email: data.email || user.email || '',
      phone: data.phone || '',
      address: data.address || '',
      state: data.state || 'Lagos',
      currency: 'NGN',
      ownerId: user.uid,
      defaultVatPercent: data.defaultVatPercent ?? 7.5,
      defaultWhtPercent: data.defaultWhtPercent ?? 5.0,
      bankDetails: data.bankDetails || {
        bankName: 'Access Bank',
        accountNumber: '',
        accountName: data.name || '',
      },
      invoicePrefix: data.invoicePrefix || 'INV',
      quotationPrefix: data.quotationPrefix || 'QT',
      receiptPrefix: data.receiptPrefix || 'REC',
      expensePrefix: data.expensePrefix || 'EXP',
      paymentTermsDefault: data.paymentTermsDefault || 'Due on Receipt',
      subscription: data.subscription || createDefaultSubscription(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedList = [...allBusinesses, newBiz];
    setAllBusinesses(updatedList);
    setActiveBusiness(newBiz);
    localStorage.setItem(`bizledger_user_biz_${user.uid}`, JSON.stringify(updatedList));
    localStorage.setItem(`bizledger_active_biz_id_${user.uid}`, newBiz.id);

    if (!user.isDemoUser) {
      try {
        await setDoc(doc(db, 'businesses', newBiz.id), newBiz);
        const memberId = `${newBiz.id}_${user.uid}`;
        await setDoc(doc(db, 'business_members', memberId), {
          id: memberId,
          businessId: newBiz.id,
          userId: user.uid,
          userEmail: user.email || '',
          userName: user.displayName || 'Owner',
          role: 'owner',
          status: 'active',
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Firestore write notice:', err);
      }
    }

    success('Business Registered', `${newBiz.name} is ready for operations.`);
    return newBiz;
  };

  const updateBusiness = async (id: string, data: Partial<Business>) => {
    if (!activeBusiness) return;
    const updated: Business = {
      ...activeBusiness,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    setActiveBusiness(updated);
    const updatedList = allBusinesses.map(b => b.id === id ? updated : b);
    setAllBusinesses(updatedList);
    if (user) {
      localStorage.setItem(`bizledger_user_biz_${user.uid}`, JSON.stringify(updatedList));
    }

    if (!user?.isDemoUser) {
      try {
        await updateDoc(doc(db, 'businesses', id), data);
      } catch (err) {
        console.warn('Firestore business update notice:', err);
      }
    }

    await logAuditAction('business', id, 'update', `Updated profile settings for ${updated.name}`);
    success('Settings Saved', 'Business profile updated successfully.');
  };

  // Subscription management methods
  const startProTrialSubscription = async () => {
    if (!activeBusiness) return;
    const newSub = startProTrial();
    await updateBusiness(activeBusiness.id, { subscription: newSub });
    await logAuditAction('business', activeBusiness.id, 'update', 'Started 14-day trial of Professional tier');
    success('14-Day Free Trial Activated!', 'You now have full access to unlimited invoices, receipts, and team features.');
  };

  const updateSubscription = async (
    planId: SubscriptionPlanId,
    interval: BillingInterval,
    paymentMethod: 'paystack' | 'bank_transfer' | 'card' = 'paystack'
  ) => {
    if (!activeBusiness) return;
    const now = new Date();
    const periodEnd = new Date(now);
    if (interval === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else if (interval === '6months') {
      periodEnd.setMonth(periodEnd.getMonth() + 6);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const newSub: BusinessSubscription = {
      planId,
      status: 'active',
      billingInterval: interval,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      autoRenew: true,
      paymentMethod,
    };

    await updateBusiness(activeBusiness.id, { subscription: newSub });
    await logAuditAction('business', activeBusiness.id, 'update', `Upgraded subscription to ${planId.toUpperCase()} (${interval})`);
    success('Subscription Activated', `Your business is now subscribed to the ${planId.toUpperCase()} tier.`);
  };

  const cancelSubscription = async (reason?: string) => {
    if (!activeBusiness || !activeBusiness.subscription) return;
    const currentSub = activeBusiness.subscription;
    const updatedSub: BusinessSubscription = {
      ...currentSub,
      cancelAtPeriodEnd: true,
      autoRenew: false,
      cancellationReason: reason || 'User requested cancellation',
    };

    await updateBusiness(activeBusiness.id, { subscription: updatedSub });
    await logAuditAction('business', activeBusiness.id, 'update', `Scheduled cancellation at end of billing cycle`);
    info('Cancellation Scheduled', `Access remains active until ${new Date(currentSub.currentPeriodEnd).toLocaleDateString('en-NG')}.`);
  };

  const resumeSubscription = async () => {
    if (!activeBusiness || !activeBusiness.subscription) return;
    const currentSub = activeBusiness.subscription;
    const updatedSub: BusinessSubscription = {
      ...currentSub,
      cancelAtPeriodEnd: false,
      autoRenew: true,
      cancellationReason: undefined,
    };

    await updateBusiness(activeBusiness.id, { subscription: updatedSub });
    await logAuditAction('business', activeBusiness.id, 'update', 'Resumed subscription auto-renewal');
    success('Subscription Resumed', 'Auto-renewal has been re-enabled.');
  };

  // Super Admin: Subscribers Governance Methods
  const updateSubscriberSubscription = async (
    businessId: string,
    planId: SubscriptionPlanId,
    interval: BillingInterval,
    status: SubscriptionStatus = 'active',
    trialEndDate?: string,
    reason?: string
  ) => {
    const now = new Date();
    const periodEnd = new Date(now);
    if (interval === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else if (interval === '6months') {
      periodEnd.setMonth(periodEnd.getMonth() + 6);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const updatedSub: BusinessSubscription = {
      planId,
      status,
      billingInterval: interval,
      trialStartDate: status === 'trialing' ? now.toISOString() : undefined,
      trialEndDate: status === 'trialing' ? (trialEndDate || new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()) : undefined,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: status === 'cancelled',
      autoRenew: status === 'active',
      assignedBySuperAdmin: true,
      notes: reason,
    };

    setAllSubscribers(prev => {
      const next = prev.map(b => (b.id === businessId ? { ...b, subscription: updatedSub, updatedAt: now.toISOString() } : b));
      localStorage.setItem('bizledger_all_platform_subscribers', JSON.stringify(next));
      return next;
    });

    if (activeBusiness && activeBusiness.id === businessId) {
      setActiveBusiness(prev => (prev ? { ...prev, subscription: updatedSub, updatedAt: now.toISOString() } : null));
    }

    setAllBusinesses(prev => prev.map(b => (b.id === businessId ? { ...b, subscription: updatedSub, updatedAt: now.toISOString() } : b)));

    try {
      if (!user?.isDemoUser) {
        await updateDoc(doc(db, 'businesses', businessId), {
          subscription: updatedSub,
          updatedAt: now.toISOString(),
        });
      }
    } catch (err) {
      console.warn('Firestore subscriber update sync warning:', err);
    }

    await logAuditAction(
      'business',
      businessId,
      'update',
      `Super Admin (${SUPER_ADMIN_EMAIL}) updated subscription to ${planId.toUpperCase()} (${interval}, ${status}). Note: ${reason || 'Administrative update'}`
    );

    success('Subscriber Updated', `Business subscription set to ${planId.toUpperCase()} (${status}).`);
  };

  const extendSubscriberTrial = async (businessId: string, additionalDays: number) => {
    const target = allSubscribers.find(b => b.id === businessId);
    if (!target) return;

    const currentEnd = target.subscription?.trialEndDate ? new Date(target.subscription.trialEndDate) : new Date();
    const newEndDate = new Date(currentEnd.getTime() + additionalDays * 24 * 60 * 60 * 1000);

    const updatedSub: BusinessSubscription = {
      ...(target.subscription || createDefaultSubscription()),
      planId: 'pro',
      status: 'trialing',
      trialEndDate: newEndDate.toISOString(),
      currentPeriodEnd: newEndDate.toISOString(),
      cancelAtPeriodEnd: false,
      autoRenew: true,
      assignedBySuperAdmin: true,
    };

    setAllSubscribers(prev => {
      const next = prev.map(b => (b.id === businessId ? { ...b, subscription: updatedSub } : b));
      localStorage.setItem('bizledger_all_platform_subscribers', JSON.stringify(next));
      return next;
    });

    if (activeBusiness && activeBusiness.id === businessId) {
      setActiveBusiness(prev => (prev ? { ...prev, subscription: updatedSub } : null));
    }

    try {
      if (!user?.isDemoUser) {
        await updateDoc(doc(db, 'businesses', businessId), {
          subscription: updatedSub,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('Firestore trial extension sync warning:', e);
    }

    await logAuditAction(
      'business',
      businessId,
      'update',
      `Super Admin (${SUPER_ADMIN_EMAIL}) extended trial by ${additionalDays} days until ${newEndDate.toLocaleDateString('en-NG')}`
    );

    success('Trial Extended', `Added ${additionalDays} days. New trial expiration: ${newEndDate.toLocaleDateString('en-NG')}.`);
  };

  const cancelSubscriberSubscription = async (businessId: string, reason?: string) => {
    await updateSubscriberSubscription(businessId, 'free', 'monthly', 'cancelled', undefined, reason || 'Super Admin cancelled subscription');
  };

  const resumeSubscriberSubscription = async (businessId: string) => {
    const target = allSubscribers.find(b => b.id === businessId);
    const planId = target?.subscription?.planId || 'pro';
    const interval = target?.subscription?.billingInterval || 'monthly';
    await updateSubscriberSubscription(businessId, planId, interval, 'active', undefined, 'Super Admin resumed subscription');
  };

  const createSubscriberBusiness = async (data: Partial<Business>): Promise<Business> => {
    const newBizId = `biz_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`;
    const newBiz: Business = {
      id: newBizId,
      name: data.name || 'New Registered Business',
      rcNumber: data.rcNumber || 'RC-Pending',
      taxIdentificationNumber: data.taxIdentificationNumber || '',
      email: data.email || 'contact@subscriber.ng',
      phone: data.phone || '',
      address: data.address || '',
      state: data.state || 'Lagos',
      currency: 'NGN',
      ownerId: user?.uid || 'usr_tenant',
      defaultVatPercent: data.defaultVatPercent ?? 7.5,
      defaultWhtPercent: data.defaultWhtPercent ?? 5.0,
      bankDetails: data.bankDetails || {
        bankName: 'Guaranty Trust Bank',
        accountNumber: '0129384756',
        accountName: data.name || 'Enterprise Account',
      },
      invoicePrefix: data.invoicePrefix || 'INV',
      quotationPrefix: data.quotationPrefix || 'QT',
      receiptPrefix: data.receiptPrefix || 'REC',
      expensePrefix: data.expensePrefix || 'EXP',
      paymentTermsDefault: data.paymentTermsDefault || 'Due on Receipt',
      subscription: data.subscription || createDefaultSubscription(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setAllSubscribers(prev => {
      const next = [newBiz, ...prev];
      localStorage.setItem('bizledger_all_platform_subscribers', JSON.stringify(next));
      return next;
    });

    setAllBusinesses(prev => [newBiz, ...prev]);

    try {
      if (!user?.isDemoUser) {
        await setDoc(doc(db, 'businesses', newBiz.id), newBiz);
      }
    } catch (err) {
      console.warn('Firestore create subscriber sync:', err);
    }

    await logAuditAction('business', newBiz.id, 'create', `Super Admin (${SUPER_ADMIN_EMAIL}) provisioned subscriber organization ${newBiz.name}`);
    success('Subscriber Provisioned', `${newBiz.name} registered and activated.`);
    return newBiz;
  };

  const deleteSubscriberBusiness = async (businessId: string) => {
    setAllSubscribers(prev => {
      const next = prev.filter(b => b.id !== businessId);
      localStorage.setItem('bizledger_all_platform_subscribers', JSON.stringify(next));
      return next;
    });
    setAllBusinesses(prev => prev.filter(b => b.id !== businessId));
    if (activeBusiness?.id === businessId) {
      const remaining = allSubscribers.filter(b => b.id !== businessId);
      if (remaining.length > 0) {
        setActiveBusiness(remaining[0]);
      }
    }
    try {
      if (!user?.isDemoUser) {
        await deleteDoc(doc(db, 'businesses', businessId));
      }
    } catch (err) {
      console.warn('Firestore delete subscriber sync:', err);
    }
    info('Subscriber Removed', `Business ${businessId} removed from platform.`);
  };

  const refreshSubscribers = async () => {
    try {
      if (!user?.isDemoUser) {
        const snap = await getDocs(collection(db, 'businesses'));
        const fetched = snap.docs.map(d => ({ ...d.data(), id: d.id } as Business));
        if (fetched.length > 0) {
          setAllSubscribers(fetched);
          localStorage.setItem('bizledger_all_platform_subscribers', JSON.stringify(fetched));
          success('Subscribers Synchronized', `Fetched ${fetched.length} tenants from Firestore.`);
          return;
        }
      }
      const cached = localStorage.getItem('bizledger_all_platform_subscribers');
      if (cached) {
        setAllSubscribers(JSON.parse(cached));
      } else {
        const sample = getSamplePlatformSubscribers();
        setAllSubscribers(sample);
        localStorage.setItem('bizledger_all_platform_subscribers', JSON.stringify(sample));
      }
      success('Subscribers Updated', 'Refreshed local subscriber records.');
    } catch (e: any) {
      warning('Refresh Warning', e.message || 'Could not fetch remote subscribers.');
    }
  };

  // Customers CRUD
  const createCustomer = async (data: Omit<Customer, 'id' | 'businessId' | 'outstandingBalanceMinor' | 'totalInvoicedMinor' | 'totalPaidMinor' | 'createdAt' | 'updatedAt'>) => {
    if (!activeBusiness) throw new Error('No active business');

    // Usage-based quota prompt
    const quota = checkCustomerQuota(activeBusiness.subscription, customers.length);
    if (!quota.allowed) {
      openUpgradeModal(`You have reached the Free Starter plan limit of ${quota.max} customers. Start your 14-day Professional trial for unlimited customer records.`);
      throw new Error(`Customer limit reached (${quota.max} max on Free plan). Please upgrade to Professional.`);
    }

    const customerId = `cust_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`;
    const newCustomer: Customer = {
      ...data,
      id: customerId,
      businessId: activeBusiness.id,
      outstandingBalanceMinor: 0,
      totalInvoicedMinor: 0,
      totalPaidMinor: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCustomers(prev => [newCustomer, ...prev]);

    if (!user?.isDemoUser) {
      try {
        await setDoc(doc(db, 'customers', customerId), newCustomer);
      } catch (err) {
        console.warn('Customer firestore write error:', err);
      }
    }

    await logAuditAction('customer', customerId, 'create', `Created customer profile: ${newCustomer.name}`);
    success('Customer Added', `${newCustomer.name} was successfully registered.`);
    return newCustomer;
  };

  const updateCustomer = async (id: string, data: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c));
    if (!user?.isDemoUser) {
      try {
        await updateDoc(doc(db, 'customers', id), { ...data, updatedAt: new Date().toISOString() });
      } catch (err) {
        console.warn('Customer update error:', err);
      }
    }
    await logAuditAction('customer', id, 'update', `Updated customer details`);
    success('Customer Updated', 'Changes saved successfully.');
  };

  const deleteCustomer = async (id: string) => {
    const target = customers.find(c => c.id === id);
    setCustomers(prev => prev.filter(c => c.id !== id));
    if (!user?.isDemoUser) {
      try {
        await deleteDoc(doc(db, 'customers', id));
      } catch (err) {
        console.warn('Customer delete error:', err);
      }
    }
    await logAuditAction('customer', id, 'delete', `Deleted customer: ${target?.name || id}`);
    info('Customer Removed', 'Customer record deleted.');
  };

  // Products CRUD
  const createProduct = async (data: Omit<ProductService, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>) => {
    if (!activeBusiness) throw new Error('No active business');
    const productId = `prod_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`;
    const newProduct: ProductService = {
      ...data,
      id: productId,
      businessId: activeBusiness.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProducts(prev => [newProduct, ...prev]);

    if (!user?.isDemoUser) {
      try {
        await setDoc(doc(db, 'products_services', productId), newProduct);
      } catch (err) {
        console.warn('Product firestore write error:', err);
      }
    }

    await logAuditAction('product', productId, 'create', `Added catalog item: ${newProduct.name}`);
    success('Item Added', `${newProduct.name} saved to product/service catalog.`);
    return newProduct;
  };

  const updateProduct = async (id: string, data: Partial<ProductService>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p));
    if (!user?.isDemoUser) {
      try {
        await updateDoc(doc(db, 'products_services', id), { ...data, updatedAt: new Date().toISOString() });
      } catch (err) {
        console.warn('Product update error:', err);
      }
    }
    await logAuditAction('product', id, 'update', `Updated catalog item`);
    success('Catalog Updated', 'Product/Service details updated.');
  };

  const deleteProduct = async (id: string) => {
    const target = products.find(p => p.id === id);
    setProducts(prev => prev.filter(p => p.id !== id));
    if (!user?.isDemoUser) {
      try {
        await deleteDoc(doc(db, 'products_services', id));
      } catch (err) {
        console.warn('Product delete error:', err);
      }
    }
    await logAuditAction('product', id, 'delete', `Deleted catalog item: ${target?.name || id}`);
    info('Item Removed', 'Product/Service removed from catalog.');
  };

  // Invoices
  const createInvoice = async (data: {
    customerId: string;
    issueDate: string;
    dueDate: string;
    paymentTerms: string;
    items: Omit<InvoiceItem, 'id' | 'lineTotalMinor'>[];
    discountMinor?: number;
    vatPercent?: number;
    whtPercent?: number;
    notes?: string;
  }): Promise<Invoice> => {
    if (!activeBusiness) throw new Error('No active business');

    // Usage-based invoice quota check
    const now = new Date();
    const currentMonthInvoicesCount = invoices.filter(inv => {
      const invDate = new Date(inv.issueDate);
      return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
    }).length;

    const quota = checkInvoiceQuota(activeBusiness.subscription, currentMonthInvoicesCount);
    if (!quota.allowed) {
      openUpgradeModal(`You have reached the Free Starter plan limit of ${quota.max} invoices this month. Start your 14-day Professional trial for unlimited invoicing.`);
      throw new Error(`Monthly invoice limit reached (${quota.max} invoices/month on Free plan). Upgrade to Professional for unlimited invoices.`);
    }

    const customer = customers.find(c => c.id === data.customerId);
    if (!customer) throw new Error('Customer not found');

    const invSeq = invoices.length + 1;
    const invoiceNumber = `${activeBusiness.invoicePrefix || 'INV'}-${new Date().getFullYear()}-${invSeq.toString().padStart(4, '0')}`;
    const invoiceId = `inv_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`;

    // Calculate lines strictly in integer minor units
    let calculatedSubtotal = 0;
    const computedItems: InvoiceItem[] = data.items.map(item => {
      const lineMath = calculateLineTotalMinor(item.quantity, item.unitPriceMinor, item.discountPercent, 0);
      calculatedSubtotal = addMinor(calculatedSubtotal, lineMath.grossMinor);
      return {
        ...item,
        id: `item_${Math.random().toString(36).substring(2, 7)}`,
        lineTotalMinor: lineMath.netTotalMinor,
      };
    });

    const totalDiscountMinor = data.discountMinor || 0;
    const subtotalAfterDiscount = Math.max(0, subtractMinor(calculatedSubtotal, totalDiscountMinor));

    const vatPercent = data.vatPercent ?? activeBusiness.defaultVatPercent ?? 7.5;
    const vatMinor = calculateVatAmountMinor(subtotalAfterDiscount, vatPercent);

    const whtPercent = data.whtPercent ?? 0;
    const whtMinor = calculateWhtAmountMinor(subtotalAfterDiscount, whtPercent);

    const totalMinor = addMinor(subtotalAfterDiscount, vatMinor);

    const newInvoice: Invoice = {
      id: invoiceId,
      businessId: activeBusiness.id,
      invoiceNumber,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      paymentTerms: data.paymentTerms,
      items: computedItems,
      subtotalMinor: calculatedSubtotal,
      discountMinor: totalDiscountMinor,
      taxVatMinor: vatMinor,
      taxWhtMinor: whtMinor,
      totalMinor,
      amountPaidMinor: 0,
      balanceDueMinor: totalMinor,
      status: 'sent',
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setInvoices(prev => [newInvoice, ...prev]);

    // Update customer balances atomically
    setCustomers(prev => prev.map(c => {
      if (c.id === customer.id) {
        return {
          ...c,
          totalInvoicedMinor: addMinor(c.totalInvoicedMinor, totalMinor),
          outstandingBalanceMinor: addMinor(c.outstandingBalanceMinor, totalMinor),
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    }));

    if (!user?.isDemoUser) {
      try {
        await setDoc(doc(db, 'invoices', invoiceId), newInvoice);
        await updateDoc(doc(db, 'customers', customer.id), {
          totalInvoicedMinor: addMinor(customer.totalInvoicedMinor, totalMinor),
          outstandingBalanceMinor: addMinor(customer.outstandingBalanceMinor, totalMinor),
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Invoice firestore write error:', err);
      }
    }

    await logAuditAction('invoice', invoiceId, 'create', `Issued invoice ${invoiceNumber} to ${customer.name}`);
    success('Invoice Generated', `${invoiceNumber} created for ${customer.name}.`);
    return newInvoice;
  };

  const updateInvoiceStatus = async (id: string, status: Invoice['status']) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status, updatedAt: new Date().toISOString() } : inv));
    if (!user?.isDemoUser) {
      try {
        await updateDoc(doc(db, 'invoices', id), { status, updatedAt: new Date().toISOString() });
      } catch (err) {
        console.warn('Invoice status update error:', err);
      }
    }
    await logAuditAction('invoice', id, 'status_change', `Changed invoice status to ${status}`);
    info('Status Updated', `Invoice status set to ${status}.`);
  };

  const deleteInvoice = async (id: string) => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;
    if (inv.amountPaidMinor > 0) {
      warning('Cannot Delete', 'Invoice has recorded payments. Cancel it or reverse payments first.');
      return;
    }

    setInvoices(prev => prev.filter(i => i.id !== id));
    // Reverse customer balance
    setCustomers(prev => prev.map(c => {
      if (c.id === inv.customerId) {
        return {
          ...c,
          totalInvoicedMinor: Math.max(0, subtractMinor(c.totalInvoicedMinor, inv.totalMinor)),
          outstandingBalanceMinor: Math.max(0, subtractMinor(c.outstandingBalanceMinor, inv.balanceDueMinor)),
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    }));

    if (!user?.isDemoUser) {
      try {
        await deleteDoc(doc(db, 'invoices', id));
      } catch (err) {
        console.warn('Invoice delete error:', err);
      }
    }

    await logAuditAction('invoice', id, 'delete', `Deleted invoice ${inv.invoiceNumber}`);
    info('Invoice Deleted', `${inv.invoiceNumber} removed.`);
  };

  // Quotations
  const createQuotation = async (data: {
    customerId: string;
    issueDate: string;
    validityDate: string;
    items: Omit<InvoiceItem, 'id' | 'lineTotalMinor'>[];
    discountMinor?: number;
    vatPercent?: number;
    notes?: string;
  }): Promise<Quotation> => {
    if (!activeBusiness) throw new Error('No active business');
    const customer = customers.find(c => c.id === data.customerId);
    if (!customer) throw new Error('Customer not found');

    const qtSeq = quotations.length + 1;
    const quotationNumber = `${activeBusiness.quotationPrefix || 'QT'}-${new Date().getFullYear()}-${qtSeq.toString().padStart(4, '0')}`;
    const quotationId = `qt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`;

    let calculatedSubtotal = 0;
    const computedItems: InvoiceItem[] = data.items.map(item => {
      const lineMath = calculateLineTotalMinor(item.quantity, item.unitPriceMinor, item.discountPercent, 0);
      calculatedSubtotal = addMinor(calculatedSubtotal, lineMath.grossMinor);
      return {
        ...item,
        id: `item_${Math.random().toString(36).substring(2, 7)}`,
        lineTotalMinor: lineMath.netTotalMinor,
      };
    });

    const totalDiscountMinor = data.discountMinor || 0;
    const subtotalAfterDiscount = Math.max(0, subtractMinor(calculatedSubtotal, totalDiscountMinor));
    const vatPercent = data.vatPercent ?? activeBusiness.defaultVatPercent ?? 7.5;
    const vatMinor = calculateVatAmountMinor(subtotalAfterDiscount, vatPercent);
    const totalMinor = addMinor(subtotalAfterDiscount, vatMinor);

    const newQuotation: Quotation = {
      id: quotationId,
      businessId: activeBusiness.id,
      quotationNumber,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      issueDate: data.issueDate,
      validityDate: data.validityDate,
      items: computedItems,
      subtotalMinor: calculatedSubtotal,
      discountMinor: totalDiscountMinor,
      taxVatMinor: vatMinor,
      totalMinor,
      status: 'sent',
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setQuotations(prev => [newQuotation, ...prev]);

    if (!user?.isDemoUser) {
      try {
        await setDoc(doc(db, 'quotations', quotationId), newQuotation);
      } catch (err) {
        console.warn('Quotation write error:', err);
      }
    }

    await logAuditAction('quotation', quotationId, 'create', `Created quotation ${quotationNumber} for ${customer.name}`);
    success('Quotation Created', `${quotationNumber} sent to client.`);
    return newQuotation;
  };

  const updateQuotationStatus = async (id: string, status: Quotation['status']) => {
    setQuotations(prev => prev.map(q => q.id === id ? { ...q, status, updatedAt: new Date().toISOString() } : q));
    if (!user?.isDemoUser) {
      try {
        await updateDoc(doc(db, 'quotations', id), { status, updatedAt: new Date().toISOString() });
      } catch (err) {
        console.warn('Quotation status update error:', err);
      }
    }
    await logAuditAction('quotation', id, 'status_change', `Updated quotation status to ${status}`);
  };

  const convertQuotationToInvoice = async (quotationId: string): Promise<Invoice> => {
    const quotation = quotations.find(q => q.id === quotationId);
    if (!quotation) throw new Error('Quotation not found');

    if (quotation.status === 'converted' || quotation.convertedInvoiceId) {
      throw new Error('This quotation has already been converted to an invoice. Duplicate conversion is prevented.');
    }

    if (!activeBusiness) throw new Error('No active business');

    // Create the invoice based on quotation
    const invSeq = invoices.length + 1;
    const invoiceNumber = `${activeBusiness.invoicePrefix || 'INV'}-${new Date().getFullYear()}-${invSeq.toString().padStart(4, '0')}`;
    const invoiceId = `inv_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`;

    const newInvoice: Invoice = {
      id: invoiceId,
      businessId: activeBusiness.id,
      invoiceNumber,
      customerId: quotation.customerId,
      customerName: quotation.customerName,
      customerEmail: quotation.customerEmail,
      customerPhone: quotation.customerPhone,
      customerAddress: quotation.customerAddress,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      paymentTerms: 'Due on Receipt',
      items: quotation.items,
      subtotalMinor: quotation.subtotalMinor,
      discountMinor: quotation.discountMinor,
      taxVatMinor: quotation.taxVatMinor,
      taxWhtMinor: 0,
      totalMinor: quotation.totalMinor,
      amountPaidMinor: 0,
      balanceDueMinor: quotation.totalMinor,
      status: 'sent',
      notes: `Converted from Quotation ${quotation.quotationNumber}. ${quotation.notes || ''}`.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update quotation status and lock it
    const updatedQuotation: Quotation = {
      ...quotation,
      status: 'converted',
      convertedInvoiceId: invoiceId,
      convertedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setInvoices(prev => [newInvoice, ...prev]);
    setQuotations(prev => prev.map(q => q.id === quotationId ? updatedQuotation : q));

    // Update customer balances
    setCustomers(prev => prev.map(c => {
      if (c.id === quotation.customerId) {
        return {
          ...c,
          totalInvoicedMinor: addMinor(c.totalInvoicedMinor, newInvoice.totalMinor),
          outstandingBalanceMinor: addMinor(c.outstandingBalanceMinor, newInvoice.totalMinor),
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    }));

    if (!user?.isDemoUser) {
      try {
        await setDoc(doc(db, 'invoices', invoiceId), newInvoice);
        await updateDoc(doc(db, 'quotations', quotationId), {
          status: 'converted',
          convertedInvoiceId: invoiceId,
          convertedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        const cust = customers.find(c => c.id === quotation.customerId);
        if (cust) {
          await updateDoc(doc(db, 'customers', cust.id), {
            totalInvoicedMinor: addMinor(cust.totalInvoicedMinor, newInvoice.totalMinor),
            outstandingBalanceMinor: addMinor(cust.outstandingBalanceMinor, newInvoice.totalMinor),
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('Conversion sync error:', err);
      }
    }

    await logAuditAction('quotation', quotationId, 'convert', `Converted quotation ${quotation.quotationNumber} into invoice ${invoiceNumber}`);
    success('Quotation Converted', `Generated invoice ${invoiceNumber} from quotation.`);
    return newInvoice;
  };

  const deleteQuotation = async (id: string) => {
    setQuotations(prev => prev.filter(q => q.id !== id));
    if (!user?.isDemoUser) {
      try {
        await deleteDoc(doc(db, 'quotations', id));
      } catch (err) {
        console.warn('Quotation delete error:', err);
      }
    }
    await logAuditAction('quotation', id, 'delete', `Deleted quotation`);
    info('Quotation Deleted', 'Quotation record removed.');
  };

  // Payments & Receipts (with integer kobo and over-allocation protection)
  const recordPayment = async (data: {
    customerId: string;
    invoiceId: string;
    amountMinor: number;
    paymentDate: string;
    paymentMethod: Payment['paymentMethod'];
    reference: string;
    notes?: string;
    generateReceiptImmediately?: boolean;
  }): Promise<{ payment: Payment; receipt?: Receipt }> => {
    if (!activeBusiness) throw new Error('No active business');

    const customer = customers.find(c => c.id === data.customerId);
    if (!customer) throw new Error('Customer record not found');

    const invoice = invoices.find(i => i.id === data.invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    // Financial constraint: prevent over-allocation!
    if (data.amountMinor > invoice.balanceDueMinor) {
      throw new Error(
        `Over-allocation rejected: Payment amount (₦${(data.amountMinor / 100).toLocaleString()}) exceeds invoice balance due (₦${(invoice.balanceDueMinor / 100).toLocaleString()}).`
      );
    }

    if (data.amountMinor <= 0) {
      throw new Error('Payment amount must be greater than zero kobo.');
    }

    const paySeq = payments.length + 1;
    const paymentNumber = `PAY-${new Date().getFullYear()}-${paySeq.toString().padStart(4, '0')}`;
    const paymentId = `pay_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`;

    const newPayment: Payment = {
      id: paymentId,
      businessId: activeBusiness.id,
      paymentNumber,
      customerId: customer.id,
      customerName: customer.name,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amountMinor: data.amountMinor,
      paymentDate: data.paymentDate,
      paymentMethod: data.paymentMethod,
      reference: data.reference,
      notes: data.notes || '',
      receiptIssued: true,
      allocations: [
        {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amountMinor: data.amountMinor,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    // Update invoice balance
    const newAmountPaid = addMinor(invoice.amountPaidMinor, data.amountMinor);
    const newBalanceDue = Math.max(0, subtractMinor(invoice.totalMinor, newAmountPaid));
    const newStatus: Invoice['status'] = newBalanceDue === 0 ? 'paid' : 'partially_paid';

    const updatedInvoice: Invoice = {
      ...invoice,
      amountPaidMinor: newAmountPaid,
      balanceDueMinor: newBalanceDue,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    // Update customer balances
    const updatedCustomer: Customer = {
      ...customer,
      totalPaidMinor: addMinor(customer.totalPaidMinor, data.amountMinor),
      outstandingBalanceMinor: Math.max(0, subtractMinor(customer.outstandingBalanceMinor, data.amountMinor)),
      updatedAt: new Date().toISOString(),
    };

    // Generate Receipt from verified payment
    const recSeq = receipts.length + 1;
    const receiptNumber = `${activeBusiness.receiptPrefix || 'REC'}-${new Date().getFullYear()}-${recSeq.toString().padStart(4, '0')}`;
    const receiptId = `rec_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`;

    const newReceipt: Receipt = {
      id: receiptId,
      businessId: activeBusiness.id,
      receiptNumber,
      paymentId: newPayment.id,
      paymentReference: data.reference,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: customer.id,
      customerName: customer.name,
      amountMinor: data.amountMinor,
      paymentMethod: data.paymentMethod,
      paymentDate: data.paymentDate,
      issuedAt: new Date().toISOString(),
      notes: data.notes || `Payment received for ${invoice.invoiceNumber}`,
    };

    newPayment.receiptId = receiptId;

    // State mutations
    setPayments(prev => [newPayment, ...prev]);
    setReceipts(prev => [newReceipt, ...prev]);
    setInvoices(prev => prev.map(i => i.id === invoice.id ? updatedInvoice : i));
    setCustomers(prev => prev.map(c => c.id === customer.id ? updatedCustomer : c));

    if (!user?.isDemoUser) {
      try {
        await setDoc(doc(db, 'payments', paymentId), newPayment);
        await setDoc(doc(db, 'receipts', receiptId), newReceipt);
        await updateDoc(doc(db, 'invoices', invoice.id), {
          amountPaidMinor: newAmountPaid,
          balanceDueMinor: newBalanceDue,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        });
        await updateDoc(doc(db, 'customers', customer.id), {
          totalPaidMinor: updatedCustomer.totalPaidMinor,
          outstandingBalanceMinor: updatedCustomer.outstandingBalanceMinor,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Payment write error:', err);
      }
    }

    await logAuditAction('payment', paymentId, 'create', `Recorded payment of ₦${(data.amountMinor / 100).toLocaleString()} for ${invoice.invoiceNumber}`);
    await logAuditAction('receipt', receiptId, 'create', `Generated official receipt ${receiptNumber}`);
    success('Payment Recorded', `₦${(data.amountMinor / 100).toLocaleString()} applied to ${invoice.invoiceNumber}. Receipt ${receiptNumber} generated.`);

    return { payment: newPayment, receipt: newReceipt };
  };

  // Expenses CRUD
  const createExpense = async (data: Omit<Expense, 'id' | 'businessId' | 'expenseNumber' | 'createdBy' | 'createdAt' | 'updatedAt'>): Promise<Expense> => {
    if (!activeBusiness) throw new Error('No active business');

    const expSeq = expenses.length + 1;
    const expenseNumber = `${activeBusiness.expensePrefix || 'EXP'}-${new Date().getFullYear()}-${expSeq.toString().padStart(4, '0')}`;
    const expenseId = `exp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`;

    const newExpense: Expense = {
      ...data,
      id: expenseId,
      businessId: activeBusiness.id,
      expenseNumber,
      createdBy: user?.displayName || user?.email || 'User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setExpenses(prev => [newExpense, ...prev]);

    if (!user?.isDemoUser) {
      try {
        await setDoc(doc(db, 'expenses', expenseId), newExpense);
      } catch (err) {
        console.warn('Expense write error:', err);
      }
    }

    await logAuditAction('expense', expenseId, 'create', `Logged expense ${expenseNumber}: ${data.categoryName} - ₦${(data.amountMinor / 100).toLocaleString()}`);
    success('Expense Logged', `${data.categoryName} expense of ₦${(data.amountMinor / 100).toLocaleString()} recorded.`);
    return newExpense;
  };

  const updateExpense = async (id: string, data: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e));
    if (!user?.isDemoUser) {
      try {
        await updateDoc(doc(db, 'expenses', id), { ...data, updatedAt: new Date().toISOString() });
      } catch (err) {
        console.warn('Expense update error:', err);
      }
    }
    await logAuditAction('expense', id, 'update', `Updated expense record`);
    success('Expense Updated', 'Record saved.');
  };

  const deleteExpense = async (id: string) => {
    const exp = expenses.find(e => e.id === id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    if (!user?.isDemoUser) {
      try {
        await deleteDoc(doc(db, 'expenses', id));
      } catch (err) {
        console.warn('Expense delete error:', err);
      }
    }
    await logAuditAction('expense', id, 'delete', `Deleted expense ${exp?.expenseNumber}`);
    info('Expense Deleted', 'Expense record removed.');
  };

  // Team Members
  const inviteMember = async (email: string, name: string, role: BusinessMember['role']) => {
    if (!activeBusiness) return;

    // Check if on free plan
    const sub = activeBusiness.subscription;
    if (!sub || (sub.planId === 'free' && sub.status !== 'trialing')) {
      openUpgradeModal('Team member collaboration (Accountants, Admins, Viewers) requires the Professional or Enterprise tier. Start your 14-day free trial now.');
      throw new Error('Team collaboration requires a Professional or Enterprise subscription.');
    }

    const memberId = `${activeBusiness.id}_usr_${Math.random().toString(36).substring(2, 7)}`;
    const newMember: BusinessMember = {
      id: memberId,
      businessId: activeBusiness.id,
      userId: `invited_${Date.now()}`,
      userEmail: email,
      userName: name,
      role,
      status: 'invited',
      createdAt: new Date().toISOString(),
    };

    setMembers(prev => [...prev, newMember]);
    if (!user?.isDemoUser) {
      try {
        await setDoc(doc(db, 'business_members', memberId), newMember);
      } catch (err) {
        console.warn('Member write error:', err);
      }
    }
    await logAuditAction('business', memberId, 'create', `Invited ${name} (${email}) as ${role}`);
    success('Invitation Sent', `${name} invited as ${role}.`);
  };

  const removeMember = async (memberId: string) => {
    setMembers(prev => prev.filter(m => m.id !== memberId));
    if (!user?.isDemoUser) {
      try {
        await deleteDoc(doc(db, 'business_members', memberId));
      } catch (err) {
        console.warn('Member remove error:', err);
      }
    }
    await logAuditAction('business', memberId, 'delete', `Revoked member access`);
    info('Member Removed', 'Access credentials revoked.');
  };

  // Seed rich Nigerian business demo data
  const seedNigerianBusinessData = async () => {
    if (!activeBusiness) return;

    // 1. Nigerian Customers
    const sampleCustomers: Customer[] = [
      {
        id: `cust_dangote_${Date.now()}`,
        businessId: activeBusiness.id,
        name: 'Alhaji Aliko Ibrahim',
        businessName: 'Ibrahim Logistics & Haulage Ltd',
        phone: '+234 803 219 4481',
        email: 'aliko@ibrahimlogistics.ng',
        address: '18 Wharf Road, Apapa Port Complex',
        state: 'Lagos',
        outstandingBalanceMinor: 45000000, // ₦450,000.00
        totalInvoicedMinor: 125000000, // ₦1,250,000.00
        totalPaidMinor: 80000000, // ₦800,000.00
        notes: 'Priority industrial transport client, NET 30',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `cust_eko_${Date.now()}`,
        businessId: activeBusiness.id,
        name: 'Dr. Chidinma Okafor',
        businessName: 'Eko Health & Diagnostic Centers',
        phone: '+234 802 884 1920',
        email: 'procurement@ekohealth.ng',
        address: '84 Admiralty Way, Lekki Phase 1',
        state: 'Lagos',
        outstandingBalanceMinor: 0,
        totalInvoicedMinor: 210000000, // ₦2,100,000.00
        totalPaidMinor: 210000000,
        notes: 'Prompt payer via GTBank NIP transfer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `cust_kano_${Date.now()}`,
        businessId: activeBusiness.id,
        name: 'Malam Faruk Bello',
        businessName: 'Bello Grain Silos & Mills',
        phone: '+234 806 339 1045',
        email: 'faruk@bellomills.com',
        address: 'Kano-Zaria Expressway, Dawanau Market',
        state: 'Kano',
        outstandingBalanceMinor: 180000000, // ₦1,800,000.00
        totalInvoicedMinor: 350000000,
        totalPaidMinor: 170000000,
        notes: 'Agro grain bulk purchase agreements',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // 2. Nigerian Products & Services
    const sampleProducts: ProductService[] = [
      {
        id: `prod_sorghum_${Date.now()}`,
        businessId: activeBusiness.id,
        name: 'Grade A Sorghum Grain (100kg Bag)',
        description: 'Cleaned, sorted moisture-resistant industrial grade grain',
        priceMinor: 4800000, // ₦48,000.00 per bag
        currency: 'NGN',
        type: 'product',
        unit: 'bags',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `prod_transport_${Date.now()}`,
        businessId: activeBusiness.id,
        name: 'Interstate Freight Haulage (30-Tonne Truck)',
        description: 'Transit haulage Lagos to Kano with armed security escort & GPS tracking',
        priceMinor: 145000000, // ₦1,450,000.00
        currency: 'NGN',
        type: 'service',
        unit: 'trips',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `prod_consult_${Date.now()}`,
        businessId: activeBusiness.id,
        name: 'Export Compliance & NAFDAC Advisory',
        description: 'Regulatory audit, export documentation & phyto-sanitary inspection',
        priceMinor: 35000000, // ₦350,000.00
        currency: 'NGN',
        type: 'service',
        unit: 'consultations',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // 3. Nigerian Invoices
    const sampleInvoices: Invoice[] = [
      {
        id: `inv_001_${Date.now()}`,
        businessId: activeBusiness.id,
        invoiceNumber: `${activeBusiness.invoicePrefix || 'INV'}-2026-0001`,
        customerId: sampleCustomers[0].id,
        customerName: sampleCustomers[0].name,
        customerEmail: sampleCustomers[0].email,
        customerPhone: sampleCustomers[0].phone,
        customerAddress: sampleCustomers[0].address,
        issueDate: '2026-10-15',
        dueDate: '2026-11-14',
        paymentTerms: 'Net 30',
        items: [
          {
            id: 'it_1',
            description: 'Interstate Freight Haulage (30-Tonne Truck)',
            quantity: 1,
            unitPriceMinor: 145000000,
            discountPercent: 0,
            taxPercent: 7.5,
            lineTotalMinor: 145000000,
          },
        ],
        subtotalMinor: 145000000,
        discountMinor: 0,
        taxVatMinor: 10875000, // 7.5% VAT = ₦108,750.00
        taxWhtMinor: 7250000, // 5% WHT = ₦72,500.00
        totalMinor: 155875000, // ₦1,558,750.00
        amountPaidMinor: 110875000, // ₦1,108,750.00
        balanceDueMinor: 45000000, // ₦450,000.00
        status: 'partially_paid',
        notes: 'Payment via GTBank NIBSS Instant Transfer.',
        createdAt: '2026-10-15T09:00:00Z',
        updatedAt: new Date().toISOString(),
      },
      {
        id: `inv_002_${Date.now()}`,
        businessId: activeBusiness.id,
        invoiceNumber: `${activeBusiness.invoicePrefix || 'INV'}-2026-0002`,
        customerId: sampleCustomers[1].id,
        customerName: sampleCustomers[1].name,
        customerEmail: sampleCustomers[1].email,
        customerPhone: sampleCustomers[1].phone,
        customerAddress: sampleCustomers[1].address,
        issueDate: '2026-10-01',
        dueDate: '2026-10-15',
        paymentTerms: 'Due on Receipt',
        items: [
          {
            id: 'it_2',
            description: 'Export Compliance & NAFDAC Advisory',
            quantity: 6,
            unitPriceMinor: 35000000,
            discountPercent: 5,
            taxPercent: 7.5,
            lineTotalMinor: 199500000,
          },
        ],
        subtotalMinor: 210000000,
        discountMinor: 10500000,
        taxVatMinor: 14962500,
        taxWhtMinor: 0,
        totalMinor: 214462500,
        amountPaidMinor: 214462500,
        balanceDueMinor: 0,
        status: 'paid',
        notes: 'Full payment received. Thank you.',
        createdAt: '2026-10-01T11:00:00Z',
        updatedAt: new Date().toISOString(),
      },
    ];

    // 4. Nigerian Expenses (Generator diesel, rent, logistics, salaries)
    const sampleExpenses: Expense[] = [
      {
        id: `exp_diesel_${Date.now()}`,
        businessId: activeBusiness.id,
        expenseNumber: `${activeBusiness.expensePrefix || 'EXP'}-2026-0001`,
        category: 'utilities_diesel',
        categoryName: 'Diesel & Generator Fuel',
        amountMinor: 38500000, // ₦385,000.00 (350 Litres @ ₦1,100/L)
        expenseDate: '2026-10-20',
        description: '350 Litres Automotive Gas Oil (AGO) for 100KVA Cat Generator',
        vendor: 'TotalEnergies Victoria Island',
        paymentMethod: 'pos',
        reference: 'POS-NIP-9921448',
        receiptNote: 'Pump delivery meter verified by facility engineer',
        createdBy: user?.displayName || 'Finance Officer',
        createdAt: '2026-10-20T14:30:00Z',
        updatedAt: new Date().toISOString(),
      },
      {
        id: `exp_salary_${Date.now()}`,
        businessId: activeBusiness.id,
        expenseNumber: `${activeBusiness.expensePrefix || 'EXP'}-2026-0002`,
        category: 'salaries_wages',
        categoryName: 'Staff Salaries & Allowances',
        amountMinor: 125000000, // ₦1,250,000.00
        expenseDate: '2026-10-25',
        description: 'Monthly payroll dispatch for logistics drivers and store operators',
        vendor: 'Staff Payroll Batch #10',
        paymentMethod: 'bank_transfer',
        reference: 'NIP-PAYROLL-2026-10',
        receiptNote: 'Approved by Managing Director',
        createdBy: user?.displayName || 'Finance Officer',
        createdAt: '2026-10-25T10:00:00Z',
        updatedAt: new Date().toISOString(),
      },
      {
        id: `exp_office_${Date.now()}`,
        businessId: activeBusiness.id,
        expenseNumber: `${activeBusiness.expensePrefix || 'EXP'}-2026-0003`,
        category: 'rent_office',
        categoryName: 'Office & Warehouse Rent',
        amountMinor: 65000000, // ₦650,000.00
        expenseDate: '2026-10-05',
        description: 'Apapa warehouse depot monthly leasing installment',
        vendor: 'Apapa Properties Consortia Ltd',
        paymentMethod: 'bank_transfer',
        reference: 'GTB-TRF-091823901',
        receiptNote: 'Official tenancy invoice attached',
        createdBy: user?.displayName || 'Finance Officer',
        createdAt: '2026-10-05T08:00:00Z',
        updatedAt: new Date().toISOString(),
      },
    ];

    // 5. Nigerian Quotations
    const sampleQuotations: Quotation[] = [
      {
        id: `qt_001_${Date.now()}`,
        businessId: activeBusiness.id,
        quotationNumber: `${activeBusiness.quotationPrefix || 'QT'}-2026-0001`,
        customerId: sampleCustomers[2].id,
        customerName: sampleCustomers[2].name,
        customerEmail: sampleCustomers[2].email,
        customerPhone: sampleCustomers[2].phone,
        customerAddress: sampleCustomers[2].address,
        issueDate: '2026-10-22',
        validityDate: '2026-11-22',
        items: [
          {
            id: 'qi_1',
            description: 'Grade A Sorghum Grain (100kg Bag)',
            quantity: 50,
            unitPriceMinor: 4800000,
            discountPercent: 2,
            taxPercent: 7.5,
            lineTotalMinor: 235200000,
          },
        ],
        subtotalMinor: 240000000,
        discountMinor: 4800000,
        taxVatMinor: 17640000,
        totalMinor: 252840000, // ₦2,528,400.00
        status: 'sent',
        notes: 'Prices valid for 30 calendar days subject to Nigerian commodity board index.',
        createdAt: '2026-10-22T10:00:00Z',
        updatedAt: new Date().toISOString(),
      },
    ];

    // 6. Payments and Receipts
    const samplePayments: Payment[] = [
      {
        id: `pay_001_${Date.now()}`,
        businessId: activeBusiness.id,
        paymentNumber: 'PAY-2026-0001',
        customerId: sampleCustomers[0].id,
        customerName: sampleCustomers[0].name,
        invoiceId: sampleInvoices[0].id,
        invoiceNumber: sampleInvoices[0].invoiceNumber,
        amountMinor: 110875000, // ₦1,108,750.00
        paymentDate: '2026-10-20',
        paymentMethod: 'bank_transfer',
        reference: 'NIP/GTB/992019482/IBRAHIM',
        notes: 'Initial installment for Lagos-Kano haulage',
        receiptIssued: true,
        receiptId: `rec_001_${Date.now()}`,
        allocations: [
          {
            invoiceId: sampleInvoices[0].id,
            invoiceNumber: sampleInvoices[0].invoiceNumber,
            amountMinor: 110875000,
          },
        ],
        createdAt: '2026-10-20T15:00:00Z',
      },
    ];

    const sampleReceipts: Receipt[] = [
      {
        id: samplePayments[0].receiptId!,
        businessId: activeBusiness.id,
        receiptNumber: `${activeBusiness.receiptPrefix || 'REC'}-2026-0001`,
        paymentId: samplePayments[0].id,
        paymentReference: samplePayments[0].reference,
        invoiceId: sampleInvoices[0].id,
        invoiceNumber: sampleInvoices[0].invoiceNumber,
        customerId: sampleCustomers[0].id,
        customerName: sampleCustomers[0].name,
        amountMinor: 110875000,
        paymentMethod: 'bank_transfer',
        paymentDate: '2026-10-20',
        issuedAt: '2026-10-20T15:05:00Z',
        notes: 'Official electronic receipt issued by BizLedger',
      },
    ];

    setCustomers(sampleCustomers);
    setProducts(sampleProducts);
    setInvoices(sampleInvoices);
    setExpenses(sampleExpenses);
    setQuotations(sampleQuotations);
    setPayments(samplePayments);
    setReceipts(sampleReceipts);

    await logAuditAction('business', activeBusiness.id, 'create', 'Seeded Nigerian business demo catalog, customers, invoices, and expenses.');
    success('Demo Records Initialized', 'Loaded Nigerian customers, invoices, diesel & payroll expenses, and products.');
  };

  const currentMemberRole = isSuperAdmin ? 'owner' : 'owner'; // Super admin is always account owner

  return (
    <BusinessContext.Provider
      value={{
        activeBusiness,
        allBusinesses,
        allSubscribers,
        isSuperAdmin,
        currentMemberRole,
        members,
        customers,
        products,
        invoices,
        quotations,
        payments,
        receipts,
        expenses,
        auditLogs,
        loading,
        switchBusiness,
        createBusiness,
        updateBusiness,
        createCustomer,
        updateCustomer,
        deleteCustomer,
        createProduct,
        updateProduct,
        deleteProduct,
        createInvoice,
        updateInvoiceStatus,
        deleteInvoice,
        createQuotation,
        updateQuotationStatus,
        convertQuotationToInvoice,
        deleteQuotation,
        recordPayment,
        createExpense,
        updateExpense,
        deleteExpense,
        inviteMember,
        removeMember,
        startProTrialSubscription,
        updateSubscription,
        cancelSubscription,
        resumeSubscription,
        updateSubscriberSubscription,
        extendSubscriberTrial,
        cancelSubscriberSubscription,
        resumeSubscriberSubscription,
        createSubscriberBusiness,
        deleteSubscriberBusiness,
        refreshSubscribers,
        isUpgradeModalOpen,
        upgradeModalReason,
        openUpgradeModal,
        closeUpgradeModal,
        seedNigerianBusinessData,
        logAuditAction,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) throw new Error('useBusiness must be used within BusinessProvider');
  return context;
};
