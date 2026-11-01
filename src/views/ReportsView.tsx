import React, { useState } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { formatNaira, addMinor, subtractMinor } from '../lib/money';
import { exportFinancialReportCsv } from '../lib/csvExport';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/Select';
import { Input } from '../components/common/Input';
import { Download, FileSpreadsheet, Calendar, AlertTriangle } from 'lucide-react';
import { jsPDF } from 'jspdf';

type ReportType =
  | 'pnl'
  | 'sales'
  | 'expenses'
  | 'cash_movement'
  | 'receivables'
  | 'customer_balances';

export const ReportsView: React.FC = () => {
  const { activeBusiness, invoices, payments, expenses, customers } = useBusiness();

  const [reportType, setReportType] = useState<ReportType>('pnl');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Date filtered collections
  const filteredInvoices = invoices.filter(
    inv => inv.issueDate >= startDate && inv.issueDate <= endDate && inv.status !== 'cancelled'
  );
  const filteredPayments = payments.filter(
    p => p.paymentDate >= startDate && p.paymentDate <= endDate
  );
  const filteredExpenses = expenses.filter(
    e => e.expenseDate >= startDate && e.expenseDate <= endDate
  );

  // Sales totals
  const totalSalesInvoiced = filteredInvoices.reduce((acc, i) => addMinor(acc, i.totalMinor), 0);
  const totalVatCollected = filteredInvoices.reduce((acc, i) => addMinor(acc, i.taxVatMinor), 0);
  const totalDiscountsGiven = filteredInvoices.reduce((acc, i) => addMinor(acc, i.discountMinor), 0);

  // Cash totals
  const totalCashInward = filteredPayments.reduce((acc, p) => addMinor(acc, p.amountMinor), 0);
  const totalExpensesOutward = filteredExpenses.reduce((acc, e) => addMinor(acc, e.amountMinor), 0);
  const netCashFlow = subtractMinor(totalCashInward, totalExpensesOutward);

  // P&L accrual operating profit
  const operatingGrossProfit = subtractMinor(totalSalesInvoiced, totalExpensesOutward);

  // Export to CSV
  const handleExportCsv = () => {
    if (!activeBusiness) return;

    if (reportType === 'pnl') {
      exportFinancialReportCsv(
        'Profit_and_Loss_Summary',
        activeBusiness.name,
        `${startDate} to ${endDate}`,
        [
          { label: 'Gross Commercial Sales (Invoiced)', invoicedKobo: totalSalesInvoiced, notes: 'Accrual billings' },
          { label: 'Total Sales Discounts Granted', invoicedKobo: totalDiscountsGiven, notes: 'Contract deductions' },
          { label: 'Value Added Tax (7.5% FIRS VAT)', invoicedKobo: totalVatCollected, notes: 'Collected on taxable supply' },
          { label: 'Total Operating Expenses', cashKobo: totalExpensesOutward, notes: 'Diesel, rent, payroll, logistics' },
          { label: 'Estimated Operating Profit / (Loss)', invoicedKobo: operatingGrossProfit, cashKobo: netCashFlow, notes: 'Accrual vs Cash Basis' },
        ]
      );
    } else if (reportType === 'sales') {
      const rows = filteredInvoices.map(inv => ({
        label: `${inv.invoiceNumber} - ${inv.customerName}`,
        invoicedKobo: inv.totalMinor,
        cashKobo: inv.amountPaidMinor,
        notes: `Status: ${inv.status} | Balance Due: ${formatNaira(inv.balanceDueMinor)}`,
      }));
      exportFinancialReportCsv('Sales_Billing_Report', activeBusiness.name, `${startDate} to ${endDate}`, rows);
    } else if (reportType === 'expenses') {
      const rows = filteredExpenses.map(exp => ({
        label: `${exp.expenseNumber} - ${exp.categoryName}`,
        cashKobo: exp.amountMinor,
        notes: `Vendor: ${exp.vendor} | Ref: ${exp.reference || 'None'} | ${exp.description}`,
      }));
      exportFinancialReportCsv('Operating_Expense_Report', activeBusiness.name, `${startDate} to ${endDate}`, rows);
    } else if (reportType === 'receivables') {
      const rows = invoices.filter(i => i.balanceDueMinor > 0 && i.status !== 'cancelled').map(inv => ({
        label: `${inv.invoiceNumber} - ${inv.customerName}`,
        invoicedKobo: inv.totalMinor,
        cashKobo: inv.balanceDueMinor,
        notes: `Due Date: ${inv.dueDate} | Phone: ${inv.customerPhone || 'N/A'}`,
      }));
      exportFinancialReportCsv('Outstanding_Receivables_Report', activeBusiness.name, 'As of Today', rows);
    } else if (reportType === 'customer_balances') {
      const rows = customers.map(c => ({
        label: `${c.name} (${c.businessName || 'Individual'})`,
        invoicedKobo: c.totalInvoicedMinor,
        cashKobo: c.totalPaidMinor,
        notes: `Outstanding: ${formatNaira(c.outstandingBalanceMinor)} | ${c.phone}`,
      }));
      exportFinancialReportCsv('Customer_Ledger_Balances', activeBusiness.name, 'All Active Customers', rows);
    } else {
      const rows = [
        { label: 'Total Cash Deposits / Customer Receipts', cashKobo: totalCashInward, notes: 'Verified in NIBSS/POS' },
        { label: 'Total Operating Cash Disbursed', cashKobo: totalExpensesOutward, notes: 'Vendor and payroll payments' },
        { label: 'Net Cash Movement', cashKobo: netCashFlow, notes: 'Net liquidity variance' },
      ];
      exportFinancialReportCsv('Cash_Movement_Summary', activeBusiness.name, `${startDate} to ${endDate}`, rows);
    }
  };

  // Export to PDF
  const handleExportPdf = () => {
    if (!activeBusiness) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text(activeBusiness.name, 14, 20);

    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129);
    doc.text('FINANCIAL REPORT', pageWidth - 14, 20, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Report: ${reportType.toUpperCase().replace('_', ' ')}  |  Period: ${startDate} to ${endDate}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-NG')}`, 14, 34);

    let y = 45;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text('METRIC / LINE ITEM', 18, y + 5.5);
    doc.text('AMOUNT (NGN)', pageWidth - 18, y + 5.5, { align: 'right' });

    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    const reportRows = [
      { label: 'Invoiced Sales (Accrual)', val: totalSalesInvoiced },
      { label: 'Actual Cash Received', val: totalCashInward },
      { label: 'Operating Expenses Disbursed', val: totalExpensesOutward },
      { label: 'Estimated Net Operating Position', val: operatingGrossProfit },
      { label: 'Net Cash Movement', val: netCashFlow },
    ];

    reportRows.forEach(row => {
      doc.text(row.label, 18, y);
      doc.text(formatNaira(row.val, false), pageWidth - 18, y, { align: 'right' });
      y += 8;
    });

    y += 10;
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Notice: This financial statement is generated by BizLedger SaaS for internal managerial decision-making.', 14, y);

    doc.save(`bizledger_report_${reportType}_${startDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Financial Reports & Statements</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-ready statement generation with accrual vs cash basis segregation and CSV/PDF export.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportPdf}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select
          label="Select Report Type"
          value={reportType}
          onChange={e => setReportType(e.target.value as ReportType)}
        >
          <option value="pnl">Profit & Loss Summary (Accrual & Cash)</option>
          <option value="sales">Sales & Commercial Invoices Report</option>
          <option value="expenses">Operating Expenses Breakdown</option>
          <option value="cash_movement">Cash Movement (Inflow vs Outflow)</option>
          <option value="receivables">Outstanding Receivables Ledger</option>
          <option value="customer_balances">Customer Account Balances</option>
        </Select>

        <Input
          label="Start Date"
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
        />

        <Input
          label="End Date"
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
        />
      </div>

      {/* Statutory Accounting Disclaimer Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-900">
        <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Nigerian Tax & Compliance Guidance: </span>
          VAT (7.5%) collected is held in trust for FIRS remittance on the 21st of each succeeding month. Unpaid invoices remain on the balance sheet under Receivables and are not recognized as received cash until bank settlement is verified. This report is for managerial accounting purposes.
        </div>
      </div>

      {/* Render Selected Report View */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              {reportType === 'pnl' && 'Profit & Loss Statement (Operating Summary)'}
              {reportType === 'sales' && 'Commercial Sales & Invoicing Register'}
              {reportType === 'expenses' && 'Operating Expenses Schedule'}
              {reportType === 'cash_movement' && 'Cash Inflow & Outflow Movement'}
              {reportType === 'receivables' && 'Aged Receivables Schedule'}
              {reportType === 'customer_balances' && 'Customer Balance Summary'}
            </h3>
            <p className="text-xs text-slate-500">Period: {startDate} to {endDate}</p>
          </div>
        </div>

        {/* Report Content */}
        {reportType === 'pnl' && (
          <div className="p-6 space-y-4 max-w-3xl">
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] pb-1 border-b">
                1. Revenue & Sales (Accrual Basis)
              </h4>
              <div className="flex justify-between py-1.5 text-slate-700">
                <span>Gross Commercial Sales Invoiced</span>
                <span className="font-mono font-semibold">{formatNaira(totalSalesInvoiced)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-rose-600">
                <span>Sales Discounts Allowed</span>
                <span className="font-mono font-semibold">-{formatNaira(totalDiscountsGiven)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-emerald-600">
                <span>Value Added Tax (7.5% Nigerian VAT Collected)</span>
                <span className="font-mono font-semibold">+{formatNaira(totalVatCollected)}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs pt-3">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] pb-1 border-b">
                2. Operating Expenses & Disbursements
              </h4>
              <div className="flex justify-between py-1.5 text-rose-600">
                <span>Total Operating Expenditure (Diesel, Payroll, Rent, Logistics)</span>
                <span className="font-mono font-semibold">-{formatNaira(totalExpensesOutward)}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs pt-3 border-t-2 border-slate-900">
              <div className="flex justify-between text-sm font-bold text-slate-900 py-1">
                <span>Estimated Net Operating Profit (Accrual Basis):</span>
                <span className={`font-mono text-base ${operatingGrossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatNaira(operatingGrossProfit)}
                </span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 py-1 border-t border-slate-100">
                <span>Actual Net Cash Movement (Cash Received - Expenses):</span>
                <span className={`font-mono ${netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {formatNaira(netCashFlow)}
                </span>
              </div>
            </div>
          </div>
        )}

        {reportType === 'sales' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Invoiced (₦)</th>
                  <th className="p-3 text-right">Paid (₦)</th>
                  <th className="p-3 text-right">Balance Due (₦)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold">{inv.invoiceNumber}</td>
                    <td className="p-3">{inv.customerName}</td>
                    <td className="p-3">{inv.issueDate}</td>
                    <td className="p-3 text-right font-mono font-semibold">{formatNaira(inv.totalMinor)}</td>
                    <td className="p-3 text-right font-mono text-emerald-600">{formatNaira(inv.amountPaidMinor)}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600">{formatNaira(inv.balanceDueMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'expenses' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Expense #</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Vendor</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Amount (₦)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold">{exp.expenseNumber}</td>
                    <td className="p-3 font-medium">{exp.categoryName}</td>
                    <td className="p-3 text-slate-600">{exp.vendor}</td>
                    <td className="p-3 text-slate-500">{exp.expenseDate}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600">-{formatNaira(exp.amountMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'cash_movement' && (
          <div className="p-6 space-y-3 max-w-xl text-xs">
            <div className="flex justify-between py-2 border-b">
              <span>Customer Cash Collections (Deposits)</span>
              <span className="font-mono font-bold text-emerald-600">+{formatNaira(totalCashInward)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Operating Cash Disbursed</span>
              <span className="font-mono font-bold text-rose-600">-{formatNaira(totalExpensesOutward)}</span>
            </div>
            <div className="flex justify-between py-3 border-t-2 font-bold text-sm">
              <span>Net Liquidity Variance:</span>
              <span className={`font-mono ${netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {formatNaira(netCashFlow)}
              </span>
            </div>
          </div>
        )}

        {reportType === 'receivables' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3 text-right">Total (₦)</th>
                  <th className="p-3 text-right">Unpaid Balance (₦)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.filter(i => i.balanceDueMinor > 0 && i.status !== 'cancelled').map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold">{inv.invoiceNumber}</td>
                    <td className="p-3">{inv.customerName}</td>
                    <td className="p-3 text-slate-500">{inv.dueDate}</td>
                    <td className="p-3 text-right font-mono">{formatNaira(inv.totalMinor)}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600">{formatNaira(inv.balanceDueMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'customer_balances' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Company</th>
                  <th className="p-3 text-right">Invoiced (₦)</th>
                  <th className="p-3 text-right">Paid (₦)</th>
                  <th className="p-3 text-right">Outstanding Due (₦)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold">{c.name}</td>
                    <td className="p-3 text-slate-500">{c.businessName || '-'}</td>
                    <td className="p-3 text-right font-mono">{formatNaira(c.totalInvoicedMinor)}</td>
                    <td className="p-3 text-right font-mono text-emerald-600">{formatNaira(c.totalPaidMinor)}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600">{formatNaira(c.outstandingBalanceMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
