import React, { useState } from 'react';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BusinessProvider, useBusiness } from './context/BusinessContext';
import { Sidebar, NavItemKey } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { DashboardView } from './views/DashboardView';
import { InvoicesView } from './views/InvoicesView';
import { QuotationsView } from './views/QuotationsView';
import { ReceiptsView } from './views/ReceiptsView';
import { PaymentsView } from './views/PaymentsView';
import { ExpensesView } from './views/ExpensesView';
import { CustomersView } from './views/CustomersView';
import { ProductsView } from './views/ProductsView';
import { ReportsView } from './views/ReportsView';
import { SubscriptionView } from './views/SubscriptionView';
import { SuperAdminSubscribersView } from './views/SuperAdminSubscribersView';
import { AuditLogsView } from './views/AuditLogsView';
import { SettingsView } from './views/SettingsView';
import { AuthView } from './views/AuthView';

// Components & Modals
import { SubscriptionStatusBanner } from './components/subscription/SubscriptionStatusBanner';
import { UpgradeModal } from './components/subscription/UpgradeModal';
import { InvoiceModal } from './components/invoices/InvoiceModal';
import { QuotationModal } from './components/quotations/QuotationModal';
import { PaymentModal } from './components/payments/PaymentModal';
import { ExpenseModal } from './components/expenses/ExpenseModal';
import { BusinessSettingsModal } from './components/settings/BusinessSettingsModal';
import { AutomatedTestRunnerModal } from './components/tests/AutomatedTestRunnerModal';
import { Loader2 } from 'lucide-react';

function AuthenticatedApp() {
  const { user, loading: authLoading } = useAuth();
  const { 
    loading: bizLoading, 
    isUpgradeModalOpen, 
    closeUpgradeModal, 
    upgradeModalReason 
  } = useBusiness();

  const [currentTab, setCurrentTab] = useState<NavItemKey>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modals state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentPreselectedInvoiceId, setPaymentPreselectedInvoiceId] = useState<string | undefined>(undefined);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isBizSettingsOpen, setIsBizSettingsOpen] = useState(false);
  const [isTestRunnerOpen, setIsTestRunnerOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
        <p className="text-sm font-semibold tracking-wide text-slate-300">Initializing BizLedger Financial Engine...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  const handleOpenPaymentWithInvoice = (invoiceId: string) => {
    setPaymentPreselectedInvoiceId(invoiceId);
    setIsPaymentModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'tests') {
            setIsTestRunnerOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenBusinessModal={() => setIsBizSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-68 flex flex-col min-w-0">
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
          onNewInvoice={() => setIsInvoiceModalOpen(true)}
          onNewPayment={() => {
            setPaymentPreselectedInvoiceId(undefined);
            setIsPaymentModalOpen(true);
          }}
          onNewExpense={() => setIsExpenseModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-5">
          {/* Active Trial or Quota Alert Banner */}
          <SubscriptionStatusBanner />

          {bizLoading ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView
                  onNavigate={setCurrentTab}
                  onNewInvoice={() => setIsInvoiceModalOpen(true)}
                  onNewPayment={() => {
                    setPaymentPreselectedInvoiceId(undefined);
                    setIsPaymentModalOpen(true);
                  }}
                  onNewExpense={() => setIsExpenseModalOpen(true)}
                />
              )}

              {currentTab === 'subscribers' && (
                <SuperAdminSubscribersView
                  onSwitchToDashboard={() => setCurrentTab('dashboard')}
                />
              )}

              {currentTab === 'invoices' && (
                <InvoicesView
                  onNewInvoice={() => setIsInvoiceModalOpen(true)}
                  onRecordPaymentForInvoice={handleOpenPaymentWithInvoice}
                />
              )}

              {currentTab === 'quotations' && (
                <QuotationsView
                  onNewQuotation={() => setIsQuotationModalOpen(true)}
                />
              )}

              {currentTab === 'payments' && (
                <PaymentsView
                  onNewPayment={() => {
                    setPaymentPreselectedInvoiceId(undefined);
                    setIsPaymentModalOpen(true);
                  }}
                />
              )}

              {currentTab === 'receipts' && <ReceiptsView />}

              {currentTab === 'expenses' && (
                <ExpensesView
                  onNewExpense={() => setIsExpenseModalOpen(true)}
                />
              )}

              {currentTab === 'customers' && <CustomersView />}

              {currentTab === 'products' && <ProductsView />}

              {currentTab === 'reports' && <ReportsView />}

              {currentTab === 'subscription' && <SubscriptionView />}

              {currentTab === 'audit_logs' && <AuditLogsView />}

              {currentTab === 'settings' && <SettingsView />}
            </>
          )}
        </main>
      </div>

      {/* Subscription Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={closeUpgradeModal}
        reason={upgradeModalReason}
      />

      {/* Global Modals */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
      />

      <QuotationModal
        isOpen={isQuotationModalOpen}
        onClose={() => setIsQuotationModalOpen(false)}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentPreselectedInvoiceId(undefined);
        }}
        preselectedInvoiceId={paymentPreselectedInvoiceId}
      />

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
      />

      <BusinessSettingsModal
        isOpen={isBizSettingsOpen}
        onClose={() => setIsBizSettingsOpen(false)}
      />

      <AutomatedTestRunnerModal
        isOpen={isTestRunnerOpen}
        onClose={() => setIsTestRunnerOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <BusinessProvider>
          <AuthenticatedApp />
        </BusinessProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}
